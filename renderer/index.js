'use strict';

var path = require('path');
var Glod = require('./glod');
var glmatrix = require('gl-matrix');
var mat4 = glmatrix.mat4;

Glod.preprocess(require(path.join(__dirname, 'shaders', 'debug')));
Glod.preprocess(require(path.join(__dirname, 'shaders', 'draw')));
Glod.preprocess(require(path.join(__dirname, 'shaders', 'step')));

module.exports = function PstRenderer() {
  var side = 1 << 10;
  var count = side * side;

  var indices = [];
  for (var i = 0; i < count; i++) {
    indices.push(i);
  }

  var glod = Glod();

  glod
    .canvas('.main')
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

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, side, side, 0, gl.RGBA, gl.FLOAT, null);

  glod.bindFramebuffer('particles');
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glod.texture('position'), 0);

  var start = Date.now();

  var frame = function () {
    var elapsed = Date.now() - start;

    glod
      .bindFramebuffer('particles')
      .viewport(0, 0, side, side)
      .begin('step')
        .value('side', side)
        .value('elapsed', elapsed / 1000)
        .pack('quad', 'position')
        .ready()
        .clear(true, true, true)
        .triangles()
        .drawArrays(0, 6)
      .end();

    // // debug draw
    // glod
    // .bindFramebuffer(null)
    // .viewport()
    // .begin('debug')
    // .pack('quad', 'position')
    // .value('texture', 0)
    // .ready()
    // .clear(true, true, true)
    // .triangles()
    // .drawArrays(0, 6)
    // .end();

    var aspect = glod.canvas().width() / glod.canvas().height();

    var projection = perspective(Math.PI * 2 / 8, aspect, 0.1, 20000);
    var view = identity();
    var mvp = identity();
    view[14] = -5;
    rotateY(view, Math.PI * 2 * elapsed * 0.00001);
    mult(projection, view, mvp);

    // draw as individual points
    glod
      .bindFramebuffer(null)
      .viewport()
      .begin('draw')
        .pack('index', 'index')
        .value('side', side)
        .value('position', 0)
        .valuev('transform', mvp)
        .ready()
        .clear(true, true, true)
        .points()
        .drawArrays(0, count)
      .end();

    window.requestAnimationFrame(frame);
  }

  frame();
}
