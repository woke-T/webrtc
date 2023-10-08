const http = require("http");
const path = require("path");
const fs = require("fs");
const express = require("express");
const socket = require("socket.io");
const { hDel, hGetAll, hSet, redisClient } = require("./lib/redis");
const { getParamsFromUrl, getMsg } = require("./lib/utils");


const userMap = new Map(); // user - > socket1
const ROOM_KEY_PREFIX = "meeting_room_";

const app = express();

app.use(express.static(path.resolve(__dirname, "./dist")));
app.use((req, res, next) => {
  res.sendFile(path.resolve(__dirname, "./dist/index.html"));
});
redisClient.connect();

const httpServer = http.createServer(app)
const io = new socket.Server(httpServer);

io.on("connection", connectHandler);

httpServer.listen(8000, async = () => {
  console.log("服务器启动成功 *:8000");
})

async function connectHandler(socket) {
  const reqUrl = socket.client.request.url;
  const userId = getParamsFromUrl(reqUrl, "userId");
  const roomId = getParamsFromUrl(reqUrl, "roomId");
  const nickname = getParamsFromUrl(reqUrl, "nickname");
  console.log(
    `client userId: ${userId} roomId: ${roomId} nickname: ${nickname} online`
  );
  userMap.set(userId, socket);

  if (roomId) {
    await hSet(
      `${ROOM_KEY_PREFIX}${roomId}`,
      userId,
      formatUserInfo(userId, roomId, nickname)
    );
    oneToRoomMany(
      roomId,
      getMsg("join", `${userId} join this room`, 200, { userId, nickname })
    );
  }

  socket.on("msg", async (data) => {
    console.log("from client: ", data);
    await oneToRoomMany(roomId, data);
  });

  socket.on("roomUserList", async (data) => {
    socket.emit("roomUserList", await getRoomOnlyUserList(data.roomId));
  });

  socket.on("call", (data) => {
    let targetUid = data["targetUid"];
    oneToOne(targetUid, getMsg("call", "远程呼叫", 200, data));
  });

  socket.on("candidate", (data) => {
    let targetUid = data["targetUid"];
    oneToOne(targetUid, getMsg("candidate", "ice candidate", 200, data));
  });

  socket.on("offer", (data) => {
    let targetUid = data["targetUid"];
    oneToOne(targetUid, getMsg("offer", "rtc offer", 200, data));
  });

  socket.on("answer", (data) => {
    let targetUid = data["targetUid"];
    oneToOne(targetUid, getMsg("answer", "rtc answer", 200, data));
  });

  socket.on("applyMic", (data) => {
    let targetUid = data["targetUid"];
    oneToOne(targetUid, getMsg("applyMic", "apply mic", 200, data));
  });
  socket.on("acceptApplyMic", (data) => {
    let targetUid = data["targetUid"];
    oneToOne(
      targetUid,
      getMsg("acceptApplyMic", "acceptApplyMic mic", 200, data)
    );
  });
  socket.on("refuseApplyMic", (data) => {
    let targetUid = data["targetUid"];
    oneToOne(
      targetUid,
      getMsg("refuseApplyMic", "refuseApplyMic mic", 200, data)
    );
  });

  socket.on("disconnect", () => {
    console.log(
      `client userId: ${userId} roomId: ${roomId} nickname: ${nickname} offline`
    );
    userMap.delete(userId);
    if (roomId) {
      hDel(`${ROOM_KEY_PREFIX}${roomId}`, userId);
      oneToRoomMany(
        roomId,
        getMsg("leave", userId + " leave the room ", 200, {
          userId: userId,
          nickname: nickname,
        })
      );
    }
  });
}

function formatUserInfo(userId, roomId, nickname, pub) {
  const info = JSON.stringify({
    userId,
    roomId,
    nickname,
    pub,
  });
  return info;
}

function oneToOne(uid, msg) {
  const socket = userMap.get(uid);
  if (!socket) {
    return console.log(`${uid} 用户不在线`);
  }
  socket.emit("msg", msg);
}

async function oneToRoomMany(roomId, msg) {
  const uMap = await hGetAll(`${ROOM_KEY_PREFIX}${roomId}`);
  for (const uid in uMap) {
    oneToOne(uid, msg);
  }
}

async function getRoomOnlyUserList(roomId) {
  const resList = [];
  const uMap = await hGetAll(`${ROOM_KEY_PREFIX}${roomId}`);
  for (const key in uMap) {
    const detail = JSON.parse(uMap[key]);
    resList.push(detail);
  }
  return resList;
}
