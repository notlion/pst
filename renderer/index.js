'use strict';

var Glod            = require('./glod');
var glslParseErrors = require('./glsl-parse-error');
var loadTexture     = require('./load-texture');

var EventEmitter = require('events').EventEmitter;

var glmatrix = require('gl-matrix');
var mat4     = glmatrix.mat4;

Glod.preprocess(require('./shaders/debug.glsl.js'));
Glod.preprocess(require('./shaders/draw.glsl.js'));
Glod.preprocess(require('./shaders/step.glsl.js'));

module.exports = PstRenderer;

function PstRenderer() {
  this._texDim = 1 << 10;
  this._count = this._texDim * this._texDim;
  this._shaderTemplate = Glod.preprocessed['step'].fragment;
  this.glod = new Glod();
  this.contextOptions = {
    antialias: true
  };
  this.textures = {
    'noiseLUT': 'noise-lut.png'
  };
}

PstRenderer.prototype = Object.create(EventEmitter.prototype);

Object.defineProperties(PstRenderer.prototype, {
  canvas: {
    get: function() {
      return this.glod.canvas();
    },
    set: function(canvas) {
      return this.glod.canvas(canvas, this.contextOptions);
    }
  },
  shader: {
    get: function() {
      return this._shaderSrc;
    },
    set: function(src) {
      this._shaderSrc = src;
      this._shaderSrcDirty = true;
    }
  }
});

PstRenderer.prototype.configure = function(config) {
  if (config.textureBaseUrl) {
    this._textureBaseUrl = config.textureBaseUrl;
    this.loadTextures();
  }
};

PstRenderer.prototype.loadTextures = function() {
  function createLoadCb(name) {
    return function(err, texture) {
      if (err) throw new Error(err);
      glod._textures[name] = texture
    };
  }
  var glod = this.glod, gl = glod.gl();
  var url;
  for (var name in this.textures) {
    url = this._textureBaseUrl + '/' + this.textures[name];
    loadTexture(gl, url, {
      filter: gl.LINEAR,
      wrap:   gl.REPEAT
    }, createLoadCb(name));
  }
};

PstRenderer.prototype.init = function() {
  var glod = this.glod;

  var indices = new Array(this._count);
  for (var i = this._count; --i >= 0;) indices[i] = i;

  glod.clearColor(0.0, 0.0, 0.0, 1.0)
      .createProgram('debug')
      .createProgram('draw')
      .createVBO('index')
      .createVBO('quad')
      .uploadCCWQuad('quad')
      .createFBO('particles')
      .bufferDataStatic('index', indices)

  var gl = glod.gl();
  var dim = this._texDim;

  function createFBOTexture(name) {
    glod.createTexture(name).bindTexture2D(name);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dim, dim, 0, gl.RGBA, gl.FLOAT, null);
  }

  glod.bindFramebuffer('particles');
  createFBOTexture('position', 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glod.texture('position'), 0);
  // createFBOTexture('color', 1);
};

PstRenderer.prototype.compile = function() {
  var glod = this.glod;

  // Save the existing program so we can restore it if compilation fails.
  var oldProgram = glod._programs['step'];
  delete glod._programs['step'];

  var token = '//{{shaderSrc}}';
  var tokenIndex = this._shaderTemplate.match(token).index;

  // Insert the shader fragment into the template.
  var src = this._shaderTemplate.slice(0, tokenIndex) + this._shaderSrc +
            this._shaderTemplate.slice(tokenIndex + token.length);

  // Inject the new templated frament shader into the preprocessed program.
  Glod.preprocessed['step'].fragment = src;

  try {
    glod.createProgram('step');
    this.emit('compile');
  }
  catch(err) {
    // Dang.. Compilation failed.
    // Restore the old shader and emit an error.
    glod._programs['step'] = oldProgram;

    if (!err.data) throw err;

    // Adjust error line numbers and emit.
    var errors = glslParseErrors(err.data);
    var lineAdjustment = -stringIndexToLineNum(src, tokenIndex);
    errors.forEach(function(error) {
      error.line += lineAdjustment;
    });
    this.emit('error', errors);
  }

  // No point in recompiling something that doesn't work and hasn't changed.
  this._shaderSrcDirty = false;
};

PstRenderer.prototype.step = function() {
  var glod = this.glod;

  if (!this._startMillis) this._startMillis = Date.now();
  var time = (Date.now() - this._startMillis) / 1000;

  // Resize canvas
  var canvas = glod.canvas();
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  if (this._shaderSrcDirty) this.compile();

  glod.bindFramebuffer('particles')
      .viewport(0, 0, this._texDim, this._texDim)

  if (glod.hasTexture('noiseLUT')) {
    glod.bindTexture2D('noiseLUT').activeTexture(0);
  }

  glod.begin('step')
        .value('side', this._texDim)
        .value('count', this._count)
        .value('time', time)
        .value('noiseLUT', 0)
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

  // draw as individual points
  glod
    .bindFramebuffer(null)
    .viewport()
    .bindTexture2D('position')
    .activeTexture(0)
    .begin('draw')
      .pack('index', 'index')
      .value('side', this._texDim)
      .value('width', glod.canvas().width)
      .value('pointSize', 0.001)
      .value('position', 0)
      .valuev('view', view)
      .valuev('projection', projection)
      .ready()
      .clear(true, true, true)
      .points()
      .drawArrays(0, this._count)
    .end();
};

function stringIndexToLineNum(str, index) {
  if (index <= 0) return 0;
  if (index >= str.length) {
    throw 'index is larger than the string length';
  }
  return str.slice(0, index + 1).trimRight().split('\n').length;
}
