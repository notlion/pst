'use strict';

var Glod            = require('./glod');
var FramebufferRing = require('./framebuffer-ring');
var glslParseError  = require('./glsl-parse-error');
var loadTexture     = require('./load-texture');
var debounce        = require('./debounce');

var EventEmitter    = require('events').EventEmitter;

var glmatrix        = require('gl-matrix');
var mat4            = glmatrix.mat4;

// Glod.preprocess(require('./shaders/debug.glsl.js'));
Glod.preprocess(require('./shaders/draw.glsl.js'));
Glod.preprocess(require('./shaders/step.glsl.js'));
Glod.preprocess(require('./shaders/fill.glsl.js'));

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
  this.setShaderDirty = debounce(function() {
    this._shaderSrcDirty = true;
  }.bind(this), 500);
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
      if (!this._shaderSrc) this._shaderSrcDirty = true;
      else this.setShaderDirty();
      this._shaderSrc = src;
    }
  }
});

PstRenderer.prototype.configure = function(config) {
  if (config.textureBaseUrl) {
    this._textureBaseUrl = config.textureBaseUrl;
    this.loadTextures();
  }
};

PstRenderer.prototype.init = function() {
  var glod = this.glod;

  var indices = new Array(this._count);
  for (var i = this._count; --i >= 0;) indices[i] = i;

  glod
  .clearColor(0.0, 0.0, 0.0, 1.0)
  // .createProgram('debug')
  .createProgram('fill')
  .createProgram('draw')
  .createVBO('index')
  .createVBO('quad')
  .uploadCCWQuad('quad')
  .bufferDataStatic('index', indices)

  var gl = glod.gl();

  var texOpts = {
    width:  this._texDim,
    height: this._texDim,
    type:   gl.FLOAT
  };
  this._positionRing = new FramebufferRing(glod, 'position').alloc(3, texOpts);
  this._colorRing = new FramebufferRing(glod, 'color').alloc(3, texOpts);

  this.reset();
};

PstRenderer.prototype.reset = function() {
  var dim = this._texDim;
  var glod = this.glod;

  [ 'position1', 'color1',
    'position2', 'color2' ]
  .forEach(function(name) {
    glod
    .bindFramebuffer(name)
    .viewport(0, 0, dim, dim)
    .begin('fill')
      .valuev('color', [0.0, 0.0, 0.0, 1.0])
      .pack('quad', 'position')
      .ready()
      .triangles()
      .drawArrays(0, 6)
    .end()
  });
}

PstRenderer.prototype.step = function() {
  var glod = this.glod;

  if (!this._startMillis) this._startMillis = Date.now();
  var time = (Date.now() - this._startMillis) / 1000;

  var dim = this._texDim, count = this._count;

  // Resize canvas
  var canvas = glod.canvas();
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  if (this._shaderSrcDirty) this.compile();

  function renderStepPass(passName) {
    glod
    .bindFramebuffer(passName + 0)
    .viewport(0, 0, dim, dim)
    .activeTexture(0).bindTexture2D('position1')
    .activeTexture(1).bindTexture2D('position2')
    .activeTexture(2).bindTexture2D('color1')
    .activeTexture(3).bindTexture2D('color2')

    if (glod.hasTexture('noiseLUT')) {
      glod.activeTexture(4).bindTexture2D('noiseLUT');
    }

    glod
    .begin('step')
      .value('side', dim)
      .value('count', count)
      .value('time', time)
      .value('position1', 0)
      .value('position2', 1)
      .value('color1', 2)
      .value('color2', 3)
      .value('noiseLUT', 4)
      .value('colorPass', passName === 'color')
      .pack('quad', 'position')
      .ready()
      .triangles()
      .drawArrays(0, 6)
    .end()
  }

  renderStepPass('position');
  renderStepPass('color');

  var aspect = glod.canvas().clientWidth / glod.canvas().clientHeight;

  var projection = mat4.create();
  mat4.perspective(projection, Math.PI * 2 / 8, aspect, 0.1, 20000);

  var view = mat4.identity(mat4.create());
  mat4.translate(view, view, [0, 0, -5]);

  // draw as individual points
  glod
  .bindFramebuffer(null)
  .viewport()
  .activeTexture(0).bindTexture2D('position0')
  .activeTexture(1).bindTexture2D('color0')
  .begin('draw')
    .pack('index', 'index')
    .value('side', this._texDim)
    .value('width', glod.canvas().width)
    .value('pointSize', 0.001)
    .value('position0', 0)
    .value('color0', 1)
    .valuev('view', view)
    .valuev('projection', projection)
    .ready()
    .clear(true, true, true)
    .points()
    .drawArrays(0, this._count)
  .end();

  this._positionRing.rotate();
  this._colorRing.rotate();
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
    var errors = glslParseError(err.data);
    var lineAdjustment = -stringIndexToLineNum(src, tokenIndex);
    errors.forEach(function(error) {
      error.line += lineAdjustment;
    });
    this.emit('error', errors);
  }

  // No point in recompiling something that doesn't work and hasn't changed.
  this._shaderSrcDirty = false;
};

function stringIndexToLineNum(str, index) {
  if (index <= 0) return 0;
  if (index >= str.length) {
    throw 'index is larger than the string length';
  }
  return str.slice(0, index + 1).trimRight().split('\n').length;
}
