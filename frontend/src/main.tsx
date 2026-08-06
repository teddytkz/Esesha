import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/components/App';
import '@/styles/global.css';

const root = document.getElementById('app');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
