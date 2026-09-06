import React from 'react';
import ReactDOM from 'react-dom/client';
import LZString from 'lz-string';
import App from './App.jsx';
import './index.css';

window.LZString = LZString;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
