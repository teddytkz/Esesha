import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, FileKey, KeyRound, Save, CheckCircle2, Loader2, FolderOpen } from 'lucide-react';
import { SelectPrivateKeyFile, ConvertPPKToPEM, SelectPEMOutputFile } from '@wailsjs/go/main/App';
import styles from './PPKConverterDialog.module.css';

interface PPKConverterDialogProps {
  onClose: () => void;
  onConverted?: (encryptedContent: number[]) => void;
}

type Status = { kind: 'idle' } | { kind: 'success'; message: string } | { kind: 'error'; message: string };

const suggestPemName = (ppkPath: string): string => {
  const base = ppkPath.replace(/\\/g, '/').split('/').pop() || 'key.ppk';
  return base.replace(/\.ppk$/i, '') + '.pem';
};

const PPKConverterDialog: React.FC<PPKConverterDialogProps> = ({ onClose, onConverted }) => {
  const [ppkPath, setPpkPath] = useState('');
  const [pemPath, setPemPath] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [converting, setConverting] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const successTimer = useRef<number | null>(null);

  const canConvert = !!ppkPath && !!pemPath && !converting;

  useEffect(() => {
    firstFieldRef.current?.focus();
    return () => {
      if (successTimer.current) window.clearTimeout(successTimer.current);
    };
  }, []);

  // Focus trap + Escape handling
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  const selectSource = async () => {
    try {
      const result = await SelectPrivateKeyFile();
      const path = result?.path;
      if (path) {
        setPpkPath(path);
        setStatus({ kind: 'idle' });
        if (!pemPath) {
          const dir = path.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
          setPemPath(dir ? `${dir}/${suggestPemName(path)}` : suggestPemName(path));
        }
      }
    } catch (err) {
      setStatus({ kind: 'error', message: `Failed to select file: ${err}` });
    }
  };

  const selectDestination = async () => {
    try {
      const path = await SelectPEMOutputFile(ppkPath ? suggestPemName(ppkPath) : 'converted.pem');
      if (path) {
        setPemPath(path);
        setStatus({ kind: 'idle' });
      }
    } catch (err) {
      setStatus({ kind: 'error', message: `Failed to select destination: ${err}` });
    }
  };

  const convert = async () => {
    if (!canConvert) return;
    setConverting(true);
    setStatus({ kind: 'idle' });
    try {
      // ConvertPPKToPEM now returns the DPAPI-encrypted PEM content (Go []byte as number[])
      const encrypted = await ConvertPPKToPEM(ppkPath, pemPath, passphrase);
      onConverted?.(encrypted);
      setStatus({ kind: 'success', message: '🔒 Key converted and stored securely' });
      successTimer.current = window.setTimeout(() => onClose(), 2000);
    } catch (err) {
      setStatus({ kind: 'error', message: `Conversion failed: ${err}` });
    } finally {
      setConverting(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ppk-title"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.accent} />
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FileKey size={20} aria-hidden="true" />
          </div>
          <div>
            <h3 id="ppk-title">PPK to PEM Converter</h3>
            <p className={styles.subtitle}>Convert PuTTY keys to OpenSSH format</p>
          </div>
          <button
            type="button"
            className={styles.btnClose}
            onClick={onClose}
            aria-label="Close dialog"
            disabled={converting}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.steps} aria-hidden="true">
          <span className={`${styles.stepDot} ${ppkPath ? styles.stepDone : ''}`}>1</span>
          <span className={styles.stepLine} />
          <span className={`${styles.stepDot} ${ppkPath ? styles.stepDone : ''}`}>2</span>
          <span className={styles.stepLine} />
          <span className={`${styles.stepDot} ${pemPath ? styles.stepDone : ''}`}>3</span>
        </div>

        <div className={styles.body}>
          <section className={styles.step}>
            <label className={styles.stepLabel}>Step 1 · Source PPK file</label>
            <div className={styles.fileRow}>
              <button
                type="button"
                ref={firstFieldRef}
                className={styles.btnBrowse}
                onClick={selectSource}
                disabled={converting}
                aria-label="Select source PPK file"
              >
                <FolderOpen size={16} aria-hidden="true" />
                Select PPK File
              </button>
              {ppkPath && <span className={styles.path} title={ppkPath}>{ppkPath}</span>}
            </div>
          </section>

          <section className={styles.step}>
            <label className={styles.stepLabel} htmlFor="ppk-passphrase">
              Step 2 · Passphrase <span className={styles.optional}>(optional)</span>
            </label>
            <div className={styles.inputWrap}>
              <KeyRound size={16} className={styles.inputIcon} aria-hidden="true" />
              <input
                id="ppk-passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Leave blank if unencrypted"
                disabled={converting}
                autoComplete="off"
              />
            </div>
          </section>

          <section className={styles.step}>
            <label className={styles.stepLabel}>Step 3 · Destination PEM file</label>
            <div className={styles.fileRow}>
              <button
                type="button"
                className={styles.btnBrowse}
                onClick={selectDestination}
                disabled={converting}
                aria-label="Select destination PEM file"
              >
                <Save size={16} aria-hidden="true" />
                Select Output
              </button>
              {pemPath && <span className={styles.path} title={pemPath}>{pemPath}</span>}
            </div>
          </section>

          {status.kind === 'success' && (
            <div className={`${styles.message} ${styles.success}`} role="status">
              <CheckCircle2 size={16} aria-hidden="true" />
              {status.message}
            </div>
          )}
          {status.kind === 'error' && (
            <div className={`${styles.message} ${styles.error}`} role="alert">
              {status.message}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={converting}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnConvert}
            onClick={convert}
            disabled={!canConvert}
            aria-label="Convert PPK to PEM"
          >
            {converting && <Loader2 size={16} className={styles.spin} aria-hidden="true" />}
            {converting ? 'Converting…' : 'Convert'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PPKConverterDialog;
