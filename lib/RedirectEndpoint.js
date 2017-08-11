const { addressify, createServer, LOCATION } = require('./common');

class RedirectEndpoint {
  /**
   * Creates a simple RedirectServer
   * @param  {Locator} source Where the server will live
   * @param  {Locator} target Where the server will point to
   */
  constructor({ source = {}, target = {} }) {
    this.source = source;
    this.target = target;
    this.endpoint = createServer(this.source.protocol, function (req, res) {
      res.writeHead(301, {
        [LOCATION]: addressify(target.protocol, target.host, target.port, req.url)
      });
      res.end();
    });
  }

  listen() {
    this.endpoint.listen(this.source.port);
    return this;
  }
}

module.exports = RedirectEndpoint;
