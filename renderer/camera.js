'use strict';

var glmatrix = require('gl-matrix');
var vec3 = glmatrix.vec3;
var mat4 = glmatrix.mat4;
var quat = glmatrix.quat;

module.exports = Camera;

function Camera(canvas, opts) {
  this.canvas = canvas;
  this.view        = opts.view        || mat4.create();
  this.projection  = opts.projection  || mat4.create();
  this.orientation = opts.orientation || quat.create();
  this.neutral     = opts.neutral     || quat.create();
  this.position    = opts.position    || vec3.fromValues(0, 0, -5);
  this.fovy        = opts.fovy        || Math.PI * 2 / 8;
  this._dragStartPos = vec3.create();
  this._dragStartOri = quat.create();
  this._dragging = false;
}

Camera.prototype.step = function() {
  if (!this._dragging) {
    quat.slerp(this.orientation, this.orientation, this.neutral, 0.1);
  }

  var aspect = this.canvas.clientWidth / this.canvas.clientHeight;
  mat4.perspective(this.projection, this.fovy, aspect, 0.01, 100);
  mat4.fromRotationTranslation(this.view, this.orientation, this.position);
};

Camera.prototype.startDrag = function(x, y) {
  calcCanvasSpherePoint(this._dragStartPos, x, y, this.canvas);
  quat.copy(this._dragStartOri, this.orientation);
  this._dragging = true;
};

Camera.prototype.drag = (function() {
  var dragToPos = vec3.create();
  var axis      = vec3.create();
  var rotation  = quat.create();
  return function(x, y) {
    calcCanvasSpherePoint(dragToPos, x, y, this.canvas);
    vec3.cross(axis, this._dragStartPos, dragToPos);

    var d = vec3.dot(this._dragStartPos, dragToPos);
    quat.set(rotation, axis[0], axis[1], axis[2], d);

    var ori = this.orientation;
    quat.multiply(ori, rotation, this._dragStartOri);
    quat.normalize(ori, ori);
  };
}());

Camera.prototype.endDrag = function(x, y) {
  this._dragging = false;
};

function calcCanvasSpherePoint(out, x, y, canvas) {
  var w2 = canvas.clientWidth / 2;
  var h2 = canvas.clientHeight / 2;
  var mx = Math.max(w2, h2);
  x = (x - w2) / mx;
  y = (y - h2) / mx;
  return calcSpherePoint(out, x, y);
}

function calcSpherePoint(out, x, y) {
  vec3.set(out, x, y, 0);
  var l2 = vec3.squaredLength(out);
  if(l2 < 1) out[2] = Math.sqrt(1 - l2);
  vec3.normalize(out, out);
}
