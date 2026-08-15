import React, { useEffect, useLayoutEffect, useState, useMemo, useRef } from 'react';
import { Upload, RefreshCw, ArrowUp, Edit2, Trash2, FolderOpen, CheckCircle2, AlertTriangle, Info, ChevronRight, Plus, Folder, File as FileIcon } from 'lucide-react';
import FileItem from './FileItem';
import FileEditor from './FileEditor';
import UploadDialog from './UploadDialog';
import type { SFTPProgressEvent } from '../types/events';
import styles from './FileExplorer.module.css';

const formatSpeed = (bytesPerSec: number): string => {
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let v = bytesPerSec;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
};

interface FileInfo {
  name: string;
  size: number;
  mode: number;
  modifiedTime: number;
  isDir: boolean;
}

interface FileExplorerProps {
  sessionId: string;
}

interface ContextMenu {
  x: number;
  y: number;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

type DialogState =
  | { kind: 'delete'; item: FileInfo }
  | { kind: 'rename'; item: FileInfo }
  | { kind: 'chmod'; item: FileInfo }
  | { kind: 'createFolder'; item?: FileInfo }
  | { kind: 'createFile'; item?: FileInfo }
  | null;

const FileExplorer: React.FC<FileExplorerProps> = ({ sessionId }) => {
  const [currentPath, setCurrentPath] = useState('/');
  // Keeps event handlers reading the latest path without re-running the effect
  const currentPathRef = useRef('/');
  const [items, setItems] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [selectedItem, setSelectedItem] = useState<FileInfo | null>(null);
  const [selectedFileItem, setSelectedFileItem] = useState<FileInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0);
  const [uploadActive, setUploadActive] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<FileInfo | null>(null);
  const [dragTargetItem, setDragTargetItem] = useState<FileInfo | null>(null);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [nameSort, setNameSort] = useState<'asc' | 'desc'>('asc');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const pathParts = useMemo(() => 
    currentPath.split('/').filter(p => p), 
    [currentPath]
  );

  const sortedItems = useMemo(() => {
    const dirs = items.filter(i => i.isDir);
    const files = items.filter(i => !i.isDir);
    const cmp = (a: FileInfo, b: FileInfo) =>
      nameSort === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    return [...dirs.sort(cmp), ...files.sort(cmp)];
  }, [items, nameSort]);

