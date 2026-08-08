import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import FayeOverlay from './pages/FayePage.tsx';

const isOverlay = new URLSearchParams(window.location.search).get('overlay') === '1'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isOverlay ? <FayeOverlay /> : <App />}
  </React.StrictMode>
);
