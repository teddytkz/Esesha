import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, RefreshCw, Server, ServerOff, X, CheckCircle2, FolderOpen, MoreVertical, Edit, Trash2, Upload, Download, LogOut, Info, MonitorDown, ChevronRight, Wrench } from 'lucide-react';
import { ListConnections, CreateConnection, SelectPrivateKeyFile, UpdateConnection, DeleteConnection, ImportConnectionFromBackup, BackupConnections, CreateDesktopShortcut, GetAboutInfo, PingConnection } from '@wailsjs/go/main/App';
import { models } from '@wailsjs/go/models';
import { Quit, EventsOn } from '@wailsjs/runtime/runtime';
import Terminal from './Terminal';
import FileExplorer from './FileExplorer';
import PassphraseDialog from './PassphraseDialog';
import PPKConverterDialog from './PPKConverterDialog';
import styles from './App.module.css';

interface NewConnection {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  privateKeyPath: string;  // Keep for backward compatibility (legacy connections)
  encryptedPrivateKey?: number[];  // New: DPAPI-encrypted PEM content (Go []byte as number[])
  privateKeyFileName?: string;  // Display-only: filename of selected key (not full path)
}

interface SessionInfo {
  sessionId: string;
  connection: models.Connection;
  activeTab: 'terminal' | 'files';
  passphrase?: string; // Store passphrase temporarily for connection
}

