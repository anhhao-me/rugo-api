const fs = require('fs');
const yaml = require('yaml');
const path = require('path');

module.exports.requireYAML = function(...args){
  return yaml.parse(fs.readFileSync(path.join.apply(null, args)).toString());
}

module.exports.clone = function(obj){
  return JSON.parse(JSON.stringify(obj));
}