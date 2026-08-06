import React, { useState } from 'react';
import { X, Key } from 'lucide-react';
import styles from './PassphraseDialog.module.css';

interface PassphraseDialogProps {
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
  connectionName: string;
}

const PassphraseDialog: React.FC<PassphraseDialogProps> = ({ onSubmit, onCancel, connectionName }) => {
  const [passphrase, setPassphrase] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(passphrase);
  };

  return (
    <div 
      className={styles.overlay} 
      onClick={onCancel}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="passphrase-title"
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.accent} />
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Key size={20} aria-hidden="true" />
          </div>
          <div>
            <h3 id="passphrase-title">Private Key Passphrase</h3>
            <p className={styles.subtitle}>{connectionName}</p>
          </div>
          <button 
            type="button" 
            className={styles.btnClose} 
            onClick={onCancel}
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <p className={styles.message}>
              This private key is encrypted. Please enter the passphrase to decrypt it.
            </p>
            <div className={styles.formGroup}>
              <label htmlFor="passphrase-input">Passphrase</label>
              <input
                id="passphrase-input"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter passphrase"
                autoFocus
              />
            </div>
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.btnCancel} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.btnSubmit}>
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PassphraseDialog;
