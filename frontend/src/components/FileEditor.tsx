import React, { useEffect, useRef, useState } from 'react';
import { X, Save, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import styles from './FileEditor.module.css';

interface FileEditorProps {
  sessionId: string;
  remotePath: string;
  onClose: () => void;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

const FileEditor: React.FC<FileEditorProps> = ({ sessionId, remotePath, onClose }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);

  const filename = remotePath.split('/').filter(Boolean).pop() || remotePath;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b64 = await window.go.main.App.ReadFile(sessionId, remotePath);
        if (cancelled) return;
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        setContent(new TextDecoder('utf-8').decode(bytes));
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(`Failed to read file: ${err}`);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, remotePath]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setDirty(true);
    dirtyRef.current = true;
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const bytes = new TextEncoder().encode(content);
      let binary = '';
      for (const b of bytes) binary += String.fromCharCode(b);
      const b64 = btoa(binary);
      await window.go.main.App.WriteFile(sessionId, remotePath, b64);
      setDirty(false);
      dirtyRef.current = false;
      showToast(`Saved ${filename}`, 'success');
    } catch (err) {
      setError(`Save failed: ${err}`);
      showToast(`Save failed: ${err}`, 'error');
    }
    setSaving(false);
  };

  const requestClose = () => {
    if (dirtyRef.current) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Editing ${filename}`}>
      <div className={styles.editor}>
        <div className={styles.header}>
          <span className={styles.title} title={remotePath}>{filename}</span>
          <span className={styles.path}>{remotePath}</span>
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={save} disabled={loading || saving || !dirty} aria-label="Save">
              <Save size={16} aria-hidden="true" />
              Save
            </button>
            <button type="button" className={styles.btnClose} onClick={requestClose} aria-label="Close editor">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.status}>Loading {filename}...</div>
          ) : error ? (
            <div className={styles.error} role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{error}</span>
              <button type="button" className={styles.btn} onClick={onClose}>Close</button>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={content}
              onChange={handleChange}
              spellCheck={false}
              aria-label="File content"
            />
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerInfo}>
            {dirty ? 'Unsaved changes' : 'Saved'}
          </span>
          <span className={styles.footerHint}>Ctrl+S to save</span>
        </div>
      </div>

      {confirmClose && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmClose(false)}>
          <div className={styles.confirm} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Discard changes?</h3>
            <p className={styles.confirmMsg}>You have unsaved changes in {filename}.</p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.btn} onClick={() => setConfirmClose(false)}>Cancel</button>
              <button type="button" className={styles.btnDanger} onClick={onClose}>Discard</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`} role="status">
          {toast.type === 'success' && <CheckCircle2 size={16} aria-hidden="true" />}
          {toast.type === 'error' && <AlertTriangle size={16} aria-hidden="true" />}
          {toast.type === 'info' && <Info size={16} aria-hidden="true" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default FileEditor;