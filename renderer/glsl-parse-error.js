'use strict';

var errorRegex = /ERROR: *(\d+):(\d+):(.*)/;

module.exports = function glslParseError(err) {
  var lines = err.toString().split('\n');
  var errors = [];
  lines.forEach(function(line) {
    var match = errorRegex.exec(line);
    if (match) {
      errors.push({
        line:    parseInt(match[2], 10),
        message: match[3].trim()
      });
    }
  });
  return errors;
};
