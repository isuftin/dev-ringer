const connect = require('connect');
const { URL } = require('url');

const { HTTP, HTTPS, LOCATION, createServer, addressify } = require('./lib/common');
const DevRepConfig = require('./lib/DevRepConfiguration');
const Locator = require('./lib/Locator');
const ProxyEndpoint = require('./lib/ProxyEndpoint');
const { rewriteBody, rewriteHeader } = require('./lib/rewrites');
const Rule = require('./lib/Rule');

class DevRepServer {
  constructor(config) {
    let drpConf = DevRepConfig.fromHAR('work/predev.har.json');
    // let drpConf = DevRepConfig.fromDRP('work/predev.drp.json');
    drpConf.then((conf) => {
      console.log(JSON.stringify(conf, null, 2));
      let proxies = [];
      Object.entries(conf.servers).forEach(([key, value]) => {
        let sourceUrl = new URL(key);
        let source = new Locator({
          protocol: sourceUrl.protocol.slice(0, -1),
          host: sourceUrl.hostname,
          port: sourceUrl.port
        });
        let allPaths = (el) => {return '*' === el.path};
        let targetPath = value.proxyPaths.find(allPaths);
        let targetUrl = targetPath ? new URL(targetPath.origin) : null;
        let target = undefined;
        if (targetUrl) {
          target = new Locator({
            protocol: targetUrl.protocol.slice(0, -1),
            host: targetUrl.hostname,
            port: targetUrl.port
          });
        }
        let rules = [];
        value.contentRewrites.forEach(({search, replace}) => {
          if (search && replace) {
            rules.push(new Rule({
              handler: rewriteBody(
                new URL(search).host,
                new URL(replace).host
              ),
            }));
          }
        });
        value.locationRewrites.forEach(({search, replace}) => {
          if (search && replace) {
            rules.push(new Rule({
              handler: rewriteHeader(
                LOCATION,
                new URL(search).host,
                new URL(replace).host
              ),
            }));
          }
        });
        proxies.push(new ProxyEndpoint({source, target}, rules));
      });
      proxies.forEach((proxy) => {
        proxy.listen();
      });

      console.log('Server listening at ' + conf.entryPoint + ' Press ^C to quit.');
    }).catch((err) => {console.log(err)});

    return this;
  }
}

module.exports = DevRepServer;
