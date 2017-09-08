const connect = require('connect');
const { HTTP, createServer, addressify } = require('./lib/common');

class DevRevServer {
  constructor(config) {
    let port = config.port;

    this.middleware = connect();
    this.app = createServer(HTTP, this.middleware);

    this.app.listen(port, function () {
      console.log('Server listening at http://localhost:' + port + '/ Press ^C to quit.');
    })

    return this;
  }
}

module.exports = DevRevServer;
