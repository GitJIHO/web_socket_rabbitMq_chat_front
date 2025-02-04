# WebSocket API 문서
> REST API + WEBSOCKET API 혼합 형태로 REST API 관련 내용은 하단 swagger의 채팅 탭을 확인해주세요

[Algo-Hive Team Toy Project 명세서](http://algo.knu-soft.site/swagger-ui/index.html) 

## 1. 웹소켓 경로
#### URL: ws://algo.knu-soft.site/api/ws

## 2. 사용자 목록 업데이트
#### URL: /topic/users
Method: SUBSCRIBE (WebSocket Topic)

Description: 현재 접속 중인 사용자와 그들이 접속한 채팅방 정보를 구독합니다.

응답
Message Body: [JSON 배열(array, []) 형식]
```
[
  {
    "userName": "user1",
    "roomName": "room1"
  },
  {
    "userName": "user2",
    "roomName": "room2"
  }
]
```

## 3. 채팅방별 접속인원 목록 업데이트
#### URL: /topic/room-users
Method: SUBSCRIBE (WebSocket Topic)

Description: 현재 채팅 시스템에 연결된 채팅방별 접속자 수 정보를 구독합니다. 인원이 0명인경우 자동으로 삭제됩니다.

응답
Message Body: [JSON 객체(Object, {}) 형식] 

**따로 DTO가 있지 않고, Key(방이름)-Value(방별 접속인원) 형식으로 하나의 객체로 제공**

```
{
    "room1": 5,
    "room2": 3,
    "room3": 7
}
```

## 4. 특정 채팅방 메시지 구독
#### URL: /topic/{roomName}

Method: SUBSCRIBE (WebSocket Topic)

Description: 특정 채팅방의 메시지를 구독합니다.

응답
Message Body: [JSON 객체(Object, {}) 형식]
```
{
  "sender": "user1",
  "content": "안녕하세요!",
  "roomName": "room1"
}
```

## 5. 메시지 송신
#### URL: /api/app/chat/{roomName}

Method: PUBLISH (WebSocket)

Description: 특정 채팅방에 메시지를 전송합니다.

요청
Path Parameter:
roomName: 메시지를 보낼 채팅방 이름

Message Body: [JSON 객체(Object, {}) 형식]
```
{
  "sender": "user1",
  "content": "메시지 내용",
  "roomName": "room1"
}
```

## 6. 사용자 입장 알림
#### URL: /api/app/chat/join

Method: PUBLISH (WebSocket)

Description: 사용자가 채팅방에 입장했음을 알립니다.

요청
```
Message Body: [JSON 객체(Object, {}) 형식]
{
  "userName": "user1",
  "roomName": "room1"
}
```
