import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.createElement('div');
rootElement.id = 'root';
document.body.replaceChildren(rootElement);

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
