<template>
  <div class="wrap">
    <div>
      <span>成员：</span>
      <ul class="user-list">
        <li
          class="user-list-item"
          v-for="item in roomUserList"
          :key="item.userId"
        >
          <span> {{ item.nickname }}</span>
          <button @click="call(item)" v-if="userId !== item.userId">
            call
          </button>
          <button v-else disabled>自己</button>
        </li>
      </ul>
    </div>

    <div>
      <div class="video-wrap">
        <video class="local-video" id="local" autoplay muted controls></video>
        <video class="remote-video" id="remote" autoplay muted controls></video>
      </div>
      <div>
        <div>
          <span>发送消息：</span><input v-model="formInline.rtcMessage" />
        </div>
        <div>
          <span>远端消息：</span><span>{{ formInline.rtcMessageRes }}</span>
        </div>
        <button @click="sendMessage">发送</button>
      </div>
    </div>

    <div style="margin-left: 20px">
      <div><span style="display: inline-block;width: 70px">昵称：</span><input v-model="nickname" /></div>
      <div><span style="display: inline-block;width: 70px">账号：</span><input v-model="userId" /></div>
      <div><span style="display: inline-block;width: 70px">房间号：</span><input v-model="roomId" /></div>

      <button @click="joinRoom">确定</button>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from "vue-router";
import { io } from "socket.io-client";
import { ref, reactive } from "vue";
import { getLocalUserMedia } from "../utils/media";

const userId = ref("");
const roomId = ref("");
const nickname = ref("");
const roomUserList = ref([]);
const socket = ref(null);
const localRtcPc = ref(null);
const channel = ref(null);
const formInline = reactive({
  rtcMessage: "",
  rtcMessageRes: "",
});

const route = useRoute();

const call = (record) => {
  initCaller(userId.value, record.userId);
  socket.value.emit("call", {
    userId: userId.value,
    targetUid: record.userId,
  });
};

const setDomStream = (id, newStream) => {
  const video = document.getElementById(id);
  const stream = video.srcObject;
  if (stream) {
    stream.getAudioTracks().forEach((e) => {
      stream.removeTrack(e);
    });
    stream.getVideoTracks().forEach((e) => {
      stream.removeTrack(e);
    });
  }
  video.srcObject = newStream;
};

const setRemoteStream = (id, track) => {
  const video = document.getElementById(id);
  const stream = video.srcObject;
  if (stream) {
    stream.addTrack(track);
  } else {
    const newStream = new MediaStream();
    newStream.addTrack(track);
    video.srcObject = newStream;
    video.muted = true;
  }
};

const pcEventHandler = (pc, localUid, remoteUid) => {
  channel.value = pc.createDataChannel("chat");
  pc.ontrack = (event) => {
    console.log("远端添加媒体轨道");
    setRemoteStream("remote", event.track);
  };

  pc.onnegotiationneeded = (e) => {
    console.log("重新协商", e);
  };

  pc.ondatachannel = (event) => {
    console.log("Data channel is created");
    event.channel.onopen = function () {
      console.log("Data channel ------------open----------------");
    };
    event.channel.onmessage = function (data) {
      console.log("Data channel ------------msg----------------", data);
      formInline.rtcMessageRes = data.data;
    };
    event.channel.onclose = function () {
      console.log("Data channel ------------close----------------");
    };
  };

  pc.onicecandidate = (event) => {
    console.log("收到ice");
    if (event.candidate) {
      console.log("收集到candidate");
      socket.value.emit("candidate", {
        targetUid: remoteUid,
        userId: localUid,
        candidate: event.candidate,
      });
    } else {
      console.log("在此次协商中，没有更多的候选");
    }
  };
};

