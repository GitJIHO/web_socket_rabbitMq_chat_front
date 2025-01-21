# WebSocket API 문서
> REST API + WEBSOCKET API 혼합 형태로 REST API 관련 내용은 하단 swagger의 채팅 탭을 확인해주세요

[Algo-Hive Team Toy Project 명세서](http://algo.knu-soft.site/swagger-ui/index.html) 

## 1. 웹소켓 경로
URL: ws://algo.knu-soft.site/api/ws

## 2. 채팅 메시지 전송

URL: /api/app/chat/{roomName}
Method: SEND (WebSocket)

기능: 사용자가 채팅방에 메시지를 전송합니다.

요청 메시지 (ChatMessageRequest):
```
{
  "sender": "보낸 사람",
  "content": "메시지 내용"
}
```
응답 메시지:
```
{
  "sender": "보낸 사람",
  "content": "메시지 내용",
  "roomName": "채팅방 이름"
}
```
로직:
메시지를 데이터베이스에 저장하고, MessageProducer를 통해 모든 클라이언트에게 메시지를 전송합니다.

## 3. 사용자 이름 설정

URL: /api/app/chat/setName/{roomName}
Method: SEND (WebSocket)

기능: 사용자가 채팅방에서 이름을 설정합니다.

요청 메시지 (UserNameRequest):
```
{
  "userName": "사용자 이름"
}
```
로직:
사용자 이름을 request에 담아 해당 엔드포인트로 전송하면 웹소켓 인터셉터가 유저로 세션에 등록합니다. 이 과정에서 사용자가 설정한 이름을 모든 클라이언트에 반영하여 표시합니다.

## 3. 핵심 로직 흐름
메시지 전송: 사용자가 메시지를 보내면 서버는 이를 처리하여 채팅방에 연결된 모든 클라이언트로 메시지를 전송합니다.
사용자 이름 설정: 사용자가 이름을 설정하면 해당 이름을 채팅방에 적용하고, 모든 클라이언트에 실시간으로 반영합니다.

## 4. 핸들러
sendMessage: 채팅 메시지를 처리하고, 메시지를 모든 클라이언트에게 방송합니다.
setUserName: 사용자가 설정한 이름을 반영하여 채팅방에 전달합니다.