const App: React.FC = () => {
  const [connections, setConnections] = useState<models.Connection[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number>(-1);
  const [statusText, setStatusText] = useState('Ready');
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [pingConnId, setPingConnId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [authMethod, setAuthMethod] = useState<'password' | 'key'>('password');
  const [newConn, setNewConn] = useState<NewConnection>({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKeyPath: '',
    encryptedPrivateKey: undefined,
    privateKeyFileName: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [passphrasePrompt, setPassphrasePrompt] = useState<{
    connection: models.Connection;
  } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingConnection, setEditingConnection] = useState<models.Connection | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<NewConnection>({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKeyPath: '',
    encryptedPrivateKey: undefined,
    privateKeyFileName: ''
  });
  const [editFormError, setEditFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<models.Connection | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importing, setImporting] = useState(false);
  const importingRef = useRef(false);
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openMenu, setOpenMenu] = useState<'' | 'file' | 'tools' | 'help'>('');
  const [openSubmenu, setOpenSubmenu] = useState<'' | 'connection'>('');
  const [aboutInfo, setAboutInfo] = useState<Record<string, string> | null>(null);
  const [showPPKConverter, setShowPPKConverter] = useState(false);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const openMenuRef = useRef<'' | 'file' | 'tools' | 'help'>('');

  const terminalRefs = useRef<Map<string, { disconnect: () => void; clear: () => void }>>(new Map());
  const openMenuIdRef = useRef<number | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    const off = EventsOn('menu:ppk-converter', () => setShowPPKConverter(true));
    return () => off();
  }, []);

  // Auto-refresh latency every second while connecting/connected
  useEffect(() => {
    if (pingConnId === null) return;
    const ping = () => {
      PingConnection(pingConnId)
        .then(ms => setPingMs(ms))
        .catch(() => {});
    };
    ping();
    const t = setInterval(ping, 5000);
    return () => clearInterval(t);
  }, [pingConnId]);

  useEffect(() => {
    openMenuRef.current = openMenu;
  }, [openMenu]);

  useEffect(() => {
    openMenuIdRef.current = openMenuId;
  }, [openMenuId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (openMenuRef.current && menuBarRef.current && !menuBarRef.current.contains(target)) {
        setOpenMenu('');
      }
      if (openMenuIdRef.current === null) return;
      if (!target.closest(`.${styles.kebabDropdown}`) && !target.closest(`.${styles.kebabButton}`)) {
        setOpenMenuId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const result = await ListConnections();
      setConnections(result || []);
      setStatusText(`${result?.length || 0} connection(s) available`);
    } catch (err) {
      setStatusText(`Error loading: ${err}`);
    }
    setLoading(false);
  };

  const selectConnection = (conn: models.Connection) => {
    // Check if connection is already open in a session
    const existingSessionIndex = sessions.findIndex(
      session => session.connection.id === conn.id
    );
    
    if (existingSessionIndex !== -1) {
      // Connection already open, just switch to that tab
      setActiveSessionIndex(existingSessionIndex);
      setStatusText(`Switched to ${conn.name}`);
      return;
    }
    
    // Check if connection uses a private key (legacy file path or embedded encrypted key)
    const hasKey = !!conn.privateKeyPath || (conn.encrypted_private_key && conn.encrypted_private_key.length > 0);
    if (hasKey) {
      setPassphrasePrompt({ connection: conn });
    } else {
      connectToServer(conn, '');
    }
  };

  const connectToServer = (conn: models.Connection, passphrase: string) => {
    // Create pending session with passphrase
    const pendingSession: SessionInfo = {
      sessionId: '', // Will be set when connected
      connection: conn,
      activeTab: 'terminal',
      passphrase: passphrase || undefined
    };
    
    setSessions(prev => [...prev, pendingSession]);
    setActiveSessionIndex(sessions.length);
    setStatusText(`Connecting to ${conn.name}`);
    setPingConnId(conn.id);
  };

  const handleEditConnection = (conn: models.Connection) => {
    setEditingConnection(conn);
    setEditFormData({
      name: conn.name,
      host: conn.host,
      port: conn.port,
      username: conn.username,
      password: '',
      privateKeyPath: conn.privateKeyPath || '',
      encryptedPrivateKey: conn.encrypted_private_key && conn.encrypted_private_key.length > 0 ? conn.encrypted_private_key : undefined,
      privateKeyFileName: conn.encrypted_private_key && conn.encrypted_private_key.length > 0 ? '🔒 Private key stored securely' : (conn.privateKeyPath ? conn.privateKeyPath.split(/[\\/]/).pop() : '')
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingConnection(null);
    setEditFormData({
      name: '',
      host: '',
      port: 22,
      username: '',
      password: '',
      privateKeyPath: '',
      encryptedPrivateKey: undefined,
      privateKeyFileName: ''
    });
    setEditFormError('');
  };

  const handleSaveEdit = async () => {
    if (!editingConnection) return;
    
    setEditFormError('');
    setLoading(true);
    
    try {
      await UpdateConnection(
        editingConnection.id,
        editFormData.name,
        editFormData.host,
        editFormData.port,
        editFormData.username,
        editFormData.password,
        editFormData.privateKeyPath,
        editFormData.encryptedPrivateKey || []
      );
      
      const result = await ListConnections();
      setConnections(result || []);
      setStatusText(`Updated ${editFormData.name}`);
      closeEditModal();
    } catch (err) {
      setEditFormError(`Failed to update: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const selectEditPrivateKeyFile = async () => {
    try {
      const result = await SelectPrivateKeyFile();
      if (result && result.path) {
        // Store encrypted content, not the path
        setEditFormData({
          ...editFormData,
          encryptedPrivateKey: result.encryptedContent,
          privateKeyFileName: result.path.split(/[\\/]/).pop() || ''
        });
      }
    } catch (err) {
      setStatusText(`Error selecting file: ${err}`);
    }
  };

  const handleDeleteConnection = async (conn: models.Connection) => {
    setDeleteConfirm(conn);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    setLoading(true);
    try {
      await DeleteConnection(deleteConfirm.id);
      
      const result = await ListConnections();
      setConnections(result || []);
      setStatusText(`Deleted ${deleteConfirm.name}`);
      setDeleteConfirm(null);
      setOpenMenuId(null);
    } catch (err) {
      setStatusText(`Failed to delete: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const toggleMenu = (menu: '' | 'file' | 'tools' | 'help') => {
    setOpenSubmenu('');
    setOpenMenu(prev => (prev === menu ? '' : menu));
  };

  const handleBackup = async () => {
    setOpenMenu('');
    setStatusText('Backing up connections...');
    try {
      const path = await BackupConnections();
      setBackupPath(path);
      setStatusText('Connections backed up');
    } catch (err) {
      setStatusText(`Backup failed: ${err}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        setImportError('Please select a JSON file');
        setImportFile(null);
        return;
      }
      setImportFile(file);
      setImportError('');
    }
  };

  const handleCreateShortcut = async () => {
    setOpenMenu('');
    try {
      await CreateDesktopShortcut();
      setStatusText('Desktop shortcut created');
    } catch (err) {
      setStatusText(`Shortcut failed: ${err}`);
    }
  };

  const handleQuit = () => {
    setOpenMenu('');
    Quit();
  };

  const handleAbout = async () => {
    setOpenMenu('');
    try {
      setAboutInfo(await GetAboutInfo());
    } catch (err) {
      setStatusText(`Error loading about info: ${err}`);
    }
  };

  const handleMenuRestore = () => {
    setOpenMenu('');
    setShowImportModal(true);
    setImportFile(null);
    setImportError('');
    setImportSuccess('');
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportError('');
    setImportSuccess('');
    importingRef.current = false;
    setImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        setImportError('Please select a JSON file');
        setImportFile(null);
        return;
      }
      setImportFile(file);
      setImportError('');
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportError('Please select a file');
      return;
    }
    if (importingRef.current) return;

    importingRef.current = true;
    setImporting(true);
    setImportError('');
    setImportSuccess('');

    let success = false;

    try {
      const text = await importFile.text();
      const data = JSON.parse(text);

      let connections: any[] = [];
      
      if (Array.isArray(data)) {
        connections = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.connections)) {
          connections = data.connections;
        } else if (Array.isArray(data.data)) {
          connections = data.data;
        } else {
          const arrayProps = Object.values(data).filter(v => Array.isArray(v));
          if (arrayProps.length > 0) {
            connections = arrayProps[0] as any[];
          } else {
            setImportError('Invalid file format: no connections array found');
            return;
          }
        }
      } else {
        setImportError('Invalid file format: expected JSON array or object');
        return;
      }

      if (connections.length === 0) {
        setImportError('No connections found in file');
        return;
      }

      let imported = 0;
      let failed = 0;

      for (const conn of connections) {
        try {
          if (!conn.name || !conn.host || !conn.username) {
            console.warn('Skipping connection with missing required fields:', conn);
            failed++;
            continue;
          }

          const port = conn.port || 22;
          const privateKeyPath = conn.privateKeyPath || '';

          // Convert a base64 string or byte array to a number array for the Go binding
          const toBytes = (v: any): number[] => {
            if (!v) return [];
            if (typeof v === 'string') {
              const binary = atob(v);
              const arr = new Array(binary.length);
              for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
              return arr;
            }
            return Array.from(v as Uint8Array);
          };

          // Check if backup contains encrypted password (old format)
          if (conn.encrypted_password) {
            const encryptedBytes = toBytes(conn.encrypted_password);
            const encryptedKeyBytes = toBytes(conn.encrypted_private_key);
            await ImportConnectionFromBackup(conn.name, conn.host, port, conn.username, privateKeyPath, encryptedBytes, encryptedKeyBytes);
          } else {
            // New format: plain text password, encrypt on server side
            const password = conn.password || '';
            await CreateConnection(conn.name, conn.host, port, conn.username, password, privateKeyPath, []);
          }
          imported++;
        } catch (err) {
          console.error(`Failed to import ${conn.name}:`, err);
          failed++;
        }
      }

      if (imported > 0) {
        success = true;
        setImportSuccess(`Successfully imported ${imported} connection(s)${failed > 0 ? `, ${failed} failed` : ''}`);
        await loadConnections();
        setTimeout(() => {
          closeImportModal();
        }, 1500);
      } else {
        setImportError(`Failed to import all connections. ${failed} failed.`);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setImportError('Invalid JSON file format');
      } else {
        setImportError(`Error reading file: ${err}`);
      }
    }

    // Stay disabled until modal closes after successful import (1.5s), so the button can't be double-clicked
    if (!success) {
      importingRef.current = false;
      setImporting(false);
    }
  };

  const handleConnect = useCallback((sid: string, connectionId: number) => {
    setSessions(prev => prev.map(session => 
      session.connection.id === connectionId && !session.sessionId
        ? { ...session, sessionId: sid }
        : session
    ));
    
    const conn = connections.find(c => c.id === connectionId);
    setStatusText(`Connected to ${conn?.name || 'server'}`);
    if (conn) setPingConnId(conn.id);
  }, [connections]);

  const handleDisconnect = useCallback((sid: string) => {
    const session = sessions.find(s => s.sessionId === sid);
    setStatusText(`Disconnected from ${session?.connection.name || 'server'}`);
    setPingConnId(null);
    setPingMs(null);
    
    setSessions(prev => prev.filter(s => s.sessionId !== sid));
    terminalRefs.current.delete(sid);
    
    if (activeSessionIndex >= sessions.length - 1) {
      setActiveSessionIndex(Math.max(0, sessions.length - 2));
    }
  }, [sessions, activeSessionIndex]);

  const closeSession = (index: number) => {
    const session = sessions[index];
    if (session?.sessionId) {
      const terminalRef = terminalRefs.current.get(session.sessionId);
      if (terminalRef) {
        terminalRef.disconnect();
      }
    }
    
    setSessions(prev => prev.filter((_, i) => i !== index));
    
    if (activeSessionIndex === index) {
      setActiveSessionIndex(Math.max(0, index - 1));
    } else if (activeSessionIndex > index) {
      setActiveSessionIndex(activeSessionIndex - 1);
    }
  };

  const handlePassphraseSubmit = (passphrase: string) => {
    if (passphrasePrompt) {
      connectToServer(passphrasePrompt.connection, passphrase);
      setPassphrasePrompt(null);
    }
  };

  const activeSession = sessions[activeSessionIndex] || null;

  // Derive the status bar state
  const statusState =
    sessions.length > 0 && sessions.some(s => s.sessionId) ? 'connected'
    : sessions.length > 0 ? 'connecting'
    : 'idle';

  const statusClass = {
    idle: styles.statusIdle,
    connecting: styles.statusConnecting,
    connected: styles.statusConnected,
    error: styles.statusError
  }[statusState];

  const openAddForm = () => {
    setShowAddForm(true);
    setFormError('');
    setFormSuccess('');
    setNewConn({
      name: '',
      host: '',
      port: 22,
      username: '',
      password: '',
      privateKeyPath: '',
      encryptedPrivateKey: undefined,
      privateKeyFileName: ''
    });
    setAuthMethod('password');
  };

  const closeAddForm = () => {
    setShowAddForm(false);
  };

  const selectPrivateKeyFile = async () => {
    try {
      const result = await SelectPrivateKeyFile();
      if (result && result.path) {
        // Store encrypted content, not the path
        setNewConn({
          ...newConn,
          encryptedPrivateKey: result.encryptedContent,
          privateKeyFileName: result.path.split(/[\\/]/).pop() || ''
        });
      }
    } catch (err) {
      console.error('Failed to select file:', err);
    }
  };

  const saveConnection = async () => {
    setFormError('');
    setFormSuccess('');
    
    if (!newConn.name || !newConn.host || !newConn.username) {
      setFormError('Name, Host, and Username are required');
      return;
    }
    
    if (authMethod === 'key' && !newConn.encryptedPrivateKey && !newConn.privateKeyPath) {
      setFormError('Private Key is required');
      return;
    }

    try {
      const pwd = newConn.password;
      const keyPath = authMethod === 'key' ? newConn.privateKeyPath : '';
      await CreateConnection(
        newConn.name,
        newConn.host,
        newConn.port,
        newConn.username,
        pwd,
        keyPath,
        newConn.encryptedPrivateKey || []
      );
      setFormSuccess('Connection saved');
      setTimeout(() => {
        setShowAddForm(false);
        loadConnections();
      }, 800);
    } catch (err) {
      setFormError(`Error: ${err}`);
    }
  };

  return (
    <main className={styles.main}>
      <div ref={menuBarRef} className={styles.menuBar}>
        <div className={styles.menuGroup}>
          <button
            type="button"
            className={`${styles.menuItem} ${openMenu === 'file' ? styles.menuItemOpen : ''}`}
            onClick={() => toggleMenu('file')}
            aria-haspopup="true"
            aria-expanded={openMenu === 'file'}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className={styles.menuDropdown} role="menu" aria-label="File menu">
              <div className={styles.menuSubmenu}>
                <button
                  type="button"
                  className={`${styles.dropdownItem} ${openSubmenu === 'connection' ? styles.dropdownItemOpen : ''}`}
                  role="menuitem"
                  aria-haspopup="true"
                  aria-expanded={openSubmenu === 'connection'}
                  onClick={() => setOpenSubmenu(prev => (prev === 'connection' ? '' : 'connection'))}
                >
                  <Server size={14} />
                  Connection
                  <ChevronRight size={14} className={styles.menuSubmenuArrow} />
                </button>
                {openSubmenu === 'connection' && (
                  <div className={styles.menuSubmenuDropdown} role="menu" aria-label="Connection menu">
                    <button type="button" className={styles.dropdownItem} role="menuitem" onClick={handleBackup}>
                      <Upload size={14} />
                      Backup Connections
                    </button>
                    <button type="button" className={styles.dropdownItem} role="menuitem" onClick={handleMenuRestore}>
                      <Download size={14} />
                      Restore Connections
                    </button>
                  </div>
                )}
              </div>
              <button type="button" className={styles.dropdownItem} role="menuitem" onClick={handleCreateShortcut}>
                <MonitorDown size={14} />
                Create Desktop Shortcut
              </button>
              <div className={styles.menuSeparator} />
              <button type="button" className={styles.dropdownItem} role="menuitem" onClick={handleQuit}>
                <LogOut size={14} />
                Exit
              </button>
            </div>
          )}
        </div>
        <div className={styles.menuGroup}>
          <button
            type="button"
            className={`${styles.menuItem} ${openMenu === 'tools' ? styles.menuItemOpen : ''}`}
            onClick={() => toggleMenu('tools')}
            aria-haspopup="true"
            aria-expanded={openMenu === 'tools'}
          >
            Tools
          </button>
          {openMenu === 'tools' && (
            <div className={styles.menuDropdown} role="menu" aria-label="Tools menu">
              <button type="button" className={styles.dropdownItem} role="menuitem" onClick={() => { setOpenMenu(''); setShowPPKConverter(true); }}>
                <Wrench size={14} />
                PPK Formatter
              </button>
            </div>
          )}
        </div>
        <div className={styles.menuGroup}>
          <button
            type="button"
            className={`${styles.menuItem} ${openMenu === 'help' ? styles.menuItemOpen : ''}`}
            onClick={() => toggleMenu('help')}
            aria-haspopup="true"
            aria-expanded={openMenu === 'help'}
          >
            Help
          </button>
          {openMenu === 'help' && (
            <div className={styles.menuDropdown} role="menu" aria-label="Help menu">
              <button type="button" className={styles.dropdownItem} role="menuitem" onClick={handleAbout}>
                <Info size={14} />
                About Esesha
              </button>
            </div>
          )}
        </div>
      </div>
      <div className={styles.appContainer}>
        <div className={styles.sidebar}>
          <div className={styles.header}>
            <div className={styles.brand}>
              <h2 className={styles.brandName}>Esesha</h2>
              <span className={styles.brandSub}>SSH Waku Waku Console</span>
            </div>
            <div className={styles.headerButtons}>
              <button type="button" className={styles.btnAdd} onClick={openAddForm} aria-label="Add connection">
                <Plus size={18} aria-hidden="true" />
              </button>
              <button type="button" className={styles.btnRefresh} onClick={loadConnections} disabled={loading} aria-label="Refresh connections">
                <RefreshCw size={18} className={loading ? styles.spin : undefined} aria-hidden="true" />
              </button>
            </div>
          </div>
          
          {loading && connections.length === 0 ? (
            <div className={styles.connectionList} aria-busy="true" aria-label="Loading connections">
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={`skeleton ${styles.skelDot}`} />
                  <div className={styles.skeletonLine}>
                    <div className={`skeleton ${styles.skelTitle}`} />
                    <div className={`skeleton ${styles.skelDetail}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : connections.length === 0 ? (
            <div className={styles.emptyState}>
              <ServerOff size={40} strokeWidth={1.5} aria-hidden="true" />
              <h3>No connections</h3>
              <p>Add your first SSH connection to get started.</p>
              <button type="button" className={styles.btnAdd} onClick={openAddForm}>
                <Plus size={16} aria-hidden="true" />
                Add Connection
              </button>
            </div>
          ) : (
            <div className={styles.connectionList}>
              {connections.map((conn) => (
                <button 
                  type="button"
                  key={conn.id}
                  className={styles.connectionItem}
                  onClick={() => selectConnection(conn)}
                >
                  <span className={styles.statusDot} aria-hidden="true" />
                  <span className={styles.connText}>
                    <span className={styles.connName}>{conn.name}</span>
                    <span className={styles.connDetails}>{conn.username}@{conn.host}:{conn.port}</span>
                  </span>
                  <button
                    type="button"
                    className={styles.kebabButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === conn.id ? null : conn.id);
                    }}
                    aria-label="Connection options"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === conn.id && (
                    <div className={styles.kebabDropdown}>
                      <button
                        type="button"
                        className={styles.dropdownItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditConnection(conn);
                          setOpenMenuId(null);
                        }}
                      >
                        <Edit size={14} />
                        Edit Connection
                      </button>
                      <button
                        type="button"
                        className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConnection(conn);
                          setOpenMenuId(null);
                        }}
                      >
                        <Trash2 size={14} />
                        Delete Connection
                      </button>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.mainContent}>
          <div className={`${styles.statusBar} ${statusClass}`} aria-hidden="true" />
          {sessions.length > 0 ? (
            <>
              <div className={styles.contentHeader}>
                <div className={styles.sessionTabs}>
                  {sessions.map((session, index) => (
                    <div
                      key={index}
                      className={`${styles.sessionTab} ${activeSessionIndex === index ? styles.sessionTabActive : ''}`}
                    >
                      <button
                        type="button"
                        className={styles.sessionTabButton}
                        onClick={() => setActiveSessionIndex(index)}
                      >
                        <span className={styles.sessionTabName}>{session.connection.name}</span>
                        <span className={styles.sessionTabHost}>
                          {session.connection.username}@{session.connection.host}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={styles.sessionTabClose}
                        onClick={() => closeSession(index)}
                        aria-label={`Close ${session.connection.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className={styles.headerRight}>
                  <span className={styles.status}>
                    {statusText}
                    {(statusText.startsWith('Connecting to') || statusText.startsWith('Connected to')) && pingMs !== null && ` | ${pingMs}ms`}
                  </span>
                </div>
              </div>
              
              {activeSession && (
                <>
                  <div className={styles.viewTabs}>
                    <button 
                      type="button"
                      className={`${styles.tab} ${activeSession.activeTab === 'terminal' ? styles.active : ''}`}
                      onClick={() => {
                        setSessions(prev => prev.map((s, i) => 
                          i === activeSessionIndex ? { ...s, activeTab: 'terminal' } : s
                        ));
                      }}
                    >
                      Terminal
                    </button>
                    <button 
                      type="button"
                      className={`${styles.tab} ${activeSession.activeTab === 'files' ? styles.active : ''}`}
                      onClick={() => {
                        setSessions(prev => prev.map((s, i) => 
                          i === activeSessionIndex ? { ...s, activeTab: 'files' } : s
                        ));
                      }}
                      disabled={!activeSession.sessionId}
                    >
                      Files
                    </button>
                  </div>
                  
                  <div className={styles.contentBody}>
                    {sessions.map((session, index) => (
                      <div
                        key={index}
                        style={{ display: index === activeSessionIndex ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}
                      >
                        {session.activeTab === 'terminal' ? (
                          <div className={`${styles.terminalWrapper} ${session.sessionId ? styles.terminalWrapperActive : ''}`}>
                            <Terminal 
                              ref={(ref) => {
                                if (ref && session.sessionId) {
                                  terminalRefs.current.set(session.sessionId, ref);
                                }
                              }}
                              connectionId={session.connection.id}
                              onConnect={(sid) => handleConnect(sid, session.connection.id)}
                              onDisconnect={handleDisconnect}
                            />
                          </div>
                        ) : session.activeTab === 'files' && session.sessionId ? (
                          <FileExplorer sessionId={session.sessionId} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className={styles.placeholder}>
              <Server size={48} strokeWidth={1.5} aria-hidden="true" />
              <h2>Awaiting connection</h2>
              <p className={styles.placeholderSub}>Ready · select a host from the sidebar</p>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div 
          className={styles.modalOverlay} 
          onClick={closeAddForm}
          onKeyDown={(e) => e.key === 'Escape' && closeAddForm()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalAccent} />
            <div className={styles.modalHeader}>
              <h3 id="modal-title">Add SSH Connection</h3>
              <button type="button" className={styles.btnCloseModal} onClick={closeAddForm} aria-label="Close dialog">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="conn-name">Connection Name</label>
                <input 
                  id="conn-name"
                  type="text" 
                  value={newConn.name} 
                  onChange={(e) => setNewConn({...newConn, name: e.target.value})}
                  placeholder="My Server" 
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="conn-host">Host</label>
                  <input 
                    id="conn-host"
                    type="text" 
                    value={newConn.host}
                    onChange={(e) => setNewConn({...newConn, host: e.target.value})}
                    placeholder="192.168.1.1" 
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.formGroupSmall}`}>
                  <label htmlFor="conn-port">Port</label>
                  <input 
                    id="conn-port"
                    type="number" 
                    value={newConn.port}
                    onChange={(e) => setNewConn({...newConn, port: parseInt(e.target.value) || 22})}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="conn-username">Username</label>
                <input 
                  id="conn-username"
                  type="text" 
                  value={newConn.username}
                  onChange={(e) => setNewConn({...newConn, username: e.target.value})}
                  placeholder="root" 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Authentication Method</label>
                <div className={styles.authToggle} role="group" aria-label="Authentication method">
                  <button
                    type="button"
                    className={`${styles.authToggleBtn} ${authMethod === 'password' ? styles.authToggleBtnActive : ''}`}
                    onClick={() => setAuthMethod('password')}
                    aria-pressed={authMethod === 'password'}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    className={`${styles.authToggleBtn} ${authMethod === 'key' ? styles.authToggleBtnActive : ''}`}
                    onClick={() => setAuthMethod('key')}
                    aria-pressed={authMethod === 'key'}
                  >
                    Private Key File
                  </button>
                </div>
              </div>
              {authMethod === 'password' ? (
                <div className={styles.formGroup}>
                  <label htmlFor="conn-password">Password</label>
                  <input 
                    id="conn-password"
                    type="password" 
                    value={newConn.password}
                    onChange={(e) => setNewConn({...newConn, password: e.target.value})}
                    placeholder="Optional (leave blank for key-based auth)" 
                    autoComplete="new-password"
                  />
                  <p className={styles.helperText}>For password authentication. Leave blank if using key-based authentication.</p>
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label htmlFor="conn-auth-privatekey">Private Key</label>
                  <div className={styles.fileInputGroup}>
                    <input 
                      id="conn-auth-privatekey"
                      type="text" 
                      value={newConn.encryptedPrivateKey && newConn.encryptedPrivateKey.length > 0
                        ? (newConn.privateKeyFileName ? `🔒 ${newConn.privateKeyFileName}` : '🔒 Private key stored securely')
                        : newConn.privateKeyPath}
                      onChange={(e) => setNewConn({...newConn, privateKeyPath: e.target.value, encryptedPrivateKey: undefined, privateKeyFileName: ''})}
                      placeholder="Select a private key file" 
                      readOnly
                    />
                    <button 
                      type="button" 
                      className={styles.btnBrowse}
                      onClick={selectPrivateKeyFile}
                      aria-label="Browse for private key file"
                    >
                      <FolderOpen size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
              {formError && (
                <div className={`${styles.formMessage} ${styles.error}`} role="alert">{formError}</div>
              )}
              {formSuccess && (
                <div className={`${styles.formMessage} ${styles.success}`} role="status">
                  <CheckCircle2 size={14} aria-hidden="true" />
                  {formSuccess}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={closeAddForm}>Cancel</button>
              <button type="button" className={styles.btnSave} onClick={saveConnection}>Save Connection</button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingConnection && (
        <div 
          className={styles.modalOverlay} 
          onClick={closeEditModal}
          onKeyDown={(e) => e.key === 'Escape' && closeEditModal()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalAccent} />
            <div className={styles.modalHeader}>
              <h3 id="edit-modal-title">Edit SSH Connection</h3>
              <button type="button" className={styles.btnCloseModal} onClick={closeEditModal} aria-label="Close dialog">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-conn-name">Connection Name</label>
                <input 
                  id="edit-conn-name"
                  type="text" 
                  value={editFormData.name} 
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  placeholder="My Server" 
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="edit-conn-host">Host</label>
                  <input 
                    id="edit-conn-host"
                    type="text" 
                    value={editFormData.host}
                    onChange={(e) => setEditFormData({...editFormData, host: e.target.value})}
                    placeholder="192.168.1.1" 
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.formGroupSmall}`}>
                  <label htmlFor="edit-conn-port">Port</label>
                  <input 
                    id="edit-conn-port"
                    type="number" 
                    value={editFormData.port}
                    onChange={(e) => setEditFormData({...editFormData, port: parseInt(e.target.value) || 22})}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-conn-username">Username</label>
                <input 
                  id="edit-conn-username"
                  type="text" 
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                  placeholder="root" 
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-conn-password">Password</label>
                <input 
                  id="edit-conn-password"
                  type="password" 
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                  placeholder="Leave blank to keep current password" 
                  autoComplete="new-password"
                />
                <p className={styles.helperText}>For password authentication. Leave blank to keep the existing password unchanged.</p>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-conn-auth-privatekey">Private Key</label>
                <div className={styles.fileInputGroup}>
                  <input 
                    id="edit-conn-auth-privatekey"
                    type="text" 
                    value={editFormData.encryptedPrivateKey && editFormData.encryptedPrivateKey.length > 0
                      ? (editFormData.privateKeyFileName || '🔒 Private key stored securely')
                      : editFormData.privateKeyPath}
                    onChange={(e) => setEditFormData({...editFormData, privateKeyPath: e.target.value, encryptedPrivateKey: undefined, privateKeyFileName: ''})}
                    placeholder="Select a private key file" 
                    readOnly
                  />
                  <button 
                    type="button" 
                    className={styles.btnBrowse}
                    onClick={selectEditPrivateKeyFile}
                    aria-label="Browse for private key file"
                  >
                    <FolderOpen size={16} aria-hidden="true" />
                  </button>
                </div>
                <p className={styles.helperText}>Key content is encrypted and stored securely on this machine.</p>
              </div>
              {editFormError && (
                <div className={`${styles.formMessage} ${styles.error}`} role="alert">{editFormError}</div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={closeEditModal}>Cancel</button>
              <button type="button" className={styles.btnSave} onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.deleteDialog}>
            <div className={styles.deleteIcon}>
              <Trash2 size={28} strokeWidth={2} />
            </div>
            <div className={styles.deleteContent}>
              <h2 className={styles.deleteTitle}>Delete Connection</h2>
              <p className={styles.deleteMessage}>
                Are you sure you want to delete <strong className={styles.deleteHighlight}>{deleteConfirm.name}</strong>?
              </p>
              <p className={styles.deleteWarning}>
                This action cannot be undone.
              </p>
            </div>
            <div className={styles.deleteActions}>
              <button type="button" className={styles.deleteBtnCancel} onClick={cancelDelete}>
                Cancel
              </button>
              <button type="button" className={styles.deleteBtnConfirm} onClick={confirmDelete}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {backupPath && (
        <div className={styles.modalOverlay} onClick={() => setBackupPath(null)} role="dialog" aria-modal="true" aria-labelledby="backup-title">
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className={styles.modalHeader}>
              <h3 id="backup-title">Backup Successful</h3>
              <button type="button" className={styles.btnCloseModal} onClick={() => setBackupPath(null)} aria-label="Close dialog">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={`${styles.formMessage} ${styles.success}`} role="status">
                <CheckCircle2 size={14} aria-hidden="true" />
                Connections backed up
              </div>
              <p style={{ marginTop: '1rem', marginBottom: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', wordBreak: 'break-all' }}>
                {backupPath}
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSave} onClick={() => setBackupPath(null)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '450px' }}>
            <div className={styles.modalHeader}>
              <h3>Restore Connections</h3>
              <button 
                type="button" 
                className={styles.btnCloseModal} 
                onClick={closeImportModal}
                aria-label="Close dialog"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                Select a JSON backup file to restore connections.
              </p>
              <div
                className={`${styles.importFileArea}${dragOver ? ' ' + styles.importFileAreaDrag : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className={styles.importFileInput}
                  id="import-file-input"
                />
                <label htmlFor="import-file-input" className={styles.importFileLabel}>
                  <Upload size={24} />
                  <span className={styles.importFileLabelText}>
                    {importFile ? importFile.name : 'Choose a JSON file'}
                  </span>
                  <span className={styles.importFileLabelHint}>
                    Click to browse or drag & drop
                  </span>
                </label>
              </div>
              {importError && (
                <div className={`${styles.formMessage} ${styles.error}`} role="alert">{importError}</div>
              )}
              {importSuccess && (
                <div className={`${styles.formMessage} ${styles.success}`} role="status">
                  <CheckCircle2 size={14} aria-hidden="true" />
                  {importSuccess}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={closeImportModal}>Cancel</button>
              <button type="button" className={styles.btnSave} onClick={handleImport} disabled={!importFile || importing}>
                <Download size={16} />
                {importing ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {passphrasePrompt && (
        <PassphraseDialog
          connectionName={passphrasePrompt.connection.name}
          onSubmit={handlePassphraseSubmit}
          onCancel={() => setPassphrasePrompt(null)}
        />
      )}

      {aboutInfo && (
        <div
          className={styles.modalOverlay}
          onClick={() => setAboutInfo(null)}
          onKeyDown={(e) => e.key === 'Escape' && setAboutInfo(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <h3 id="about-title">About Esesha</h3>
              <button type="button" className={styles.btnCloseModal} onClick={() => setAboutInfo(null)} aria-label="Close dialog">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.aboutInfo}>
                <strong className={styles.aboutName}>{aboutInfo.name}</strong>
                <div className={styles.aboutRow}>Version: {aboutInfo.version}</div>
                <div className={styles.aboutRow}>License: {aboutInfo.license}</div>
                <div className={styles.aboutCredits}>{aboutInfo.credits}</div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSave} onClick={() => setAboutInfo(null)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showPPKConverter && (
        <PPKConverterDialog onClose={() => setShowPPKConverter(false)} />
      )}
    </main>
  );
};

export default App;
