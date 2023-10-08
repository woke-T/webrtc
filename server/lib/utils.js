function getParamsFromUrl(url, key) {
  const searchParams = url.split("?")[1];
  return new URLSearchParams(searchParams).get(key);
}

/**
 * 统一消息类型
 * @param {类型} type 
 * @param {消息} msg 
 * @param {状态} status 
 * @param {数据} data 
 * @returns 
 */
function getMsg(type, msg, status = 200, data = null) {
  return { type: type, msg: msg, status: status, data: data };
}

module.exports = {
  getParamsFromUrl,
  getMsg
};
