'use strict';

var texParams = require('./tex-params');

module.exports = FramebufferRing;

function FramebufferRing(glod, name) {
  this.glod = glod;
  this.name = name;
}

FramebufferRing.prototype.alloc = function(count, opts) {
  this.count = count;
  for (var i = 0; i < count; ++i) {
    createFramebuffer(this.glod, this.name + i, opts);
  }
  return this;
};

// 0 <- 2 <- 1 <- 0
FramebufferRing.prototype.rotate = function() {
  var glod = this.glod;
  var name = this.name, count = this.count, last = count - 1;

  var lastName = name + (count - 1);
  var lastFbo = glod.fbo(lastName);
  var lastTex = glod.texture(lastName);

  var fromName, toName;
  for (var i = count; --i > 0;) {
    toName   = name + i;
    fromName = name + (i - 1);
    glod._fbos[toName] = glod.fbo(fromName);
    glod._textures[toName] = glod.texture(fromName);
  }

  glod._fbos[name + 0] = lastFbo;
  glod._textures[name + 0] = lastTex;

  return this;
};

function createFramebuffer(glod, name, opts) {
  if (!opts) throw new Error('Must specify opts');
  if (!opts.width || !opts.height) {
    throw new Error('Must specify width / height');
  }

  glod
  .createFBO(name).bindFramebuffer(name)
  .createTexture(name).bindTexture2D(name);

  var gl = glod.gl();

  texParams(gl, opts);

  var iformat = opts.internalFormat || gl.RGBA;
  var format  = opts.format         || gl.RGBA;
  var type    = opts.type           || gl.UNSIGNED_BYTE;

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, opts.width, opts.height, 0, gl.RGBA, gl.FLOAT, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glod.texture(name), 0);

  glod.bindFramebuffer(null).bindTexture2D(null);
}
