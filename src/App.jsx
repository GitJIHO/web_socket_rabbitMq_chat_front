// src/App.jsx

import React from "react";
import ChatRoom from "./ChatRoom";  // ChatRoom 컴포넌트 import

function App() {
  return (
    <div className="App">
      <h1>WebSocket 채팅</h1>
      <ChatRoom roomName="room1" />  {/* 원하는 방 이름을 props로 전달 */}
    </div>
  );
}

export default App;
