const connect = require('connect');
const { URL } = require('url');

const { HTTP, HTTPS, LOCATION, createServer, addressify } = require('./lib/common');
const DevRingerConfig = require('./lib/DevRingerConfiguration');
const Locator = require('./lib/Locator');
const ProxyEndpoint = require('./lib/ProxyEndpoint');
const { rewriteBody, rewriteHeader } = require('./lib/rewrites');
const Rule = require('./lib/Rule');

class DevRingerServer {
  constructor(config) {
    let drpConf = null;

    if (config.harFile) {
      drpConf = DevRingerConfig.fromHAR(config.harFile, config.harOptions);
      if (config.outputFile) {
        drpConf.then((conf) => {
          DevRingerConfig.toDRP(config.outputFile, JSON.stringify(conf, null, 2));
        })
      }
    } else if (config.configFile) {
      drpConf = DevRingerConfig.fromDRP(config.configFile);
    }

    if (!drpConf) {
      throw new Error('No configuration found!');
    }
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
        let isAllPaths = (el) => {return '*' === el.path};
        let targetPath = value.proxyPaths.find(isAllPaths);
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
        value.proxyPaths.forEach(({path, rewrites = [], origin}) => {
          if (!isAllPaths(path)) {
            let originUrl = new URL(origin);
            let offshoot = new ProxyEndpoint({
              target: new Locator({
                protocol: originUrl.protocol.slice(0, -1),
                host: originUrl.hostname,
                port: originUrl.port
              })
            });
            rules.push(new Rule({
              path: path,
              handler: function(req, res) {
                req.url = req.originalUrl;
                offshoot.proxy.web(req, res);
                return false;
              },
            }));
          }
        });
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

module.exports = DevRingerServer;