  useEffect(() => {
    if (sessionId) {
      loadDirectory('/');
    }

    const handleProgress = (data: SFTPProgressEvent) => {
      if (data.sessionId === sessionId) {
        setUploadProgress(data.percentage || 0);
        setTransferSpeed(data.speedBytesPerSec || 0);
        if (data.percentage >= 100) {
          setTimeout(() => {
            setUploadActive(false);
            setUploadProgress(0);
            setTransferSpeed(0);
            loadDirectory(currentPathRef.current);
          }, 500);
        }
      }
    };

    const handleEditorSaved = (data: { sessionId: string; remotePath: string }) => {
      if (data.sessionId === sessionId) {
        showToast(`File saved: ${data.remotePath}`, 'success');
        loadDirectory(currentPathRef.current);
      }
    };

    window.runtime.EventsOn('sftp:progress', handleProgress);
    window.runtime.EventsOn('editor:saved', handleEditorSaved);

    return () => {
      window.runtime.EventsOff('sftp:progress');
      window.runtime.EventsOff('editor:saved');
    };
  }, [sessionId]);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (!addMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (addButtonRef.current && !addButtonRef.current.contains(e.target as Node)) {
        const menu = document.querySelector(`.${styles.addMenu}`);
        if (menu && !menu.contains(e.target as Node)) {
          setAddMenuOpen(false);
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [addMenuOpen]);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };

  const loadDirectory = async (path: string) => {
    console.log('[FileExplorer] loadDirectory called:', path);
    setLoading(true);
    setErrorMsg('');
    try {
      if (window.go?.main?.App?.ListDirectory) {
        const result = await window.go.main.App.ListDirectory(sessionId, path);
        console.log('[FileExplorer] loaded directory:', { path, itemCount: result?.length || 0 });
        setItems(result || []);
        setCurrentPath(path);
        currentPathRef.current = path;
      } else {
        console.error('[FileExplorer] ListDirectory method not available');
        setErrorMsg('File system API not available');
      }
    } catch (err) {
      console.error('[FileExplorer] loadDirectory error:', err);
      setErrorMsg(`Failed to load directory: ${err}`);
    }
    setLoading(false);
  };

  const handleItemClick = (item: FileInfo) => {
    if (item.isDir) {
      // Navigate immediately
      const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      setCurrentPath(newPath);
      currentPathRef.current = newPath;
      loadDirectory(newPath);
      setSelectedFileItem(null);
    } else {
      // Select file only
      setSelectedFileItem(item);
    }
  };

  const handleDoubleClick = (item: FileInfo) => {
    if (item.isDir) {
      const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      loadDirectory(newPath);
    } else {
      editFile(item);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, item: FileInfo) => {
    event.preventDefault();
    setSelectedItem(item);
    setContextMenu({
      x: event.clientX,
      y: event.clientY
    });
  };

  // Adjust menu position to stay within the viewport before paint
  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const menuRect = contextMenuRef.current.getBoundingClientRect();
    const padding = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = contextMenu.x;
    let y = contextMenu.y;

    if (x + menuRect.width > viewportWidth - padding) {
      x = contextMenu.x - menuRect.width;
    }
    if (x < padding) {
      x = contextMenu.x;
    }
    if (y + menuRect.height > viewportHeight - padding) {
      y = contextMenu.y - menuRect.height;
    }
    if (y < padding) {
      y = contextMenu.y;
    }

    x = Math.min(Math.max(padding, x), viewportWidth - menuRect.width - padding);
    y = Math.min(Math.max(padding, y), viewportHeight - menuRect.height - padding);

    setMenuPosition({ x, y });
  }, [contextMenu]);

  const closeContextMenu = () => {
    setContextMenu(null);
    setSelectedItem(null);
  };

  const editFile = (item: FileInfo) => {
    const remotePath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
    setEditingPath(remotePath);
    closeContextMenu();
  };

  const downloadFile = async (item: FileInfo) => {
    try {
      const remotePath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      if (window.go?.main?.App?.DownloadFileToDialog) {
        await window.go.main.App.DownloadFileToDialog(sessionId, remotePath);
      }
    } catch (err) {
      setErrorMsg(`Download failed: ${err}`);
    }
    closeContextMenu();
  };

  const deleteItem = (item: FileInfo) => {
    setDialog({ kind: 'delete', item });
    closeContextMenu();
  };

  const renameItem = (item: FileInfo) => {
    setDialog({ kind: 'rename', item });
    closeContextMenu();
  };

  const chmodItem = (item: FileInfo) => {
    setDialog({ kind: 'chmod', item });
    closeContextMenu();
  };

  const confirmDelete = async (item: FileInfo) => {
    setDialog(null);
    try {
      const remotePath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      if (window.go?.main?.App?.DeletePath) {
        await window.go.main.App.DeletePath(sessionId, remotePath);
        showToast(`Deleted ${item.name}`, 'success');
        loadDirectory(currentPath);
      }
    } catch (err) {
      showToast(`Delete failed: ${err}`, 'error');
    }
  };

  const confirmRename = async (item: FileInfo, newName: string) => {
    setDialog(null);
    if (!newName || newName === item.name) return;
    try {
      const oldPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      const newPath = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;
      if (window.go?.main?.App?.RenamePath) {
        await window.go.main.App.RenamePath(sessionId, oldPath, newPath);
        showToast(`Renamed to ${newName}`, 'success');
        loadDirectory(currentPath);
      }
    } catch (err) {
      showToast(`Rename failed: ${err}`, 'error');
    }
  };

