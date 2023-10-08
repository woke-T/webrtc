/**
 *
 * @param {*} constraints
 * @returns
 */
export async function getLocalUserMedia(constraints) {
  return await navigator.mediaDevices.getUserMedia(constraints);
}

/**
 *
 * @param {*} videoId
 * @param {*} audioId
 * @returns 获取指定id设备流
 */
export async function getTargetDeviceMedia({
  videoId,
  audioId,
  width,
  height,
  frameRate,
}) {
  const constraints = {
    audio: { deviceId: audioId ? { exact: audioId } : undefined },
    video: {
      deviceId: videoId ? { exact: videoId } : undefined,
      width: width,
      height: height,
      frameRate: { ideal: frameRate, max: 24 },
    },
  };
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  return await getLocalUserMedia(constraints).catch(handleError);
}

/**
 * 
 * @param {*} constraints 
 * @returns 共享桌面流
 */
export function getShareMedia(constraints) {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  return navigator.mediaDevices.getDisplayMedia(constraints).catch(handleError);
}

/**
 *
 * @returns 所有媒体设备
 */
export async function getLocalDevice() {
  const localDevice = { audioIn: [], videoIn: [], audioOut: [] };
  const constraints = { video: true, audio: true };

  if (!navigator.mediaDevices?.enumerateDevices) {
    console.log("浏览器不支持获取媒体设备");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((track) => track.stop());
    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach((device) => {
      const deviceObj = {
        id: device.deviceId,
        kind: device.kind,
        label: device.label,
      };
      switch (device.kind) {
        case "audioinput":
          if (!localDevice.audioIn.some((e) => e.id === device.deviceId)) {
            localDevice.audioIn.push(deviceObj);
          }
          break;
        case "audiooutput":
          if (!localDevice.audioOut.some((e) => e.id === device.deviceId)) {
            localDevice.audioOut.push(deviceObj);
          }
          break;
        case "videoinput":
          if (!localDevice.videoIn.some((e) => e.id === device.deviceId)) {
            localDevice.videoIn.push(deviceObj);
          }
          break;
      }
    });
  } catch (error) {
    handleError(error);
  }

  return localDevice;
}

/**
 * 错误处理
 * @param {*} error
 */
export function handleError(error) {
  console.error(
    "navigator.MediaDevices.getUserMedia error: ",
    error.message,
    error.name
  );
}
