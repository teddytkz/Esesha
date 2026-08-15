import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileText,
  FolderOpen,
  RefreshCw,
} from 'lucide-react';
import styles from './UploadDialog.module.css';
import type { SFTPProgressEvent } from '../types/events';

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

const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
};

interface RemoteFileInfo {
  name: string;
  size: number;
  mode: number;
  modifiedTime: number;
  isDir: boolean;
  path: string;
}

type UploadState = 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';

interface LocalFile {
  id: string;
  file: File;
  selected: boolean;
  uploadState: UploadState;
  progress: number;
  speed: string;
  error?: string;
}

interface UploadDialogProps {
  isOpen: boolean;
  sessionId: string;
  currentRemotePath: string;
  onClose: () => void;
  onUploadComplete: () => void;
}

const UploadDialog: React.FC<UploadDialogProps> = ({
  isOpen,
  sessionId,
  currentRemotePath,
  onClose,
  onUploadComplete,
}) => {
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [remoteFiles, setRemoteFiles] = useState<RemoteFileInfo[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0); // Prevent flicker on nested elements
  const toastTimerRef = useRef<number | null>(null);
  const currentUploadingIdRef = useRef<string | null>(null);
  const cancelledRef = useRef<Set<string>>(new Set());
  const cancelAllRef = useRef(false);
  const uploadingRef = useRef(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };

  const refreshRemote = async () => {
    if (!sessionId) return;
    setRemoteLoading(true);
    setRemoteError('');
    try {
      if (window.go?.main?.App?.ListDirectory) {
        const result = await window.go.main.App.ListDirectory(sessionId, currentRemotePath);
        setRemoteFiles(result || []);
      } else {
        setRemoteError('File system API not available');
      }
    } catch (err) {
      setRemoteError(`Failed to load directory: ${err}`);
    }
    setRemoteLoading(false);
  };

  // Load remote listing + register progress listener when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    refreshRemote();

    const handleProgress = (data: SFTPProgressEvent) => {
      if (data.sessionId !== sessionId) return;
      const id = currentUploadingIdRef.current;
      if (!id || cancelledRef.current.has(id)) return;
      setLocalFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                progress: Math.round(data.percentage || 0),
                speed: formatSpeed(data.speedBytesPerSec || 0),
              }
            : f
        )
      );
    };

    window.runtime.EventsOn('sftp:progress', handleProgress);
    return () => {
      window.runtime.EventsOff('sftp:progress');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sessionId, currentRemotePath]);

  // Reset transient state each time the dialog is opened
  useEffect(() => {
    if (isOpen) {
      cancelledRef.current = new Set();
      cancelAllRef.current = false;
      currentUploadingIdRef.current = null;
      uploadingRef.current = false;
    }
  }, [isOpen]);

  // ESC to close (with confirmation if uploads active)
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (uploadingRef.current) {
          setConfirmClose(true);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const addFiles = (files: File[]) => {
    const newFiles: LocalFile[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      selected: true, // Auto-select dragged files
      uploadState: 'pending',
      progress: 0,
      speed: '',
    }));
    setLocalFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (uploading) {
      showToast('Cannot add files during upload', 'info');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const toggleSelect = (id: string) => {
    setLocalFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f))
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setLocalFiles((prev) => prev.map((f) => ({ ...f, selected: checked })));
  };

  const removeLocalFile = (id: string) => {
    setLocalFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const setFileState = (id: string, patch: Partial<LocalFile>) => {
    setLocalFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const startUpload = async () => {
    if (uploadingRef.current) return;
    const queue = localFiles.filter(
      (f) => f.selected && (f.uploadState === 'pending' || f.uploadState === 'error')
    );
    if (queue.length === 0) return;

    uploadingRef.current = true;
    setUploading(true);
    cancelAllRef.current = false;

    let completed = 0;
    let failed = 0;
    let cancelled = 0;

    for (const item of queue) {
      if (cancelAllRef.current || cancelledRef.current.has(item.id)) {
        setFileState(item.id, { uploadState: 'cancelled' });
        cancelled++;
        continue;
      }

      currentUploadingIdRef.current = item.id;
      setFileState(item.id, { uploadState: 'uploading', progress: 0, speed: '', error: undefined });

      const remotePath =
        currentRemotePath === '/'
          ? `/${item.file.name}`
          : `${currentRemotePath}/${item.file.name}`;

      try {
        const base64 = await fileToBase64(item.file);
        await window.go.main.App.UploadFileData(sessionId, remotePath, base64);

        if (cancelledRef.current.has(item.id)) {
          setFileState(item.id, { uploadState: 'cancelled' });
          cancelled++;
        } else {
          setFileState(item.id, { uploadState: 'completed', progress: 100, speed: '' });
          completed++;
          await refreshRemote();
        }
      } catch (err) {
        if (cancelledRef.current.has(item.id)) {
          setFileState(item.id, { uploadState: 'cancelled' });
          cancelled++;
        } else {
          setFileState(item.id, {
            uploadState: 'error',
            error: err instanceof Error ? err.message : String(err),
          });
          failed++;
          showToast(`Upload failed: ${item.file.name}`, 'error');
        }
      }
    }

    currentUploadingIdRef.current = null;
    uploadingRef.current = false;
    setUploading(false);

    if (completed > 0) onUploadComplete();

    if (cancelAllRef.current || cancelled > 0) {
      showToast(
        `${completed} uploaded, ${failed} failed, ${cancelled} cancelled`,
        failed > 0 ? 'error' : 'info'
      );
    } else if (failed > 0) {
      showToast(`${completed} uploaded, ${failed} failed`, 'error');
    } else {
      showToast(`${completed} file${completed === 1 ? '' : 's'} uploaded successfully`, 'success');
    }
  };

  const cancelFile = (id: string) => {
    cancelledRef.current.add(id);
    setFileState(id, { uploadState: 'cancelled', speed: '' });
  };

  const cancelAll = () => {
    cancelAllRef.current = true;
    localFiles.forEach((f) => {
      if (f.uploadState === 'pending' || f.uploadState === 'uploading' || f.uploadState === 'error') {
        cancelledRef.current.add(f.id);
      }
    });
    setLocalFiles((prev) =>
      prev.map((f) =>
        f.uploadState === 'pending' || f.uploadState === 'uploading' || f.uploadState === 'error'
          ? { ...f, uploadState: 'cancelled', speed: '' }
          : f
      )
    );
  };

  const requestClose = () => {
    if (uploadingRef.current) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  const selectedCount = localFiles.filter((f) => f.selected).length;
  const queueableCount = localFiles.filter(
    (f) => f.selected && (f.uploadState === 'pending' || f.uploadState === 'error')
  ).length;

  const completedCount = localFiles.filter((f) => f.uploadState === 'completed').length;
  const totalSelectedBytes = localFiles
    .filter((f) => f.selected)
    .reduce((sum, f) => sum + f.file.size, 0);
  const uploadedBytes = localFiles
    .filter((f) => f.uploadState === 'completed')
    .reduce((sum, f) => sum + f.file.size, 0);
  const overallProgress =
    selectedCount > 0 ? Math.round((completedCount / selectedCount) * 100) : 0;

  const remoteTotalBytes = remoteFiles.reduce((sum, f) => sum + f.size, 0);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Upload files"
      onClick={requestClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <Upload size={18} className={styles.titleIcon} aria-hidden="true" />
            <div>
              <h2 className={styles.title}>Upload Files</h2>
              <span className={styles.path} title={currentRemotePath}>
                to {currentRemotePath}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={requestClose}
            aria-label="Close upload dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.splitPane}>
          {/* Local pane */}
          <section
            className={`${styles.pane} ${styles.localPane} ${isDragging ? styles.dropping : ''}`}
            aria-label="Local files"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className={styles.paneHeader}>
              <label className={styles.selectAll}>
                <input
                  type="checkbox"
                  checked={selectedCount > 0 && selectedCount === localFiles.length}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedCount > 0 && selectedCount < localFiles.length;
                  }}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  disabled={localFiles.length === 0}
                  aria-label="Select all files"
                />
                <span>Select All</span>
              </label>
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload size={14} aria-hidden="true" />
                Add Files
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />

            <div className={styles.fileList}>
              {localFiles.length === 0 ? (
                <div className={styles.empty}>
                  <FolderOpen size={32} strokeWidth={1.5} aria-hidden="true" />
                  <p>No files selected</p>
                  <span>Drag files here or click "Add Files"</span>
                </div>
              ) : (
                localFiles.map((f) => (
                  <div
                    key={f.id}
                    className={`${styles.localItem} ${
                      f.uploadState === 'error' ? styles.itemError : ''
                    } ${f.uploadState === 'completed' ? styles.itemDone : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.itemCheckbox}
                      checked={f.selected}
                      onChange={() => toggleSelect(f.id)}
                      disabled={uploading && f.uploadState !== 'pending'}
                      aria-label={`Select ${f.file.name}`}
                    />
                    <FileText size={16} className={styles.fileIcon} aria-hidden="true" />
                    <div className={styles.itemBody}>
                      <div className={styles.itemTop}>
                        <span className={styles.itemName} title={f.file.name}>
                          {f.file.name}
                        </span>
                        <span className={styles.itemSize}>{formatBytes(f.file.size)}</span>
                      </div>

                      {f.uploadState === 'uploading' && (
                        <div className={styles.progressRow}>
                          <div className={styles.progressTrack}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${f.progress}%` }}
                            />
                          </div>
                          <span className={styles.progressPct}>{f.progress}%</span>
                          <span className={styles.progressSpeed}>{f.speed}</span>
                        </div>
                      )}

                      {f.uploadState === 'pending' && (
                        <span className={styles.statusPending}>Pending</span>
                      )}
                      {f.uploadState === 'completed' && (
                        <span className={styles.statusDone}>
                          <CheckCircle2 size={13} aria-hidden="true" /> Completed
                        </span>
                      )}
                      {f.uploadState === 'cancelled' && (
                        <span className={styles.statusCancelled}>Cancelled</span>
                      )}
                      {f.uploadState === 'error' && (
                        <span className={styles.statusError} title={f.error}>
                          <AlertTriangle size={13} aria-hidden="true" /> {f.error || 'Failed'}
                        </span>
                      )}
                    </div>

                    {f.uploadState === 'uploading' ? (
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => cancelFile(f.id)}
                        aria-label={`Cancel upload of ${f.file.name}`}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeLocalFile(f.id)}
                        disabled={uploading}
                        aria-label={`Remove ${f.file.name}`}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Remote pane */}
          <section className={styles.pane} aria-label="Remote files">
            <div className={styles.paneHeader}>
              <span className={styles.paneTitle}>Remote Files</span>
              <button
                type="button"
                className={styles.refreshBtn}
                onClick={refreshRemote}
                disabled={remoteLoading}
                aria-label="Refresh remote directory"
              >
                <RefreshCw size={14} aria-hidden="true" className={remoteLoading ? styles.spin : ''} />
              </button>
            </div>
            <div className={styles.remotePath} title={currentRemotePath}>
              {currentRemotePath}
            </div>

            <div className={styles.fileList}>
              {remoteLoading ? (
                <div className={styles.empty}>
                  <div className={styles.spinner} aria-label="Loading remote files" />
                  <span>Loading…</span>
                </div>
              ) : remoteError ? (
                <div className={styles.remoteError} role="alert">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span>{remoteError}</span>
                </div>
              ) : remoteFiles.length === 0 ? (
                <div className={styles.empty}>
                  <FolderOpen size={32} strokeWidth={1.5} aria-hidden="true" />
                  <p>Empty directory</p>
                </div>
              ) : (
                remoteFiles.map((rf) => (
                  <div key={rf.path || rf.name} className={styles.remoteItem}>
                    {rf.isDir ? (
                      <FolderOpen size={16} className={styles.dirIcon} aria-hidden="true" />
                    ) : (
                      <FileText size={16} className={styles.fileIcon} aria-hidden="true" />
                    )}
                    <span className={styles.itemName} title={rf.name}>
                      {rf.name}
                    </span>
                    <span className={styles.itemSize}>{formatBytes(rf.size)}</span>
                  </div>
                ))
              )}
            </div>

            <div className={styles.remoteSummary}>
              {remoteFiles.length} item{remoteFiles.length === 1 ? '' : 's'} ·{' '}
              {formatBytes(remoteTotalBytes)}
            </div>
          </section>
        </div>

        {/* Bottom bar */}
        <div className={styles.bottomBar}>
          <div className={styles.overall}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${overallProgress}%` }} />
            </div>
            <span className={styles.overallText}>
              {completedCount} / {selectedCount} files ({formatBytes(uploadedBytes)} /{' '}
              {formatBytes(totalSelectedBytes)})
            </span>
          </div>
          <div className={styles.bottomActions}>
            <button
              type="button"
              className={styles.btnCancelAll}
              onClick={cancelAll}
              disabled={!uploading}
            >
              Cancel All
            </button>
            <button
              type="button"
              className={styles.btnUpload}
              onClick={startUpload}
              disabled={queueableCount === 0 || uploading}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
      </div>

      {confirmClose && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmClose(false)}>
          <div className={styles.confirm} onClick={(e) => e.stopPropagation()} role="alertdialog">
            <h3 className={styles.confirmTitle}>Uploads in progress</h3>
            <p className={styles.confirmMsg}>
              Cancel all uploads and close? In-progress uploads will finish.
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.dialogBtn}
                onClick={() => setConfirmClose(false)}
              >
                Keep Uploading
              </button>
              <button
                type="button"
                className={styles.dialogBtnDanger}
                onClick={() => {
                  cancelAll();
                  setConfirmClose(false);
                  onClose();
                }}
              >
                Cancel & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}
          role="status"
        >
          {toast.type === 'success' && <CheckCircle2 size={16} aria-hidden="true" />}
          {toast.type === 'error' && <AlertTriangle size={16} aria-hidden="true" />}
          {toast.type === 'info' && <Info size={16} aria-hidden="true" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default UploadDialog;
