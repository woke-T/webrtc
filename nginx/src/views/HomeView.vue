<script setup>
import { Select, Form, InputNumber, Button } from "ant-design-vue";
import {
  getLocalDevice,
  getTargetDeviceMedia,
  getShareMedia,
} from "@/utils/media";
import { reactive } from "vue";
const localDevice = reactive({
  audioIn: [],
  audioOut: [],
  videoIn: [],
});

const formData = reactive({
  videoId: "",
  audioInId: "",
  audioOutId: "",
  width: 1080,
  height: 720,
  frameRate: 30,
});

const initDeviceData = async () => {
  const data = await getLocalDevice()
  localDevice.audioIn = data.audioIn
  localDevice.audioOut = data.audioOut
  localDevice.videoIn = data.videoIn
}

const initVideoElement = () => {
  const video = document.getElementById("video");
  const stream = video.srcObject;
  if (stream) {
    stream.getAudioTracks().forEach((e) => {
      stream.removeTrack(e);
    });
    stream.getVideoTracks().forEach((e) => {
      stream.removeTrack(e);
    });
  }
  return video;
};

const submit = async () => {
  const video = initVideoElement();
  const newStream = await getTargetDeviceMedia(formData);
  video.srcObject = newStream;
  video.muted = true;
};

const shareScreen = async () => {
  const video = initVideoElement();
  const newStream = await getShareMedia({
    video: { width: 3840, height: 2160 },
    audio: false,
  });
  video.srcObject = newStream;
  video.muted = true;
};

initDeviceData()


</script>

<template>
  <div>
    <Form layout="inline" :model="formData">
      <Form.Item label="选择摄像头" name="videoId">
        <Select v-model:value="formData.videoId" style="width: 170px">
          <Select.Option v-for="item in localDevice.videoIn" :value="item.id">{{
            item.label
          }}</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item label="选择麦克风" name="audioInId">
        <Select v-model:value="formData.audioInId" style="width: 170px">
          <Select.Option v-for="item in localDevice.audioIn" :value="item.id">{{
            item.label
          }}</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item label="选择听筒" name="audioOutId">
        <Select v-model:value="formData.audioOutId" style="width: 170px">
          <Select.Option
            v-for="item in localDevice.audioOut"
            :value="item.id"
            >{{ item.label }}</Select.Option
          >
        </Select>
      </Form.Item>
      <Form.Item label="宽" name="width">
        <InputNumber v-model:value="formData.width" style="width: 170px" />
      </Form.Item>
      <Form.Item label="高" name="height">
        <InputNumber v-model:value="formData.height" style="width: 170px" />
      </Form.Item>
      <Form.Item label="FPS" name="frameRate">
        <InputNumber v-model:value="formData.frameRate" style="width: 170px" />
      </Form.Item>
      <Form.Item label="FPS" name="frameRate">
        <Button @click="submit">确定</Button>
      </Form.Item>
    </Form>
  </div>

  <div>
    <Button @click="shareScreen">共享屏幕</Button>
  </div>

  <div>
    <video width="600"  id="video" autoplay controls muted></video>
  </div>
</template>
