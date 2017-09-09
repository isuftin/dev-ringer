const connect = require('connect');
const { HTTP, HTTPS, createServer, addressify } = require('./lib/common');
const fs = require('fs');
const through = require('through2');
const JSONStream = require('JSONStream');
const { URL } = require('url');

class DevRevServer {
  constructor(config) {
    let port = config.port;

    let devHostname = 'localhost';
    let devPort = {
      [HTTP]: 8081,
      [HTTPS]: 8443
    };

    let earliest = {
      time: new Date().toISOString(),
      url: null,
    }
    let hosts = {};
    let pageRefs = {};

    this.middleware = connect();
    this.app = createServer(HTTP, this.middleware);

    let gatherHosts = JSONStream.parse('log.entries.*');
    gatherHosts.on('header', data => {
      data.pages.forEach(el => {
        pageRefs[el.id] = new URL(el.title).origin;
      })
    });

    fs.createReadStream('work/predev.har.json')
    .pipe(gatherHosts)
    .pipe(through.obj(function(entry, enc, cb) {
      if (entry.startedDateTime < earliest.time) {
        earliest.time = entry.startedDateTime;
        earliest.url = entry.request.url;
      }

      let url = new URL(entry.request.url);
      let key = url.origin;
      if (!hosts[key]) {
        hosts[key] = {
          devOrigin: addressify(url.protocol.slice(0, -1), devHostname, devPort[url.protocol.slice(0, -1)]++),
          redirects: [],
          contentLinks: [],
        };
      }

      let redirect = (entry.response.redirectURL) ? new URL(entry.response.redirectURL, url.origin).origin : null;
      if (redirect && !hosts[key].redirects.includes(redirect)) {
        hosts[key].redirects.push(redirect);
      }

      let refererHeader = entry.request.headers.find(header => {
        return header.name === "Referer";
      });
      let referer = (refererHeader) ? new URL(refererHeader.value).origin : null;
      if (referer && !hosts[referer]) {
          hosts[referer] = {
            devOrigin: addressify(url.protocol.slice(0, -1), devHostname, devPort[url.protocol.slice(0, -1)]++),
            redirects: [],
            contentLinks: [],
          };
      }
      if (referer && !hosts[referer].contentLinks.includes(key)) {
        hosts[referer].contentLinks.push(key);
      }

      if (entry.pageRef && !hosts[pageRefs[entry.pageref]]) {
        hosts[pageRefs[entry.pageref]] = {
          devOrigin: addressify(url.protocol.slice(0, -1), devHostname, devPort[url.protocol.slice(0, -1)]++),
          redirects: [],
          contentLinks: [],
        };
      }
      if (entry.pageref && !hosts[pageRefs[entry.pageref]].contentLinks.includes(key)) {
        hosts[pageRefs[entry.pageref]].contentLinks.push(key);
      }

      cb();
    })).on('finish', () => {
      console.log('done populating hosts');
      console.log(hosts);
      console.log(earliest);
      this.app.listen(port, function () {
        console.log('Server listening at http://localhost:' + port + '/ Press ^C to quit.');
      });
    });



    return this;
  }
}

module.exports = DevRevServer;
