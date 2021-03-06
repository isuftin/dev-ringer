const { addressify, createServer } = require('./common');
const connect = require('connect');
const httpProxy = require('http-proxy');

class ProxyEndpoint {
  /**
   * Creates a ProxyServer
   * @param  {Locator} source Where the proxy will live
   * @param  {Locator} target Where the proxy will point to
   * @param  {Array<Rule>} rules Any additional middleware rules
   * @param  {Array<Rule>} prxRules Any proxy header rules
   */
  constructor({ source, target = {} }, rules = [], prxRules = []) {
    this.source = source;
    this.target = target;
    this.proxy = httpProxy.createProxyServer({
      target: addressify(target.protocol, target.host, target.port),
      secure: false,
      changeOrigin: true
    });
    this.proxy.on('error', function (err, req, res, url) {
      console.log(url.href, err);
      res.end(err.stack);
    });
    this.proxy.on('proxyReq', function(proxyReq, req, res, options) {
      proxyReq.setHeader('Accept-Encoding', 'identity');
    })
    prxRules.forEach(function(rule) {
      this.proxy.on('proxyRes', rule.handler);
    }, this);
    this.middleware = connect();
    rules.forEach(function(rule) {
      const args = [];
      if (rule.path) {
        args.push(rule.path);
      }
      args.push(function(req, res, next) {
        const result = rule.handler(req, res, next);
        if (result) {
          next();
        }
      });
      this.middleware.use.apply(this.middleware, args);
    }, this);
    this.middleware.use(this.proxy.web.bind(this.proxy));
    if (this.source) {
      this.endpoint = createServer(source.protocol, this.middleware);
    }
  }

  listen() {
    if (this.source) {
      this.endpoint.listen(this.source.port);
    }
    return this;
  }
}

module.exports = ProxyEndpoint;
