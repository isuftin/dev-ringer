#!/usr/bin/env node
let DevRevServer = require('./DevRevServer');
let commandLine = require('command-line-args');

let optionsDefinitions = [
  {
    'name': 'port',
    'type': Number,
    'alias': 'p',
    'defaultValue': 3000
  },
];

let options = commandLine(optionsDefinitions);

let config = {
  port: options.port
}

let server = new DevRevServer(config);
