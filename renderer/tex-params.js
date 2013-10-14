'use strict';

module.exports = function setTexParams(gl, params) {
  var minFilter = params.minFilter || params.filter || gl.NEAREST;
  var magFilter = params.magFilter || params.filter || gl.NEAREST;
  var wraps     = params.wrapS     || params.wrap   || gl.CLAMP_TO_EDGE;
  var wrapt     = params.wrapT     || params.wrap   || gl.CLAMP_TO_EDGE;

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wraps);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapt);
};
