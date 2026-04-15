import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import useThemeStore from './store/theme';

// Initialize theme
useThemeStore.getState().initTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-vault-card)',
            color: 'var(--color-vault-text)',
            border: '1px solid var(--color-vault-border)',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
