
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Инициализация VK Bridge для мини-приложений ВК
if (typeof window !== 'undefined' && (window as any).vkBridge) {
  (window as any).vkBridge.send('VKWebAppInit')
    .then(() => console.log('VK Bridge Initialized'))
    .catch((err: any) => console.error('VK Bridge Init Error', err));
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
