// var http = require('http');
var httpProxy = require('http-proxy');

httpProxy.createProxyServer({target:'https://predev.my.wisc.edu/'}).listen(8080);
