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
const LOCATION = 'location'
const HTTPS = 'https';
const HTTP = 'http';
const host = {
  'local': 'localhost',
  'predev': 'predev.my.wisc.edu',
  'login': 'logintest.wisc.edu',
}

///////////////////////////////////////
// HTTPS REDIRECT
///////////////////////////////////////
http.createServer(function (req, res) {
    res.writeHead(301, { LOCATION: addressify(HTTPS, host.local, 8443, req.url) });
    res.end();
}).listen(8081);

///////////////////////////////////////
// LOCAL STUB
///////////////////////////////////////
const localProxy = httpProxy.createProxyServer({
  target: addressify(HTTP, host.local, 8080),
  changeOrigin: true,
  autoRewrite: true
});

///////////////////////////////////////
// PREDEV SERVER
///////////////////////////////////////
const predevProxy = httpProxy.createProxyServer({
  target: addressify(HTTPS, host.predev), 
  secure: false,
  changeOrigin: true,
  autoRewrite: true
});
predevProxy.on('proxyRes', rewriteRedirects);
const predevConnect = connect()
  .use('/web', function(req, res) {
    req.url = req.originalUrl;
    console.log('LOCAL  ' + req.url);
    localProxy.web(req, res);
  })
  .use(function(req, res) {
    console.log('PREDEV ' + req.url);
    predevProxy.web(req, res);
  });
https.createServer(sslConfig, predevConnect).listen(8443);

///////////////////////////////////////
// LOGIN SERVER
///////////////////////////////////////
const loginProxy = httpProxy.createProxyServer({
  target: addressify(HTTPS, host.login),
  secure: false,
  changeOrigin: true,
  autoRewrite: true
});
loginProxy.on('proxyRes', rewriteRedirects);
const loginConnect = connect()
  .use(rewriteBody(host.predev, addressify(null, host.local, 8443)))
  .use(function(req, res) {
    console.log('LOGIN  ' + req.url);
    loginProxy.web(req, res);
  });
https.createServer(sslConfig, loginConnect).listen(8444);

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
 * @return {void}
 */
function rewriteRedirects(proxyRes, req, res, options) {
  proxyRes.headers[LOCATION] = rewrite(proxyRes.headers[LOCATION], host.predev, addressify(null, host.local, 8443));
  proxyRes.headers[LOCATION] = rewrite(proxyRes.headers[LOCATION], host.login, addressify(null, host.local, 8444));
}

/**
 * Creates a middleware callback ready to rewrite the body.
 * @param  {string} search search for this within the response body
 * @param  {string} replace replace the match with this
 * @return {void}
 */
function rewriteBody(search, replace) {
  return function(req, res, next) {
    let _write = res.write;
    res.write = function(data) {
      _write.call(res, rewrite(data.toString(), search, replace));
    };
    next();
  };
}
