export type SSHOutputEvent = {
  sessionId: string;
  data: string;
};

export type SSHErrorEvent = {
  sessionId: string;
  error: string;
};

export type SSHClosedEvent = {
  sessionId: string;
  message: string;
};

export type SFTPProgressEvent = {
  sessionId: string;
  fileName: string;
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
};

export type EditorSavedEvent = {
  sessionId: string;
  remotePath: string;
  success: boolean;
};

export type EditorErrorEvent = {
  sessionId: string;
  remotePath: string;
  error: string;
};

export type EventCallback<T> = (data: T) => void;

declare global {
  interface Window {
    runtime: {
      EventsOn<T = any>(eventName: string, callback: EventCallback<T>): void;
      EventsOff(eventName: string): void;
      EventsEmit(eventName: string, ...args: any[]): void;
    };
  }
}

export {};
