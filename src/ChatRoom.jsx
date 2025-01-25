import React, { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import './ChatRoom.css';

const BASE_API_URL = "http://algo.knu-soft.site";
const BASE_WS_URL = "ws://algo.knu-soft.site";

const ChatRoom = () => {
  const [roomName, setRoomName] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState(""); // 사용자 이름 설정
  const [tempUsername, setTempUsername] = useState(""); // 임시 이름 입력 상태
  const [stompClient, setStompClient] = useState(null);
  const [rooms, setRooms] = useState([]);

  const messagesEndRef = useRef(null);

  const createRoom = async () => {
    if (!newRoomName) {
      alert("채팅방 이름을 입력해주세요.");
      return;
    }

    try {
      const response = await fetch(`${BASE_API_URL}/api/v1/chat/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomName: newRoomName }),
      });

      if (response.ok) {
        alert("채팅방이 생성되었습니다.");
        fetchRooms();
        setNewRoomName("");
      } else {
        alert("채팅방 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("채팅방 생성 중 오류 발생", error);
      alert("채팅방 생성 중 오류가 발생했습니다.");
    }
  };

  const connectToChatRoom = () => {
    if (!roomName) return;

    if (stompClient) {
      stompClient.deactivate();
    }

    const client = new Client({
      brokerURL: `${BASE_WS_URL}/api/ws`,
      debug: (str) => console.log(str),
      onConnect: () => {
        console.log("Connected to WebSocket");
        client.subscribe(`/topic/${roomName}`, (messageOutput) => {
          const message = JSON.parse(messageOutput.body);
          setMessages((prevMessages) => [...prevMessages, message]);
        });

        client.publish({
          destination: `/api/app/chat/setName/${roomName}`,
          body: JSON.stringify({ userName: username }),
        });
      },
      onStompError: (frame) => {
        console.error(`STOMP error: ${frame}`);
      },
    });

    client.activate();
    setStompClient(client);
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${BASE_API_URL}/api/v1/chat/rooms`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      } else {
        alert("채팅방 목록을 가져오는 데 실패했습니다.");
      }
    } catch (error) {
      console.error("채팅방 목록 조회 중 오류 발생", error);
      alert("채팅방 목록 조회 중 오류가 발생했습니다.");
    }
  };

  const fetchRecentMessages = async (roomName) => {
    try {
      const encodedRoomName = encodeURIComponent(roomName);
      const response = await fetch(`${BASE_API_URL}/api/v1/chat/messages/${encodedRoomName}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.reverse());
      } else {
        console.error("최근 메시지 가져오기 실패");
      }
    } catch (error) {
      console.error("Error fetching recent messages:", error);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [stompClient]);

  useEffect(() => {
    if (roomName) {
      fetchRecentMessages(roomName);
      connectToChatRoom();
    }
  }, [roomName]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!stompClient || !stompClient.connected) {
      console.log("WebSocket 연결이 아직 활성화되지 않았습니다.");
      return;
    }

    if (newMessage.trim()) {
      const messageRequest = {
        sender: username,
        content: newMessage,
        roomName,
      };

      stompClient.publish({
        destination: `/api/app/chat/${roomName}`,
        body: JSON.stringify(messageRequest),
      });

      setNewMessage("");
    }
  };

  const handleSetUsername = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername);
      alert("이름이 설정되었습니다.");
    } else {
      alert("이름을 입력해주세요.");
    }
  };

  if (!username) {
    return (
      <div className="username-container">
        <h3>사용자 이름 설정</h3>
        <input
          type="text"
          placeholder="이름을 입력하세요"
          value={tempUsername}
          onChange={(e) => setTempUsername(e.target.value)}
        />
        <button onClick={handleSetUsername}>등록</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div>
        <input
          type="text"
          placeholder="채팅방 이름"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
        />
        <button onClick={createRoom}>채팅방 생성</button>
      </div>

      <h3>채팅방 목록</h3>
      <div>
        {rooms.length === 0 ? (
          <p>생성된 채팅방이 없습니다.</p>
        ) : (
          rooms.map((room, index) => (
            <button
              key={index}
              onClick={() => {
                setRoomName(room.roomName);
                setMessages([]);
              }}
            >
              {room.roomName}
            </button>
          ))
        )}
      </div>

      {roomName && (
        <div>
          <h3>채팅방: {roomName}</h3>
          <div className="messages-container">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${
                  message.sender === username ? "my-message" : "other-message"
                }`}
              >
                <strong>{message.sender}:</strong> {message.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="메시지를 입력하세요"
            />
            <button onClick={handleSendMessage}>전송</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
