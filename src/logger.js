const moment = require('moment');
const term = require('terminal-kit').Terminal();

module.exports = msg => term.cyan.bold(
  `[${moment().format('YYYY/MM/DD HH:mm:ss')}] `
).white(`${msg}\n`);