  const confirmChmod = async (item: FileInfo, modeStr: string) => {
    setDialog(null);
    if (!modeStr) return;
    try {
      const mode = parseInt(modeStr, 8);
      const remotePath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      if (window.go?.main?.App?.ChangePermissions) {
        await window.go.main.App.ChangePermissions(sessionId, remotePath, mode);
        showToast(`Permissions updated on ${item.name}`, 'success');
        loadDirectory(currentPath);
      }
    } catch (err) {
      showToast(`Chmod failed: ${err}`, 'error');
    }
  };

  const closeDialog = () => {
    setDialog(null);
    setDialogError(null);
  };

  useEffect(() => {
    if (!dialog) {
      setDialogError(null);
    }
  }, [dialog]);

  const validateFolderName = (name: string): string | null => {
    if (!name.trim()) return 'Folder name cannot be empty';
    if (name.includes('/') || name.includes('\\')) return 'Invalid characters: / \\';
    if (name === '.' || name === '..') return 'Invalid folder name';
    return null;
  };

  const validateFileName = (name: string): string | null => {
    if (!name.trim()) return 'File name cannot be empty';
    if (name.includes('/') || name.includes('\\')) return 'Invalid characters: / \\';
    return null;
  };

  const handleCreateFolder = async (name: string) => {
    const error = validateFolderName(name);
    if (error) {
      setDialogError(error);
      return;
    }
    setDialogError(null);
    try {
      const newPath = `${currentPath}/${name}`.replace(/\/+/g, '/');
      await window.go.main.App.CreateDirectory(sessionId, newPath);
      showToast(`Folder "${name}" created`, 'success');
      setDialog(null);
      loadDirectory(currentPath);
    } catch (err) {
      setDialogError(`Failed to create folder: ${err}`);
    }
  };

