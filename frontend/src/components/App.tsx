import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, RefreshCw, Server, ServerOff, X, CheckCircle2, FolderOpen } from 'lucide-react';
import { ListConnections, CreateConnection, SelectPrivateKeyFile } from '@wailsjs/go/main/App';
import { models } from '@wailsjs/go/models';
import Terminal from './Terminal';
import FileExplorer from './FileExplorer';
import PassphraseDialog from './PassphraseDialog';
import styles from './App.module.css';

interface NewConnection {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  privateKeyPath: string;
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
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [authType, setAuthType] = useState<'password' | 'key'>('password');
  const [newConn, setNewConn] = useState<NewConnection>({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKeyPath: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [passphrasePrompt, setPassphrasePrompt] = useState<{
    connection: models.Connection;
  } | null>(null);

  const terminalRefs = useRef<Map<string, { disconnect: () => void; clear: () => void }>>(new Map());

  useEffect(() => {
    loadConnections();
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
    
    // Check if connection uses encrypted private key
    if (conn.privateKeyPath) {
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
    setStatusText(`Connecting to ${conn.name}...`);
  };

  const handleConnect = useCallback((sid: string, connectionId: number) => {
    setSessions(prev => prev.map(session => 
      session.connection.id === connectionId && !session.sessionId
        ? { ...session, sessionId: sid }
        : session
    ));
    
    const conn = connections.find(c => c.id === connectionId);
    setStatusText(`Connected to ${conn?.name || 'server'}`);
  }, [connections]);

  const handleDisconnect = useCallback((sid: string) => {
    const session = sessions.find(s => s.sessionId === sid);
    setStatusText(`Disconnected from ${session?.connection.name || 'server'}`);
    
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
      privateKeyPath: ''
    });
    setAuthType('password');
  };

  const closeAddForm = () => {
    setShowAddForm(false);
  };

  const selectPrivateKeyFile = async () => {
    try {
      const filePath = await SelectPrivateKeyFile();
      if (filePath) {
        setNewConn({ ...newConn, privateKeyPath: filePath });
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
    
    if (authType === 'password' && !newConn.password) {
      setFormError('Password is required');
      return;
    }
    
    if (authType === 'key' && !newConn.privateKeyPath) {
      setFormError('Private Key Path is required');
      return;
    }

    try {
      const pwd = authType === 'password' ? newConn.password : '';
      const keyPath = authType === 'key' ? newConn.privateKeyPath : '';
      await CreateConnection(newConn.name, newConn.host, newConn.port, newConn.username, pwd, keyPath);
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
      <div className={styles.appContainer}>
        <div className={styles.sidebar}>
          <div className={styles.header}>
            <div className={styles.brand}>
              <h2 className={styles.brandName}>Esesha</h2>
              <span className={styles.brandSub}>SSH Mission Console</span>
            </div>
            <div className={styles.headerButtons}>
              <button type="button" className={styles.btnAdd} onClick={openAddForm} aria-label="Add connection">
                <Plus size={16} aria-hidden="true" />
                Add
              </button>
              <button type="button" className={styles.btnRefresh} onClick={loadConnections} disabled={loading} aria-label="Refresh connections">
                <RefreshCw size={16} className={loading ? styles.spin : undefined} aria-hidden="true" />
                {loading ? 'Loading...' : 'Refresh'}
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
                  <span className={styles.status}>{statusText}</span>
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
                <label>Authentication</label>
                <div className={styles.authToggle} role="group" aria-label="Authentication type">
                  <button
                    type="button"
                    className={`${styles.authToggleBtn} ${authType === 'password' ? styles.authToggleBtnActive : ''}`}
                    onClick={() => setAuthType('password')}
                    aria-pressed={authType === 'password'}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    className={`${styles.authToggleBtn} ${authType === 'key' ? styles.authToggleBtnActive : ''}`}
                    onClick={() => setAuthType('key')}
                    aria-pressed={authType === 'key'}
                  >
                    Private Key
                  </button>
                </div>
              </div>
              {authType === 'password' ? (
                <div className={styles.formGroup}>
                  <label htmlFor="conn-auth-password">Password</label>
                  <input 
                    id="conn-auth-password"
                    type="password" 
                    value={newConn.password}
                    onChange={(e) => setNewConn({...newConn, password: e.target.value})}
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label htmlFor="conn-auth-privatekey">Private Key Path</label>
                  <div className={styles.fileInputGroup}>
                    <input 
                      id="conn-auth-privatekey"
                      type="text" 
                      value={newConn.privateKeyPath}
                      onChange={(e) => setNewConn({...newConn, privateKeyPath: e.target.value})}
                      placeholder="C:\Users\user\.ssh\id_rsa" 
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

      {passphrasePrompt && (
        <PassphraseDialog
          connectionName={passphrasePrompt.connection.name}
          onSubmit={handlePassphraseSubmit}
          onCancel={() => setPassphrasePrompt(null)}
        />
      )}
    </main>
  );
};

export default App;
