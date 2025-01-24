import React, { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import './ChatRoom.css'; // 스타일을 별도로 관리

// 전역 상수 정의
const BASE_API_URL = "http://algo.knu-soft.site";
const BASE_WS_URL = "ws://algo.knu-soft.site";

const ChatRoom = () => {
  const [roomName, setRoomName] = useState("");  // 선택된 채팅방 이름
  const [newRoomName, setNewRoomName] = useState("");  // 새로 만들 채팅방 이름
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [stompClient, setStompClient] = useState(null);
  const [rooms, setRooms] = useState([]);  // 방 목록 상태
  const [isNameSet, setIsNameSet] = useState(false);  // 이름 설정 여부 상태

  // 메시지 컨테이너 참조
  const messagesEndRef = useRef(null);

  // 채팅방 생성 API 호출
  const createRoom = async () => {
    if (!newRoomName) {
      alert("채팅방 이름을 입력해주세요.");
      return;
    }

    try {
      const response = await fetch(`${BASE_API_URL}/api/v1/chat/rooms`, {  // 수정된 경로
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomName: newRoomName }), // 채팅방 이름을 서버로 전송
      });

      if (response.ok) {
        alert("채팅방이 생성되었습니다.");
        fetchRooms(); // 채팅방 생성 후 방 목록을 다시 가져옴
        setNewRoomName(""); // 채팅방 생성 후 입력란 초기화
      } else {
        alert("채팅방 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("채팅방 생성 중 오류 발생", error);
      alert("채팅방 생성 중 오류가 발생했습니다.");
    }
  };

  // WebSocket 연결
  const connectToChatRoom = () => {
    if (!roomName) return;  // 방 이름이 없으면 연결하지 않음

    // 이미 stompClient가 연결되어 있다면 종료
    if (stompClient) {
      stompClient.deactivate();
    }

    const client = new Client({
      brokerURL: `${BASE_WS_URL}/api/ws`,  // 수정된 WebSocket 경로
      connectHeaders: {},
      debug: (str) => console.log(str),
      onConnect: () => {
        console.log("Connected to WebSocket");

        // 채팅방에 대한 구독
        client.subscribe(`/topic/${roomName}`, (messageOutput) => {  // 수정된 구독 경로
          const message = JSON.parse(messageOutput.body);
          setMessages((prevMessages) => [...prevMessages, message]);
        });

        // 사용자 이름이 설정되면 setName 메시지 보내기
        if (username) {
          client.publish({
            destination: `/api/app/chat/setName/${roomName}`,
            body: JSON.stringify({ userName: username }),
          });
        }
      },
      onStompError: (frame) => {
        console.error(`STOMP error: ${frame}`);
      },
    });

    client.activate();
    setStompClient(client);
  };

  // 채팅방 목록 가져오기
  const fetchRooms = async () => {
    try {
      const response = await fetch(`${BASE_API_URL}/api/v1/chat/rooms`);  // 수정된 경로
      if (response.ok) {
        const data = await response.json();
        setRooms(data); // 채팅방 목록을 상태에 저장
      } else {
        alert("채팅방 목록을 가져오는 데 실패했습니다.");
      }
    } catch (error) {
      console.error("채팅방 목록 조회 중 오류 발생", error);
      alert("채팅방 목록 조회 중 오류가 발생했습니다.");
    }
  };

  // 최근 메시지 가져오기
  const fetchRecentMessages = async (roomName) => {
    try {
        const encodedRoomName = encodeURIComponent(roomName);  // 방 이름을 URL 인코딩
        const response = await fetch(`${BASE_API_URL}/api/v1/chat/messages/${encodedRoomName}`);  // 수정된 경로
        if (response.ok) {
          const data = await response.json();
          setMessages(data.reverse());  // 최근 메시지를 역순으로 정렬하여 상태에 저장
        } else {
          console.error("최근 메시지 가져오기 실패");
        }
    } catch (error) {
        console.error("Error fetching recent messages:", error);
    }
  };

  // 컴포넌트가 마운트되었을 때 방 목록을 가져옴
  useEffect(() => {
    fetchRooms();
  }, []);

  // WebSocket 연결 해제
  useEffect(() => {
    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [stompClient]);

  // roomName이 변경되면 WebSocket 연결 및 최근 메시지 가져오기
  useEffect(() => {
    if (roomName) {
      fetchRecentMessages(roomName);  // 최근 메시지 가져오기
      connectToChatRoom();  // WebSocket 연결
    }
  }, [roomName]);  // roomName이 변경될 때만 실행

  // 새로운 메시지가 추가될 때마다 스크롤을 가장 밑으로 내리기
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 메시지 전송
  const handleSendMessage = () => {
    if (!stompClient || !stompClient.connected) {
      console.log("WebSocket 연결이 아직 활성화되지 않았습니다.");
      return;
    }

    if (newMessage.trim()) {
      const messageRequest = {
        sender: username,
        content: newMessage,  // message 대신 content로 변경
        roomName,
      };

      console.log("Sending message:", messageRequest);  // 메시지 내용 확인

      // 메시지 전송
      stompClient.publish({
        destination: `/api/app/chat/${roomName}`,
        body: JSON.stringify(messageRequest),
      });

      setNewMessage("");  // 메시지 입력란 초기화
    } else {
      console.log("Message is empty or only whitespace.");
    }
  };

  const handleSetUsername = () => {
    if (!username) {
      alert("사용자 이름을 입력하세요.");
      return;
    }

    setIsNameSet(true);  // 이름 설정 완료
  };
  return (
    <div className="chat-container">
      {/* 채팅방 생성 입력창 */}
      <div>
        <input
          type="text"
          placeholder="채팅방 이름"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)} // 방 이름 입력
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
                setRoomName(room.roomName); // 방을 선택
                setMessages([]); // 기존 메시지 초기화
                setIsNameSet(false); // 이름 설정 초기화
              }}
            >
              {room.roomName}  {/* 방 이름을 제대로 출력 */}
            </button>
          ))
        )}
      </div>

      {roomName && !isNameSet && (
        <div>
          <h3>채팅방: {roomName}</h3>
          <div>
            <input
              type="text"
              placeholder="사용자 이름"
              value={username}
              onChange={(e) => setUsername(e.target.value)} // 사용자 이름 입력
            />
            <button onClick={handleSetUsername}>이름 설정</button>
          </div>
        </div>
      )}

      {roomName && isNameSet && (
        <div>
          <h3>채팅방: {roomName}</h3>
          <p>내 이름: {username}</p> {/* 내 이름을 채팅방 이름 밑에 추가 */}
          <div className="messages-container">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${
                  message.sender === username ? "my-message" : "other-message"
                }`}
              >
                <strong>{message.sender}:</strong> {message.content} {/* content로 변경 */}
              </div>
            ))}
            {/* 스크롤을 가장 밑으로 내리기 위한 div */}
            <div ref={messagesEndRef} />
          </div>
          <div>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)} // 메시지 입력
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
