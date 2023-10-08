if(process.env.NODE_ENV === 'Production') {
  module.exports = require('./config.prod.js')
}else {
  module.exports = require('./config.local.js')
}