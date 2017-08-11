const connect = require('connect');
const fs = require('fs');
const http = require('http');
const httpProxy = require('http-proxy');
const https = require('https');
const { URL } = require('url');

const sslConfig = {
  key: fs.readFileSync('localhost-private.pem'),
  cert: fs.readFileSync('localhost-public.pem')
};
const createServer = function(protocol, handler) {
  var server = {
    http: function(handler) {
      return http.createServer(handler);
    },
    https: function(handler) {
      return https.createServer(sslConfig, handler)
    }
  };
  return server[protocol](handler);
};
const LOCATION = 'location'
const HTTPS = 'https';
const HTTP = 'http';

class Locator {
  /**
   * Creates an Locator
   * @param  {string} protocol http or https
   * @param  {string} host     Hostname
   * @param  {number} port     Leave blank if standard (80 or 443)
   */
  constructor({protocol, host, port}) {
    this.protocol = protocol;
    this.host = host;
    this.port = port;
  }
}

class Rule {
  /**
   * Creates a Rule
   * @param  {string} name For logging purposes
   * @param  {Function} handler (req, res) return true to continue the chain.
   * @param  {string} path Optional
   * @return {[type]}         [description]
   */
  constructor({name, handler, path}) {
    this.name = name;
    this.handler = handler;
    this.path = path;
  }
}

class ProxyEndpoint {
  /**
   * Creates a ProxyServer
   * @param  {Locator} source Where the proxy will live
   * @param  {Locator} target Where the proxy will point to
   * @param  {Array<Rule>} rules Any additional middleware rules
   */
  constructor({ source, target = {}, rules = [] }) {
    this.source = source;
    this.target = target;
    this.proxy = httpProxy.createProxyServer({
      target: addressify(target.protocol, target.host, target.port),
      secure: false,
      changeOrigin: true,
      autoRewrite: true
    });
    this.proxy.on('proxyRes', rewriteRedirects);
    this.middleware = connect();
    rules.forEach(function(rule) {
      const args = [];
      if (rule.path) {
        args.push(rule.path);
      }
      args.push(function(req, res, next) {
        const result = rule.handler(req, res);
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

class RedirectEndpoint {
  /**
   * Creates a simple RedirectServer
   * @param  {Locator} source Where the server will live
   * @param  {Locator} target Where the server will point to
   */
  constructor({ source = {}, target = {} }) {
    this.source = source;
    this.target = target;
    this.endpoint = createServer(source.protocol, function (req, res) {
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

const local = new ProxyEndpoint({
  target: new Locator({
    protocol: HTTP,
    host: 'localhost',
    port: 8080,
  }),
});
const predev = new ProxyEndpoint({
  source: new Locator({
    protocol: HTTPS,
    host: 'localhost',
    port: 8443,
  }),
  target: new Locator({
    protocol: HTTPS,
    host: 'predev.my.wisc.edu',
  }),
  rules: [
    new Rule({
      path: '/web',
      handler: function(req, res) {
        req.url = req.originalUrl;
        local.proxy.web(req, res);
        return false;
      },
    })
  ]
}).listen();
const login = new ProxyEndpoint({
  source: new Locator({
    protocol: HTTPS,
    host: 'localhost',
    port: 8444,
  }),
  target: new Locator({
    protocol: HTTPS,
    host: 'logintest.wisc.edu',
  }),
  rules: [
    new Rule({
      handler: rewriteBody(
        predev.target.host,
        addressify(null, predev.source.host, predev.source.port)
      ),
    }),
  ],
}).listen();
const redirect = new RedirectEndpoint({
  source: new Locator({
    protocol: HTTP,
    host: 'localhost',
    port: 8081,
  }),
  target: predev.source,
}).listen();

///////////////////////////////////////
// HELPER FUNCTIONS
///////////////////////////////////////

/**
 * Create a global regex of a hostname
 * @param  {string} host
 * @return {RegExp} A global RegExp of the hostname
 */
function regexify(host) {
  return new RegExp(host.replace(/\./g, '\\.'), 'g');
}

/**
 * Put together pieces of a URL.
 * Sometimes you want protocol, sometimes you don't. Just put your parts in
 * here so you don't have to do the string manipulation all over the place
 * @param  {string} [protocol] Optional. eg. http or https
 * @param  {string} host Hostname, eg. localhost
 * @param  {number} [port] Optional. eg. 8080
 * @param  {string} [path] Optional. Anything you want to slap on afterwards.
 * @return {string}        The created address
 */
function addressify(protocol, host, port, path) {
  const PROTOCOL_SEPARATOR = '://';
  const PORT_SEPARATOR = ':';
  const PATH_SEPARATOR = '/';
  let result = '';

  if (protocol) {
    result += protocol + PROTOCOL_SEPARATOR;
  }
  if (host) {
    result += host;
  }
  if (port) {
    result += PORT_SEPARATOR + port;
  }
  if (path) {
    if (!path.startsWith(PATH_SEPARATOR)) {
      result += PATH_SEPARATOR;
    }
    result += path;
  }

  return result;
}

/**
 * Globally replace a string
 * @param  {string} content rewrite this
 * @param  {string} search  search for this within the content
 * @param  {string} replace replace the match with this
 * @return {string}         The rewritten content
 */
function rewrite(content, search, replace) {
  let result = content;
  if (content && 'string' === typeof content) {
    result = content.replace(regexify(search), replace);
  }
  return result;
}

/**
 * The proxyRes callback to rewrite redirects
 * @param  {Object} proxyRes this is an Event maybe? It's got headers.
 * @param  {http.ClientRequest} req the request from the http server
 * @param  {http.ServerResponse} res the response from the http server
 * @param  {Object} options the configuration object of the proxy
 */
function rewriteRedirects(proxyRes, req, res, options) {
  proxyRes.headers[LOCATION] = rewrite(
    proxyRes.headers[LOCATION],
    predev.target.host,
    addressify(null, predev.source.host, predev.source.port)
  );
  proxyRes.headers[LOCATION] = rewrite(
    proxyRes.headers[LOCATION],
    login.target.host,
    addressify(null, login.source.host, login.source.port)
  );
}

/**
 * Creates a middleware callback ready to rewrite the body.
 * @param  {string} search search for this within the response body
 * @param  {string} replace replace the match with this
 * @return {function} a middleware filter
 */
function rewriteBody(search, replace) {
  return function(req, res) {
    let _write = res.write;
    res.write = function(data) {
      _write.call(res, rewrite(data.toString(), search, replace));
    };
    return true;
  };
}
