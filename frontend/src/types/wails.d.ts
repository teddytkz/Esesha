import { models } from '@wailsjs/go/models';
import { sftp } from '@wailsjs/go/models';

declare global {
  interface Window {
    go: {
      main: {
        App: {
          ChangePermissions(sessionId: string, path: string, mode: number): Promise<void>;
          ConnectSSH(connectionId: number, cols: number, rows: number): Promise<string>;
          ConnectSSHWithPassphrase(connectionId: number, passphrase: string, cols: number, rows: number): Promise<string>;
          CreateConnection(name: string, host: string, port: number, username: string, password: string, privateKeyPath: string): Promise<number>;
          CreateDirectory(sessionId: string, path: string): Promise<void>;
          DeleteConnection(id: number): Promise<void>;
          DeletePath(sessionId: string, path: string): Promise<void>;
          DisconnectSSH(sessionId: string): Promise<void>;
          DownloadFile(sessionId: string, remotePath: string, localPath: string): Promise<void>;
          DownloadFileToDialog(sessionId: string, remotePath: string): Promise<void>;
          EditFile(sessionId: string, remotePath: string): Promise<void>;
          GetActiveSessions(): Promise<number>;
          GetConnection(id: number): Promise<models.Connection>;
          GetDecryptedPassword(connectionId: number): Promise<string>;
          ListConnections(): Promise<models.Connection[]>;
          PingConnection(connectionId: number): Promise<number>;
          ListDirectory(sessionId: string, path: string): Promise<sftp.FileInfo[]>;
          ReadFile(sessionId: string, remotePath: string): Promise<string>;
          RenamePath(sessionId: string, oldPath: string, newPath: string): Promise<void>;
          ResizeTerminal(sessionId: string, cols: number, rows: number): Promise<void>;
          SendInput(sessionId: string, input: string): Promise<void>;
          UpdateConnection(id: number, name: string, host: string, port: number, username: string, password: string, privateKeyPath: string): Promise<void>;
          UploadFile(sessionId: string, localPath: string, remotePath: string): Promise<void>;
          UploadFileData(sessionId: string, fileName: string, remotePath: string): Promise<void>;
          WriteFile(sessionId: string, remotePath: string, base64Data: string): Promise<void>;
        };
      };
    };
  }
}

export {};