  const handleCreateFile = async (name: string) => {
    const error = validateFileName(name);
    if (error) {
      setDialogError(error);
      return;
    }
    setDialogError(null);
    try {
      const newPath = `${currentPath}/${name}`.replace(/\/+/g, '/');
      await window.go.main.App.WriteFile(sessionId, newPath, '');
      showToast(`File "${name}" created`, 'success');
      setDialog(null);
      loadDirectory(currentPath);
    } catch (err) {
      setDialogError(`Failed to create file: ${err}`);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    setDraggedItem(null);
    setDragTargetItem(null);

    // Check if this is a remote file move
    if (event.dataTransfer.types.includes('application/x-esesha-file')) {
      const data = event.dataTransfer.getData('application/x-esesha-file');
      if (data && draggedItem) {
        // Drop on empty space = move to current directory (no-op, already here)
        return;
      }
    }

    // Otherwise it's a local file upload
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
  };

  const uploadFiles = async (files: File[]) => {
    setUploadActive(true);
    for (const file of files) {
      try {
        const remotePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        if (window.go?.main?.App?.UploadFileData) {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const base64 = btoa(String.fromCharCode(...uint8Array));
          await window.go.main.App.UploadFileData(sessionId, remotePath, base64);
        }
      } catch (err) {
        setErrorMsg(`Upload failed: ${err}`);
        setUploadActive(false);
        return;
      }
    }
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(p => p);
    parts.pop();
    const newPath = parts.length === 0 ? '/' : '/' + parts.join('/');
    loadDirectory(newPath);
  };

  const navigateTo = (index: number) => {
    console.log('[FileExplorer] navigateTo called', { index, currentPath, pathParts });
    try {
      const parts = currentPath.split('/').filter(p => p);
      const newParts = parts.slice(0, index + 1);
      const newPath = newParts.length === 0 ? '/' : '/' + newParts.join('/');
      console.log('[FileExplorer] navigating to:', newPath);
      loadDirectory(newPath);
    } catch (err) {
      console.error('[FileExplorer] navigateTo error:', err);
      setErrorMsg(`Navigation failed: ${err}`);
    }
  };

  const handleFileDragStart = (item: FileInfo) => {
    setDraggedItem(item);
  };

  const handleFileDragEnter = (item: FileInfo) => {
    setDragTargetItem(item);
  };

  const handleFileDragLeave = () => {
    setDragTargetItem(null);
  };

  const handleFileDragEnd = () => {
    setDraggedItem(null);
    setDragTargetItem(null);
  };

  const handleFileDrop = async (targetFolder: FileInfo) => {
    if (!draggedItem || !targetFolder.isDir) return;
    
    // Don't allow drop on self
    const oldPath = currentPath === '/' ? `/${draggedItem.name}` : `${currentPath}/${draggedItem.name}`;
    const targetPath = currentPath === '/' ? `/${targetFolder.name}` : `${currentPath}/${targetFolder.name}`;
    
    if (oldPath === targetPath) {
      setDraggedItem(null);
      setDragTargetItem(null);
      return;
    }

    try {
      const newPath = `${targetPath}/${draggedItem.name}`;

      if (window.go?.main?.App?.RenamePath) {
        await window.go.main.App.RenamePath(sessionId, oldPath, newPath);
        showToast(`Moved ${draggedItem.name} to ${targetFolder.name}`, 'success');
        loadDirectory(currentPath);
      }
    } catch (err) {
      showToast(`Move failed: ${err}`, 'error');
    }

    setDraggedItem(null);
    setDragTargetItem(null);
  };

  return (
    <div className={styles.fileExplorer}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.btn} onClick={navigateUp} disabled={currentPath === '/'} aria-label="Navigate up">
          <ArrowUp size={16} aria-hidden="true" />
          Up
        </button>
        <div className={styles.breadcrumb} aria-label="Current path">
          <button type="button" className={styles.crumb} onClick={() => loadDirectory('/')}>root</button>
          {pathParts.map((part, i) => (
            <React.Fragment key={part}>
              <ChevronRight size={14} className={styles.sep} aria-hidden="true" />
              <button type="button" className={styles.crumb} onClick={() => navigateTo(i)}>{part}</button>
            </React.Fragment>
          ))}
        </div>
        <button
          ref={addButtonRef}
          type="button"
          className={styles.iconButton}
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          title="Add"
          aria-label="Create folder or file"
          aria-haspopup="menu"
          aria-expanded={addMenuOpen}
          disabled={uploadActive}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
        {addMenuOpen && (
          <div
            className={styles.addMenu}
            role="menu"
            style={{
              top: addButtonRef.current ? addButtonRef.current.offsetTop + addButtonRef.current.offsetHeight + 4 : 0,
              left: addButtonRef.current ? addButtonRef.current.offsetLeft : 0,
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAddMenuOpen(false);
                setDialog({ kind: 'createFolder' });
              }}
            >
              <Folder size={16} aria-hidden="true" />
              Create Folder
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAddMenuOpen(false);
                setDialog({ kind: 'createFile' });
              }}
            >
              <FileIcon size={16} aria-hidden="true" />
              Create File
            </button>
          </div>
        )}
        <button
          type="button"
          className={`${styles.iconButton} ${styles.iconButtonUpload}`}
          onClick={() => setUploadDialogOpen(true)}
          title="Upload files"
          aria-label="Upload files"
        >
          <Upload size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => loadDirectory(currentPath)}
          title="Refresh directory"
          aria-label="Refresh directory"
        >
          <RefreshCw size={20} aria-hidden="true" />
        </button>
      </div>

      <div 
        className={`${styles.fileList} ${dragOver ? styles.dragOver : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
      >
        {loading ? (
          <div className={styles.status} aria-busy="true" aria-label="Loading directory">
            <div className={styles.skeletonRow}>
              <div className={`skeleton ${styles.skelCell} ${styles.skelIcon}`} />
              <div className={`skeleton ${styles.skelCell} ${styles.skelName}`} />
              <div className={`skeleton ${styles.skelCell} ${styles.skelSize}`} />
              <div className={`skeleton ${styles.skelCell} ${styles.skelPerms}`} />
              <div className={`skeleton ${styles.skelCell} ${styles.skelModified}`} />
            </div>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={`skeleton ${styles.skelCell} ${styles.skelIcon}`} />
                <div className={`skeleton ${styles.skelCell} ${styles.skelName}`} />
                <div className={`skeleton ${styles.skelCell} ${styles.skelSize}`} />
                <div className={`skeleton ${styles.skelCell} ${styles.skelPerms}`} />
                <div className={`skeleton ${styles.skelCell} ${styles.skelModified}`} />
              </div>
            ))}
          </div>
        ) : errorMsg ? (
          <div className={styles.error} role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{errorMsg}</span>
            <button type="button" className={styles.btnRetry} onClick={() => loadDirectory(currentPath)}>
              Retry
            </button>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className={styles.empty}>
            <FolderOpen size={40} strokeWidth={1.5} aria-hidden="true" />
            <h3>Empty directory</h3>
            <p>No files or folders here. Upload something or navigate elsewhere.</p>
          </div>
        ) : (
          <>
            <div className={styles.listHeader}>
              <span className={styles.colIcon}></span>
              <button
                type="button"
                className={`${styles.colName} ${styles.sortable}`}
                onClick={() => setNameSort(s => s === 'asc' ? 'desc' : 'asc')}
                aria-label={`Sort by name (${nameSort === 'asc' ? 'ascending' : 'descending'})`}
              >
                Name {nameSort === 'asc' ? '▲' : '▼'}
              </button>
              <span className={styles.colSize}>Size</span>
              <span className={styles.colPerms}>Permissions</span>
              <span className={styles.colModified}>Modified</span>
            </div>
            {sortedItems.map((item) => (
              <FileItem 
                key={`${item.name}-${item.modifiedTime}`}
                item={item}
                onClick={handleItemClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
                onDelete={deleteItem}
                isSelected={item === selectedFileItem}
                isDragging={item === draggedItem}
                isDragTarget={item === dragTargetItem}
                onFileDragStart={handleFileDragStart}
                onFileDrop={handleFileDrop}
                onFileDragEnter={handleFileDragEnter}
                onFileDragLeave={handleFileDragLeave}
                onFileDragEnd={handleFileDragEnd}
              />
            ))}
          </>
        )}
      </div>

      {uploadActive && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }}></div>
          <span className={styles.progressText}>
            {uploadProgress}%{transferSpeed > 0 && <span className={styles.progressSpeed}> · {formatSpeed(transferSpeed)}</span>}
          </span>
        </div>
      )}

      {contextMenu && selectedItem && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }}
        >
          {!selectedItem.isDir && (
            <button type="button" onClick={() => editFile(selectedItem)}>
              <Edit2 size={16} aria-hidden="true" />
              Edit
            </button>
          )}
          <button type="button" onClick={() => downloadFile(selectedItem)}>Download</button>
          <button type="button" onClick={() => renameItem(selectedItem)}>Rename</button>
          <button type="button" onClick={() => chmodItem(selectedItem)}>Change Permissions</button>
          <button type="button" onClick={() => deleteItem(selectedItem)} className={styles.danger}>
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        </div>
      )}

      {editingPath && (
        <FileEditor
          key={editingPath}
          sessionId={sessionId}
          remotePath={editingPath}
          onClose={() => {
            setEditingPath(null);
            loadDirectory(currentPathRef.current);
          }}
        />
      )}

      {toast && (
        <div className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`} role="status">
          {toast.type === 'success' && <CheckCircle2 size={16} aria-hidden="true" />}
          {toast.type === 'error' && <AlertTriangle size={16} aria-hidden="true" />}
          {toast.type === 'info' && <Info size={16} aria-hidden="true" />}
          <span>{toast.message}</span>
        </div>
      )}

      {uploadDialogOpen && (
        <UploadDialog
          isOpen={uploadDialogOpen}
          sessionId={sessionId}
          currentRemotePath={currentPath}
          onClose={() => setUploadDialogOpen(false)}
          onUploadComplete={() => loadDirectory(currentPathRef.current)}
        />
      )}

      {dialog && (() => {
        const dlgItem = dialog.item;
        return (
        <Dialog
          key={`${dialog.kind}-${dlgItem?.name ?? ''}`}
          kind={dialog.kind}
          item={dlgItem}
          error={dialogError}
          onErrorClear={() => setDialogError(null)}
          onConfirm={dialog.kind === 'delete'
            ? () => confirmDelete(dlgItem!)
            : dialog.kind === 'rename'
              ? (value?: string) => confirmRename(dlgItem!, value ?? '')
              : dialog.kind === 'chmod'
                ? (value?: string) => confirmChmod(dlgItem!, value ?? '')
                : dialog.kind === 'createFolder'
                  ? (value?: string) => handleCreateFolder(value ?? '')
                  : (value?: string) => handleCreateFile(value ?? '')}
          onCancel={closeDialog}
        />
        );
      })()}
    </div>
  );
};

