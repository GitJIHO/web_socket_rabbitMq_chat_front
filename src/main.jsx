// src/main.jsx
import React from 'react';  // React를 import 합니다.
import ReactDOM from 'react-dom/client';  // ReactDOM을 import 합니다.
import App from './App';  // App 컴포넌트를 불러옵니다.

const root = ReactDOM.createRoot(document.getElementById('root'));  // HTML의 root 요소를 찾습니다.
root.render(
  <React.StrictMode>
    <App />  {/* App 컴포넌트를 렌더링 합니다. */}
  </React.StrictMode>
);
