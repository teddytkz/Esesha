import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import styles from './Terminal.module.css';

interface TerminalProps {
  connectionId: number;
  onConnect: (sessionId: string) => void;
  onDisconnect: (sessionId: string) => void;
}

const Terminal = React.forwardRef<{ disconnect: () => void; clear: () => void }, TerminalProps>(
  ({ connectionId, onConnect, onDisconnect }, ref) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const isConnected = useRef(false);
    const onConnectRef = useRef(onConnect);
    const onDisconnectRef = useRef(onDisconnect);

    // Keep latest callbacks without re-running xterm setup
    useEffect(() => {
      onConnectRef.current = onConnect;
      onDisconnectRef.current = onDisconnect;
    }, [onConnect, onDisconnect]);

    React.useImperativeHandle(ref, () => ({
      disconnect: () => {
        if (isConnected.current && sessionIdRef.current && window.go?.main?.App?.DisconnectSSH) {
          window.go.main.App.DisconnectSSH(sessionIdRef.current);
          isConnected.current = false;
        }
      },
      clear: () => {
        if (xtermRef.current) {
          xtermRef.current.clear();
        }
      }
    }));

    // Mount-only: create xterm, addons, and event listeners once
    useEffect(() => {
      if (!terminalRef.current) return;

      const terminal = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        theme: {
          background: '#0a0e1a',
          foreground: '#e2e8f0',
          cursor: '#22d3ee',
          cursorAccent: '#0a0e1a',
          selectionBackground: 'rgba(34, 211, 238, 0.25)',
          black: '#0f1524',
          red: '#f87171',
          green: '#34d399',
          yellow: '#fbbf24',
          blue: '#60a5fa',
          magenta: '#8b5cf6',
          cyan: '#22d3ee',
          white: '#e2e8f0',
          brightBlack: '#64748b',
          brightRed: '#f87171',
          brightGreen: '#6ee7b7',
          brightYellow: '#fde68a',
          brightBlue: '#93c5fd',
          brightMagenta: '#a78bfa',
          brightCyan: '#67e8f9',
          brightWhite: '#ffffff'
        }
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddon());

      terminal.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;

      terminal.onData(data => {
        if (isConnected.current && sessionIdRef.current && window.go?.main?.App?.SendInput) {
          window.go.main.App.SendInput(sessionIdRef.current, data);
        }
      });

      const handleResize = () => {
        if (fitAddonRef.current && xtermRef.current) {
          fitAddonRef.current.fit();
          if (isConnected.current && sessionIdRef.current && window.go?.main?.App?.ResizeTerminal) {
            window.go.main.App.ResizeTerminal(
              sessionIdRef.current, 
              xtermRef.current.cols, 
              xtermRef.current.rows
            );
          }
        }
      };

      const handleOutput = (data: { sessionId: string; data: string }) => {
        if (data.sessionId === sessionIdRef.current && xtermRef.current) {
          xtermRef.current.write(data.data);
        }
      };

      const handleError = (data: { sessionId: string; error: string }) => {
        if (data.sessionId === sessionIdRef.current && xtermRef.current) {
          xtermRef.current.write(`\r\n\x1b[31mError: ${data.error}\x1b[0m\r\n`);
        }
      };

      const handleDisconnected = (data: { sessionId: string }) => {
        if (data.sessionId === sessionIdRef.current) {
          isConnected.current = false;
          if (xtermRef.current) {
            xtermRef.current.writeln('\r\n[Connection closed]');
          }
          const sid = sessionIdRef.current;
          sessionIdRef.current = null;
          if (sid) {
            onDisconnectRef.current(sid);
          }
        }
      };

      window.addEventListener('resize', handleResize);
      window.runtime.EventsOn('ssh:output', handleOutput);
      window.runtime.EventsOn('ssh:error', handleError);
      window.runtime.EventsOn('ssh:closed', handleDisconnected);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.runtime.EventsOff('ssh:output');
        window.runtime.EventsOff('ssh:error');
        window.runtime.EventsOff('ssh:closed');
        xtermRef.current?.dispose();
        xtermRef.current = null;
        sessionIdRef.current = null;
        isConnected.current = false;
      };
    }, []);

    // Connection-only: connect when the selected connection changes
    useEffect(() => {
      if (!connectionId || !xtermRef.current) return;

      let cancelled = false;
      const connect = async () => {
        try {
          if (window.go?.main?.App?.ConnectSSH && xtermRef.current) {
            const sid = await window.go.main.App.ConnectSSH(
              connectionId, 
              xtermRef.current.cols, 
              xtermRef.current.rows
            );
            if (cancelled) {
              // Unmounted during connect — dispose our own session, never touch dead xterm
              if (window.go?.main?.App?.DisconnectSSH) {
                window.go.main.App.DisconnectSSH(sid);
              }
              return;
            }
            sessionIdRef.current = sid;
            isConnected.current = true;
            xtermRef.current.focus();
            onConnectRef.current(sid);
          }
        } catch (err) {
          if (!cancelled && xtermRef.current) {
            xtermRef.current.writeln(`\r\nConnection failed: ${err}`);
          }
        }
      };

      connect();
      return () => { cancelled = true; };
    }, [connectionId]);

    return (
      <div className={styles.terminalContainer}>
        <div ref={terminalRef} className={styles.terminal}></div>
      </div>
    );
  }
);

Terminal.displayName = 'Terminal';

export default Terminal;
