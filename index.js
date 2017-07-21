const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  target:'https://predev.my.wisc.edu:443', 
  secure: false,
  changeOrigin: true,
  autoRewrite: true
});

proxy.on('proxyRes', function(proxyRes, req, res, options){
  const headers = proxyRes.headers;
  for (let header in headers) {
    if (header && headers[header] && 'string' === typeof headers[header]) {
      headers[header] = headers[header].replace(/https:\/\/predev\.my\.wisc\.edu/g, "http://localhost:8080");
    }
  }
  for (let header in headers) {
    console.log(header);
    console.log(headers[header]);
  }
});

const server = http.createServer(function(req, res) {
  proxy.web(req, res);
});

server.listen(8080);