const initCaller = async (callerId, calleeId) => {
  const mapSender = [];
  localRtcPc.value = new RTCPeerConnection();
  const localStream = await getLocalUserMedia({ audio: true, video: true });

  for (const track of localStream.getTracks()) {
    mapSender.push(localRtcPc.value.addTrack(track));
  }

  // 本地渲染视频流
  setDomStream("local", localStream);

  // 回调监听
  pcEventHandler(localRtcPc.value, callerId, calleeId);

  // 创建offer
  const offer = await localRtcPc.value.createOffer({ iceRestart: true });

  // 设置offer本地描述
  localRtcPc.value.setLocalDescription(offer);
  // 发送offer给被呼叫端
  socket.value.emit("offer", {
    targetUid: calleeId,
    userId: callerId,
    offer: offer,
  });
};

const initCallee = async (localUid, fromUid) => {
  localRtcPc.value = new RTCPeerConnection();
  const localStream = await getLocalUserMedia({ audio: true, video: true });
  setDomStream("local", localStream);

  for (const track of localStream.getTracks()) {
    localRtcPc.value.addTrack(track);
  }

  pcEventHandler(localRtcPc.value, localUid, fromUid);
};

const onCall = (data) => {
  console.log("远程呼叫", data);
  initCallee(userId.value, data.userId);
};

const onRemoteOffer = async (fromUid, offer) => {
  console.log("收到远程offer");
  localRtcPc.value.setRemoteDescription(offer);

  const answer = await localRtcPc.value.createAnswer();
  await localRtcPc.value.setLocalDescription(answer);

  const params = {
    targetUid: fromUid,
    userId: userId.value,
    answer: answer,
  };
  socket.value.emit("answer", params);
};

const onRemoteAnswer = async (fromUid, offer) => {
  localRtcPc.value.setRemoteDescription(offer);
};

const initData = () => {
  if(!roomId.value || !userId.value || !nickname.value){
    alert('请填写完整信息')
    return;
  }

  // const url = "wss://www.woke20.com:8000";
  const url = "ws://47.108.71.112:8000";
  // const url = "ws://172.23.65.119:8000";
  // const url = "ws://localhost:8000"

  socket.value = io(url, {
    reconnectionDelayMax: 10000,
    transports: ["websocket"],
    query: {
      userId: userId.value,
      roomId: roomId.value,
      nickname: nickname.value,
    },
  });

  socket.value.on("connect", () => {
    console.log("server connected");
  });

  socket.value.on("roomUserList", (data) => {
    roomUserList.value = data;
  });

  socket.value.on("msg", async (data) => {
    console.log("msg", data);
    switch (data["type"]) {
      case "join":
      case "leave":
        setTimeout(() => {
          socket.value.emit("roomUserList", { roomId: roomId.value });
        }, 1000);
        break;
      case "call":
        onCall(data.data);
        break;
      case "offer":
        onRemoteOffer(data.data.userId, data.data.offer);
        break;
      case "answer":
        onRemoteAnswer(data.data.userId, data.data.answer);
        break;
      case "candidate":
        localRtcPc.value.addIceCandidate(data.data.candidate);
        break;
      default:
        break;
    }
  });

  socket.value.on("error", (error) => {
    console.log("error", error);
  });
};

const sendMessage = () => {
  if (!channel.value) {
    alert("请先建立连接");
  }
  channel.value.send(formInline.rtcMessage);
  formInline.rtcMessage = "";
};

const joinRoom = () => {
  initData()
}
</script>

<style scoped>
.wrap {
  display: flex;
}
.user-list {
  width: 200px;
}
.user-list-item {
  margin-top: 8px;
  align-items: center;
  display: flex;
  list-style: none;
}
.user-list-item > span {
  width: 60px;
}
.user-list-item > button {
  margin-left: 10px;
  width: 60px;
  height: 30px;
  border-radius: 6px;
  outline: none;
  border: 1px solid lightgray;
  cursor: pointer;
  &:hover {
    background-color: rgb(232, 229, 229);
  }
}

.video-wrap {
  display: flex;
}
.local-video {
  width: 400px;
  height: 300px;
}
.remote-video {
  margin-left: 50px;
  width: 400px;
  height: 300px;
}
</style>
