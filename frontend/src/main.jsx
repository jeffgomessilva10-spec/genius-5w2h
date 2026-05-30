import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Captura erros globais e exibe na tela para diagnóstico
window.addEventListener('error', (e) => {
  document.getElementById('root').innerHTML =
    `<div style="padding:20px;font-family:monospace;color:red;background:#fff;white-space:pre-wrap">
    <strong>ERRO:</strong> ${e.message}
    <br/><br/>
    ${e.filename}:${e.lineno}
    <br/><br/>
    ${e.error?.stack || ''}
    </div>`;
});

window.addEventListener('unhandledrejection', (e) => {
  document.getElementById('root').innerHTML =
    `<div style="padding:20px;font-family:monospace;color:red;background:#fff;white-space:pre-wrap">
    <strong>PROMISE ERROR:</strong> ${e.reason?.message || e.reason}
    <br/><br/>
    ${e.reason?.stack || ''}
    </div>`;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
