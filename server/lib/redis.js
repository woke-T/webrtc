const redis = require("redis");
const redisConfig = require('../config/index')
console.log(redisConfig.redis)

const redisClient = redis.createClient({
  url: `redis://${redisConfig.redis.host}:${redisConfig.redis.port}`,
});

redisClient.on("connect", () => {
  console.log("redis connected");
});

redisClient.on("error", (err) => {
  console.log("redis connect error", err);
});

redisClient.on("reconnecting", (stats) => {
  console.log("redis reconnect", stats);
});

async function hSet(key, filed, value) {
  if (typeof value === "object") {
    value = JSON.stringify(value);
  }
  await redisClient.hSet(key, filed, value);
}

function hGetAll(key) {
  return redisClient.hGetAll(key);
}

async function hDel(key, filed) {
  await redisClient.hDel(key, filed);
}

module.exports = {
  redisClient,
  hSet,
  hGetAll,
  hDel,
};
