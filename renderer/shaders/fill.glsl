//!name fill

precision highp float;
precision highp int;

//!vertex

attribute vec4 position;

void main() {
  gl_Position = position;
}

//!fragment

uniform vec4 color;

void main() {
  gl_FragColor = color;
}
