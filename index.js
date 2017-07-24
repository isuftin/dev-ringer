const fs = require('fs');
const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');

http.createServer(function (req, res) {
    res.writeHead(301, { 'Location': 'https://localhost:8443' + req.url });
    res.end();
}).listen(8080);

const predevProxy = httpProxy.createProxyServer({
  target:'https://predev.my.wisc.edu', 
  secure: false,
  changeOrigin: true,
  autoRewrite: true
});

predevProxy.on('proxyRes', function(proxyRes, req, res, options){
  const header = 'location';
  const headers = proxyRes.headers;
  if (header && headers[header] && 'string' === typeof headers[header]) {
    headers[header] = headers[header].replace(/predev\.my\.wisc\.edu/g, "localhost:8443");
    headers[header] = headers[header].replace(/logintest\.wisc\.edu/g, "localhost:8444");
  }
});

const server = https.createServer({
  key: fs.readFileSync('localhost-private.pem'),
  cert: fs.readFileSync('localhost-public.pem')
}, function(req, res) {
  predevProxy.web(req, res);
});

server.listen(8443);

const loginProxy = httpProxy.createProxyServer({
  target:'https://logintest.wisc.edu',
  ssl: {
    key: fs.readFileSync('localhost-private.pem'),
    cert: fs.readFileSync('localhost-public.pem')
  },
  secure: false,
  changeOrigin: true,
  autoRewrite: true
}).on('proxyRes', function(proxyRes, req, res, options){
  const header = 'location';
  const headers = proxyRes.headers;
  if (header && headers[header] && 'string' === typeof headers[header]) {
    headers[header] = headers[header].replace(/predev\.my\.wisc\.edu/g, "localhost:8443");
    headers[header] = headers[header].replace(/logintest\.wisc\.edu/g, "localhost:8444");
  }
}).listen(8444);