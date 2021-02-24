const path = require('path');
const separator = path.sep;
const { requireYAML } = require('./src/utils');
const nodeEnv = process.env.NODE_ENV;
const NODE_CONFIG_DIR = path.join(__dirname, './configs');

const config = requireYAML(__dirname, `./configs/${nodeEnv}.yaml`);

const convert = (current) => {
  const result = Array.isArray(current) ? [] : {};

  Object.keys(current).forEach(name => {
    let value = current[name];

    if (typeof value === 'object' && value !== null) {
      value = convert(value);
    }

    if (typeof value === 'string') {
      if (value.indexOf('\\') === 0) {
        value = value.replace('\\', '');
      } else {
        if (process.env[value]) {
          value = process.env[value];
        }
        if (value.indexOf('./') === 0 || value.indexOf('../') === 0) {
          // Make relative paths absolute
          value = path.resolve(
            path.join(NODE_CONFIG_DIR),
            value.replace(/\//g, separator)
          );
        }
      }
    }

    result[name] = value;
  });

  return result;
};

module.exports = convert(config);

