#!/usr/bin/env node
let DevRepServer = require('./DevRepServer');
let commandLine = require('command-line-args');

let optionsDefinitions = [
  {
    'name': 'port',
    'type': Number,
    'alias': 'p',
    'defaultValue': 3000
  },
  {
    'name': 'file',
    'type': String,
    'alias': 'f',
    'defaultValue': 'devrep.json'
  },
  {
    'name': 'HAR',
    'type': String,
    'alias': 'H'
  },
  {
    'name': 'interactive',
    'type': Boolean,
    'alias': 'i'
  },
];

let options = commandLine(optionsDefinitions);

let config = {
  port: options.port,
  configFile: options.file,
  harFile: options.HAR,
  runEditor: options.interactive
}

let server = new DevRepServer(config);
