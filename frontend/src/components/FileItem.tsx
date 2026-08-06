import React from 'react';
import { FolderIcon, FileTextIcon } from 'lucide-react';
import styles from './FileItem.module.css';

interface FileInfo {
  name: string;
  size: number;
  mode: number;
  modifiedTime: number;
  isDir: boolean;
}

interface FileItemProps {
  item: FileInfo;
  onDoubleClick: (item: FileInfo) => void;
  onContextMenu: (event: React.MouseEvent, item: FileInfo) => void;
  onDelete: (item: FileInfo) => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatPerms(mode: number): string {
  if (!mode) return '-';
  const perms = [
    (mode & 0o400) ? 'r' : '-',
    (mode & 0o200) ? 'w' : '-',
    (mode & 0o100) ? 'x' : '-',
    (mode & 0o040) ? 'r' : '-',
    (mode & 0o020) ? 'w' : '-',
    (mode & 0o010) ? 'x' : '-',
    (mode & 0o004) ? 'r' : '-',
    (mode & 0o002) ? 'w' : '-',
    (mode & 0o001) ? 'x' : '-',
  ];
  return perms.join('');
}

const FileItem: React.FC<FileItemProps> = ({ item, onDoubleClick, onContextMenu, onDelete }) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onDoubleClick(item);
    } else if (event.key === 'Delete') {
      event.preventDefault();
      onDelete(item);
    }
  };

  return (
    <div 
      className={`${styles.fileItem} ${item.isDir ? styles.directory : ''}`}
      onDoubleClick={() => onDoubleClick(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="row"
      aria-label={`${item.name}${item.isDir ? ' (directory)' : ''}`}
    >
      <span className={styles.icon}>
        {item.isDir ? (
          <FolderIcon size={18} color="#22d3ee" aria-hidden="true" />
        ) : (
          <FileTextIcon size={18} color="#64748b" aria-hidden="true" />
        )}
      </span>
      <span className={styles.name}>{item.name}</span>
      <span className={styles.size}>{item.isDir ? '-' : formatSize(item.size)}</span>
      <span className={styles.perms}>{formatPerms(item.mode)}</span>
      <span className={styles.modified}>{formatDate(item.modifiedTime)}</span>
    </div>
  );
};

export default FileItem;