interface DialogProps {
  kind: 'delete' | 'rename' | 'chmod' | 'createFolder' | 'createFile';
  item?: FileInfo;
  error?: string | null;
  onErrorClear?: () => void;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

const Dialog: React.FC<DialogProps> = ({ kind, item, error, onErrorClear, onConfirm, onCancel }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  useEffect(() => {
    if (kind === 'delete') {
      cancelRef.current?.focus();
    } else {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [kind]);

  const title = kind === 'delete'
    ? 'Delete file?'
    : kind === 'rename'
      ? `Rename "${item?.name}"`
      : kind === 'chmod'
        ? `Change permissions for "${item?.name}"`
        : kind === 'createFolder'
          ? 'Create Folder'
          : 'Create File';

  const message = kind === 'delete'
    ? `This will permanently remove "${item?.name}". This action cannot be undone.`
    : kind === 'rename'
      ? 'Enter a new name for this item.'
      : kind === 'chmod'
        ? 'Set new permissions in octal notation.'
        : kind === 'createFolder'
          ? 'Enter a name for the new folder.'
          : 'Enter a name for the new file.';

  const confirmLabel = kind === 'delete' ? 'Delete' : kind === 'rename' ? 'Rename' : kind === 'chmod' ? 'Apply' : 'Create';

  return (
    <div
      className={styles.dialogOverlay}
      role="presentation"
      onClick={onCancel}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        {kind === 'delete' && (
          <AlertTriangle size={24} className={styles.dialogIconDanger} aria-hidden="true" />
        )}
        <h3 id="dialog-title" className={styles.dialogTitle}>{title}</h3>
        <p id="dialog-message" className={styles.dialogMessage}>{message}</p>
        {kind !== 'delete' && (
          <input
            ref={inputRef}
            type="text"
            className={`${styles.dialogInput}${error ? ` ${styles.inputError}` : ''}`}
            defaultValue={kind === 'rename' ? item?.name : ''}
            placeholder={kind === 'chmod' ? '755' : kind === 'createFolder' ? 'Folder name' : 'File name'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'dialog-error' : undefined}
            onChange={() => onErrorClear?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm((e.target as HTMLInputElement).value);
            }}
          />
        )}
        {error && (
          <p id="dialog-error" className={styles.errorText} role="alert">
            {error}
          </p>
        )}
        {kind === 'chmod' && (
          <span className={styles.dialogHint}>Octal permissions, e.g. 755</span>
        )}
        <div className={styles.dialogActions}>
          <button ref={cancelRef} type="button" className={styles.dialogBtn} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.dialogBtn} ${kind === 'delete' ? styles.dialogBtnDanger : styles.dialogBtnPrimary}`}
            onClick={() => {
              if (kind === 'delete') {
                onConfirm();
              } else {
                onConfirm(inputRef.current?.value ?? '');
              }
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
