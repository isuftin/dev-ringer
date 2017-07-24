const fs = require('fs');
const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');
const connect = require('connect');

const sslConfig = {
  key: fs.readFileSync('localhost-private.pem'),
  cert: fs.readFileSync('localhost-public.pem')
};

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

const predevConnect = connect();
predevConnect.use(function(req, res) {
  predevProxy.web(req, res);
});

https.createServer(sslConfig, predevConnect).listen(8443);


const loginProxy = httpProxy.createProxyServer({
  target:'https://logintest.wisc.edu',
  secure: false,
  changeOrigin: true,
  autoRewrite: true
});
loginProxy.on('proxyRes', function(proxyRes, req, res, options){
  const header = 'location';
  const headers = proxyRes.headers;
  if (header && headers[header] && 'string' === typeof headers[header]) {
    headers[header] = headers[header].replace(/predev\.my\.wisc\.edu/g, "localhost:8443");
    headers[header] = headers[header].replace(/logintest\.wisc\.edu/g, "localhost:8444");
  }
});

const loginConnect = connect();
loginConnect.use(function(req, res) {
  loginProxy.web(req, res);
})

https.createServer(sslConfig, loginConnect).listen(8444);
