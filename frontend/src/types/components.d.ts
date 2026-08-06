import { models } from '@wailsjs/go/models';
import { sftp } from '@wailsjs/go/models';

export interface AppProps {
  // Root component, no props
}

export interface TerminalProps {
  sessionId: string;
  connectionName: string;
  onClose: () => void;
}

export interface FileExplorerProps {
  sessionId: string;
  connectionName: string;
}

export interface FileItemProps {
  file: sftp.FileInfo;
  sessionId: string;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}

export interface ConnectionFormData {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  privateKeyPath: string;
}

export interface SessionState {
  sessionId: string;
  connectionId: number;
  connectionName: string;
  activeView: 'terminal' | 'files';
}
