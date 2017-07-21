const fs = require('fs');
const https = require('https');
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
      headers[header] = headers[header].replace(/predev\.my\.wisc\.edu/g, "localhost:8443");
    }
  }
  for (let header in headers) {
    console.log(header);
    console.log(headers[header]);
  }
});

const server = https.createServer({
  key: fs.readFileSync('localhost-private.pem'),
  cert: fs.readFileSync('localhost-public.pem')
}, function(req, res) {
  proxy.web(req, res);
});

server.listen(8443);