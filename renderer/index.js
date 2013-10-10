'use strict';

var Glod = require('./glod');
var glmatrix = require('gl-matrix');
var mat4 = glmatrix.mat4;

Glod.preprocess(require('./shaders/debug.glsl.js'));
Glod.preprocess(require('./shaders/draw.glsl.js'));
Glod.preprocess(require('./shaders/step.glsl.js'));

module.exports = PstRenderer;

function PstRenderer() {
  this._texDim = 1 << 10;
  this._count = this._texDim * this._texDim;
  this.glod = new Glod();
}

Object.defineProperties(PstRenderer.prototype, {
  canvas: {
    get: function() {
      return this.glod.canvas();
    },
    set: function(canvas) {
      return this.glod.canvas(canvas);
    }
  },
  shader: {
    get: function() {
      return this._shaderSrc;
    },
    set: function(src) {
      this._shaderSrc = src;
      this.compile();
    }
  }
});

PstRenderer.prototype.init = function() {
  var glod = this.glod;

  var indices = new Array(this._count);
  for (var i = this._count; --i >= 0;) indices[i] = i;

  glod
    .clearColor(0.0, 0.0, 0.0, 1.0)
    .createProgram('debug')
    .createProgram('draw')
    .createProgram('step')
    .createVBO('index')
    .createTexture('position')
    .createVBO('quad')
    .uploadCCWQuad('quad')
    .createFBO('particles')
    .bufferDataStatic('index', indices)

  var gl = glod.gl();

  glod.bindTexture2D('position');
  gl.activeTexture(gl.TEXTURE0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this._texDim, this._texDim, 0, gl.RGBA, gl.FLOAT, null);

  glod.bindFramebuffer('particles');
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glod.texture('position'), 0);
};

PstRenderer.prototype.step = function() {
  var glod = this.glod;

  if (!this._startMillis) this._startMillis = Date.now();
  var time = (Date.now() - this._startMillis) / 1000;

  // Resize canvas
  var canvas = glod.canvas();
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  glod
    .bindFramebuffer('particles')
    .viewport(0, 0, this._texDim, this._texDim)
    .begin('step')
      .value('side', this._texDim)
      .value('count', this._count)
      .value('time', time)
      .pack('quad', 'position')
      .ready()
      .clear(true, true, true)
      .triangles()
      .drawArrays(0, 6)
    .end()

  // Debug Draw
  // glod
  //   .bindFramebuffer(null)
  //   .viewport()
  //   .begin('debug')
  //     .pack('quad', 'position')
  //     .value('texture', 0)
  //     .ready()
  //     .clear(true, true, true)
  //     .triangles()
  //     .drawArrays(0, 6)
  //   .end();

  var aspect = glod.canvas().clientWidth / glod.canvas().clientHeight;

  var projection = mat4.create();
  mat4.perspective(projection, Math.PI * 2 / 8, aspect, 0.1, 20000);

  var view = mat4.identity(mat4.create());
  mat4.translate(view, view, [0, 0, -5]);
  mat4.rotateY(view, view, time);

  var mvp = mat4.create();
  mat4.multiply(mvp, projection, view);

  // draw as individual points
  glod
    .bindFramebuffer(null)
    .viewport()
    .begin('draw')
      .pack('index', 'index')
      .value('side', this._texDim)
      .value('position', 0)
      .valuev('transform', mvp)
      .ready()
      .clear(true, true, true)
      .points()
      .drawArrays(0, this._count)
    .end();
};

PstRenderer.prototype.compile = function() {
  // Something;
};
