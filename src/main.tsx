import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
// TypeScript may not have CSS module declarations in this project setup.
// @ts-ignore: allow importing CSS for side effects
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
