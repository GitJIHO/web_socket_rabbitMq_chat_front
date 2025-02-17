import React, { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import './ChatRoom.css';

const BASE_API_URL = "https://algo.knu-soft.site"; // REST API 기본 URL
const BASE_WS_URL = "ws://algo.knu-soft.site"; // WebSocket 기본 URL

const ChatRoom = () => {
  const [roomName, setRoomName] = useState(""); // 현재 접속 중인 채팅방 이름
  const [newRoomName, setNewRoomName] = useState(""); // 새 채팅방 이름 입력 상태
  const [messages, setMessages] = useState([]); // 채팅 메시지 리스트
  const [newMessage, setNewMessage] = useState(""); // 새로 작성 중인 메시지 상태
  const [username, setUsername] = useState(""); // 사용자 이름
  const [email, setEmail] = useState(""); // 사용자 이메일
  const [tempUsername, setTempUsername] = useState(""); // 사용자 이름 입력 상태
  const [tempEmail, setTempEmail] = useState(""); // 사용자 이메일 입력 상태
  const [stompClient, setStompClient] = useState(null); // WebSocket 연결 객체
  const [rooms, setRooms] = useState([]); // 채팅방 목록
  const [usersInRooms, setUsersInRooms] = useState([]); // 채팅방 사용자 목록
  const [roomUsers, setRoomUsers] = useState({}); // 각 방의 접속자 목록
  const [roomPage, setRoomPage] = useState(0); // 채팅방 목록 페이지
  const [hasMoreRooms, setHasMoreRooms] = useState(true); // 더 불러올 채팅방이 있는지 여부
  const [messagePage, setMessagePage] = useState(0); // 채팅 메시지 페이지
  const [hasMoreMessages, setHasMoreMessages] = useState(true); // 더 불러올 메시지가 있는지 여부
  const [lastScrollTop, setLastScrollTop] = useState(0);

  const messagesEndRef = useRef(null); // 채팅 메시지 스크롤 조작을 위한 Ref
  const roomListRef = useRef(null); // 채팅방 목록 스크롤 조작을 위한 Ref
  const messageListRef = useRef(null); // 채팅 메시지 스크롤 조작을 위한 Ref

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
        setRoomPage(0); // 채팅방 목록 초기화
        setRooms([]); // 채팅방 목록 초기화
        fetchRooms(0); // 채팅방 목록 새로고침
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

        // 방별 사용자 목록 주제 구독
        client.subscribe("/topic/room-users", (messageOutput) => {
          const roomUserList = JSON.parse(messageOutput.body);        
          setRoomUsers(roomUserList);
        });        
        
        // 사용자 입장 상태 전송 (미접속 상태)
        client.publish({
          destination: "/api/app/chat/join",
          body: JSON.stringify({ userName: username, roomName: "채팅방 미접속", email }),
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
          
          // 메시지 본문 뒤에 공백 추가
          message.content = message.content + " ";

          // 메시지를 상태에 저장
          setMessages((prevMessages) => [message, ...prevMessages]);
        });
        
        // 사용자 목록 구독
        client.subscribe("/topic/users", (messageOutput) => {
          const userList = JSON.parse(messageOutput.body);
          setUsersInRooms(userList); // 사용자와 방 정보 업데이트
        });

        client.subscribe("/topic/room-users", (messageOutput) => {
          const roomUserList = JSON.parse(messageOutput.body);
          setRoomUsers(roomUserList);
        });
          

        // 사용자 입장 정보 서버에 전송
        client.publish({
          destination: "/api/app/chat/join",
          body: JSON.stringify({ userName: username, roomName, email }),
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
  const fetchRooms = async (pageNumber) => {
    try {
      const response = await fetch(`${BASE_API_URL}/api/v1/chat/rooms?page=${pageNumber}&size=5&sort=createdAt,desc`);
      if (response.ok) {
        const data = await response.json();
        setRooms((prevRooms) => (pageNumber === 0 ? data.content : [...prevRooms, ...data.content]));
        setHasMoreRooms(!data.last);
      } else {
        alert("채팅방 목록을 가져오는 데 실패했습니다.");
      }
    } catch (error) {
      console.error("채팅방 목록 조회 중 오류 발생", error);
      alert("채팅방 목록 조회 중 오류가 발생했습니다.");
    }
  };

  // 특정 채팅방의 최근 메시지 가져오기
  const fetchRecentMessages = async (roomName, pageNumber) => {
    try {
      const encodedRoomName = encodeURIComponent(roomName);
      const response = await fetch(`${BASE_API_URL}/api/v1/chat/messages/${encodedRoomName}?page=${pageNumber}&size=10&sort=chatTime,asc`);
      if (response.ok) {
        const data = await response.json();
        setMessages((prevMessages) => [...prevMessages, ...data.content]);
        setHasMoreMessages(!data.last);
      } else {
        console.error("최근 메시지 가져오기 실패");
      }
    } catch (error) {
      console.error("최근 메시지 가져오는 중 오류 발생:", error);
    }
  };

  // 채팅방 목록 스크롤 이벤트 핸들러
  const handleRoomListScroll = useCallback(() => {
    if (roomListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = roomListRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10 && hasMoreRooms) {
        setRoomPage((prevPage) => prevPage + 1);
      }
    }
  }, [hasMoreRooms]);

  // 채팅 메시지 스크롤 이벤트 핸들러
  const handleMessageListScroll = useCallback(() => {
    if (messageListRef.current) {
      const { scrollTop } = messageListRef.current;
      setLastScrollTop(scrollTop);
      if (scrollTop === 0 && hasMoreMessages) {
        setMessagePage((prevPage) => prevPage + 1);
      }
    }
  }, [hasMoreMessages]);

  // 컴포넌트 마운트 시 채팅방 목록 불러오기
  useEffect(() => {
    fetchRooms(roomPage);
  }, [roomPage]);

  // 채팅방 이름 변경 시 메시지와 연결 초기화
  useEffect(() => {
    if (roomName) {
      setMessagePage(0); // 메시지 페이지 초기화
      setMessages([]); // 메시지 목록 초기화
      fetchRecentMessages(roomName, 0);
      connectToChatRoom();
    }
  }, [roomName]);

  // 메시지 페이지 변경 시 추가 메시지 불러오기
  useEffect(() => {
    if (roomName && messagePage > 0) {
      fetchRecentMessages(roomName, messagePage);
    }
  }, [messagePage]);

  // 사용자 이름 설정 시 WebSocket 연결 초기화
  useEffect(() => {
    if (username) {
      connectToWebSocket();
    }
  }, [username]);

  // 메시지를 추가할 때만 스크롤 조정
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0 && lastScrollTop > 0) {
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
        email, // 이메일 추가
      };

      stompClient.publish({
        destination: `/api/app/chat/${roomName}`,
        body: JSON.stringify(messageRequest),
      });

      setNewMessage(""); // 입력 필드 초기화
    }
  };

  // 사용자 이름 및 이메일 설정
  const handleSetUsername = () => {
    if (tempUsername.trim() && tempEmail.trim()) {
      setUsername(tempUsername);
      setEmail(tempEmail);
      alert("이름과 이메일이 설정되었습니다.");
    } else {
      alert("이름과 이메일을 입력해주세요.");
    }
  };

  // 사용자 이름 입력 화면
  if (!username) {
    return (
      <div className="username-container">
        <h3>사용자 이름 및 이메일 설정</h3>
        <input
          type="text"
          placeholder="이름을 입력하세요"
          value={tempUsername}
          onChange={(e) => setTempUsername(e.target.value)}
          className="username-input"
        />
        <input
          type="email"
          placeholder="이메일을 입력하세요"
          value={tempEmail}
          onChange={(e) => setTempEmail(e.target.value)}
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
        <div className="chat-room-list" ref={roomListRef} onScroll={handleRoomListScroll}>
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
        <br></br>
        <div className="pagination">
          {roomPage > 0 && (
            <button onClick={() => setRoomPage((prevPage) => prevPage - 1)}>이전</button>
          )}
          <span>페이지 {roomPage + 1}</span>
          {hasMoreRooms && (
            <button onClick={() => setRoomPage((prevPage) => prevPage + 1)}>다음</button>
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

      <br></br>

      <h3>채팅방별 접속자 수</h3>
      <div className="room-users-container">
        <div className="chat-users-header">
          <span className="header-name">채팅방</span>
          <span className="header-room">인원</span>
        </div>
        <div className="room-users-list">
          {Object.keys(roomUsers).length > 0 ? (
            Object.keys(roomUsers).map((roomName, index) => (
              <div key={index} className="room-users-item">
                <span
                  className={`room-name ${roomName === "채팅방 미접속" ? "missing-user" : ""}`}
                >
                  {roomName}
                </span>
                <span className="user-count">{roomUsers[roomName]}명</span>
              </div>
            ))
          ) : (
            <p className="no-users-message">사용자가 없습니다.</p>
          )}
        </div>
      </div>

      {roomName && (
        <div className="chat-room">
          <h3>{roomName} 채팅방</h3>
          <div className="chat-messages" ref={messageListRef} onScroll={handleMessageListScroll}>
            {messages.slice().reverse().map((message, index) => (
              <div
                key={index}
                className={`chat-message ${
                  message.email === email ? "my-message" : "other-message"
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