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
  onClick?: (item: FileInfo) => void;
  onDoubleClick: (item: FileInfo) => void;
  onContextMenu: (event: React.MouseEvent, item: FileInfo) => void;
  onDelete: (item: FileInfo) => void;
  isSelected?: boolean;
  isDragging?: boolean;
  isDragTarget?: boolean;
  onFileDragStart?: (item: FileInfo) => void;
  onFileDrop?: (targetFolder: FileInfo) => void;
  onFileDragEnter?: (item: FileInfo) => void;
  onFileDragLeave?: () => void;
  onFileDragEnd?: () => void;
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

const FileItem: React.FC<FileItemProps> = ({ item, onClick, onDoubleClick, onContextMenu, onDelete, isSelected, isDragging, isDragTarget, onFileDragStart, onFileDrop, onFileDragEnter, onFileDragLeave, onFileDragEnd }) => {
  const handleClick = () => {
    if (isDragging) return; // Don't navigate if dragging
    onClick?.(item);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onDoubleClick(item);
    } else if (event.key === 'Delete') {
      event.preventDefault();
      onDelete(item);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-esesha-file', JSON.stringify(item));
    onFileDragStart?.(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!item.isDir) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!item.isDir) return;
    e.preventDefault();
    e.stopPropagation();
    onFileDrop?.(item);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!item.isDir) return;
    e.preventDefault();
    onFileDragEnter?.(item);
  };

  const handleDragLeave = () => {
    if (!item.isDir) return;
    onFileDragLeave?.();
  };

  const handleDragEnd = () => {
    onFileDragEnd?.();
  };

  return (
    <div 
      className={`${styles.fileItem} ${item.isDir ? styles.directory : ''} ${isSelected ? styles.selected : ''} ${isDragging ? styles.dragging : ''} ${isDragTarget ? styles.dragTarget : ''}`}
      onClick={handleClick}
      onDoubleClick={() => onDoubleClick(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      onKeyDown={handleKeyDown}
      draggable={true}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
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
