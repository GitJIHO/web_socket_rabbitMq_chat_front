import React, { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import './ChatRoom.css';

const BASE_API_URL = "http://algo.knu-soft.site"; // REST API 기본 URL
const BASE_WS_URL = "ws://algo.knu-soft.site"; // WebSocket 기본 URL

const ChatRoom = () => {
  const [roomName, setRoomName] = useState(""); // 현재 접속 중인 채팅방 이름
  const [newRoomName, setNewRoomName] = useState(""); // 새 채팅방 이름 입력 상태
  const [messages, setMessages] = useState([]); // 채팅 메시지 리스트
  const [newMessage, setNewMessage] = useState(""); // 새로 작성 중인 메시지 상태
  const [username, setUsername] = useState(""); // 사용자 이름
  const [tempUsername, setTempUsername] = useState(""); // 사용자 이름 입력 상태
  const [stompClient, setStompClient] = useState(null); // WebSocket 연결 객체
  const [rooms, setRooms] = useState([]); // 채팅방 목록
  const [usersInRooms, setUsersInRooms] = useState([]); // 채팅방 사용자 목록

  const messagesEndRef = useRef(null); // 채팅 메시지 스크롤 조작을 위한 Ref

  // 새 채팅방 생성 요청
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
        fetchRooms(); // 채팅방 목록 새로고침
        setNewRoomName(""); // 입력 필드 초기화
      } else {
        alert("채팅방 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("채팅방 생성 중 오류 발생", error);
      alert("채팅방 생성 중 오류가 발생했습니다.");
    }
  };

  // WebSocket 연결 설정 및 사용자 이름 등록
  const connectToWebSocket = () => {
    if (stompClient) {
      stompClient.deactivate(); // 기존 WebSocket 연결 종료
    }

    const client = new Client({
      brokerURL: `${BASE_WS_URL}/api/ws`,
      debug: (str) => console.log(str),
      onConnect: () => {
        console.log("WebSocket에 연결되었습니다.");

        // 사용자 목록 주제 구독
        client.subscribe("/topic/users", (messageOutput) => {
          const userList = JSON.parse(messageOutput.body);
          setUsersInRooms(userList);
        });

        // 사용자 입장 상태 전송 (미접속 상태)
        client.publish({
          destination: "/api/app/chat/join",
          body: JSON.stringify({ userName: username, roomName: "채팅방 미접속" }),
        });
      },
      onStompError: (frame) => {
        console.error(`STOMP 오류: ${frame}`);
      },
    });

    client.activate();
    setStompClient(client); // WebSocket 클라이언트 상태 업데이트
  };

  // 특정 채팅방에 연결
  const connectToChatRoom = () => {
    if (!roomName || !username) return;

    if (stompClient) {
      stompClient.deactivate(); // 기존 연결 종료
    }

    const client = new Client({
      brokerURL: `${BASE_WS_URL}/api/ws`,
      debug: (str) => console.log(str),
      onConnect: () => {
        console.log(`${roomName} 채팅방에 연결되었습니다.`);

        // 채팅방 메시지 구독
        client.subscribe(`/topic/${roomName}`, (messageOutput) => {
          const message = JSON.parse(messageOutput.body);
          setMessages((prevMessages) => [...prevMessages, message]);
        });

        // 사용자 목록 구독
        client.subscribe("/topic/users", (messageOutput) => {
          const userList = JSON.parse(messageOutput.body);
          setUsersInRooms(userList); // 사용자와 방 정보 업데이트
        });

        // 사용자 입장 정보 서버에 전송
        client.publish({
          destination: "/api/app/chat/join",
          body: JSON.stringify({ userName: username, roomName }),
        });
      },
      onStompError: (frame) => {
        console.error(`STOMP 오류: ${frame}`);
      },
    });

    client.activate();
    setStompClient(client);
  };

  // 채팅방 목록 가져오기
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

  // 특정 채팅방의 최근 메시지 가져오기
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
      console.error("최근 메시지 가져오는 중 오류 발생:", error);
    }
  };

  // 컴포넌트 마운트 시 채팅방 목록 불러오기
  useEffect(() => {
    fetchRooms();
  }, []);

  // 채팅방 이름 변경 시 메시지와 연결 초기화
  useEffect(() => {
    if (roomName) {
      fetchRecentMessages(roomName);
      connectToChatRoom();
    }
  }, [roomName]);

  // 사용자 이름 설정 시 WebSocket 연결 초기화
  useEffect(() => {
    if (username) {
      connectToWebSocket();
    }
  }, [username]);

  // 새 메시지가 추가될 때 스크롤 조정
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 메시지 전송
  const handleSendMessage = () => {
    if (!stompClient || !stompClient.connected) {
      console.log("WebSocket 연결이 활성화되지 않았습니다.");
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

      setNewMessage(""); // 입력 필드 초기화
    }
  };

  // 사용자 이름 설정
  const handleSetUsername = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername);
      alert("이름이 설정되었습니다.");
    } else {
      alert("이름을 입력해주세요.");
    }
  };

  // 사용자 이름 입력 화면
  if (!username) {
    return (
      <div className="username-container">
        <h3>사용자 이름 설정</h3>
        <input
          type="text"
          placeholder="이름을 입력하세요"
          value={tempUsername}
          onChange={(e) => setTempUsername(e.target.value)}
          className="username-input"
        />
        <button onClick={handleSetUsername} className="set-username-button">
          등록
        </button>
      </div>
    );
  }
  

  return (
    <div className="chat-container">
      <div className="chat-room-creation">
        <input
          type="text"
          placeholder="채팅방 이름"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          className="room-name-input"
        />
        <button onClick={createRoom} className="create-room-button">
          채팅방 생성
        </button>
      </div>

      <h3>채팅방 목록</h3>
        <div className="chat-room-list">
          {rooms.length === 0 ? (
            <p>생성된 채팅방이 없습니다.</p>
          ) : (
            rooms.map((room, index) => (
              <div
                key={index}
                className="chat-room-item"
                onClick={() => {
                  setRoomName(room.roomName);
                  setMessages([]);
                }}
              >
                {room.roomName}
              </div>
            ))
          )}
        </div>


      <h3>현재 채팅방에 접속 중인 사용자</h3>
      <div className="chat-users">
        <div className="chat-users-header">
          <span className="header-name">이름</span>
          <span className="header-room">채팅방</span>
        </div>
        <ul>
          {usersInRooms.map((user, index) => (
            <li key={index}>
              <span className="user-name">{user.userName}</span>
              <span
                className="room-name"
                style={{ color: user.roomName === "채팅방 미접속" ? "gray" : "black" }}
              >
                {user.roomName}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {roomName && (
        <div className="chat-room">
          <h3>{roomName} 채팅방</h3>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chat-message ${
                  message.sender === username ? "my-message" : "other-message"
                }`}
              >
                <strong>{message.sender}:    </strong>
                <span>{message.content}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="메시지를 입력하세요"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button onClick={handleSendMessage}>보내기</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
