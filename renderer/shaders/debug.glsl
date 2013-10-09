//!name debug

precision highp float;
precision highp int;

varying vec2 uv;

uniform sampler2D texture;

//!vertex

attribute vec4 position;

void main() {
  gl_Position = position;
  uv = position.xy * 0.5 + 0.5;
}

//!fragment

void main() {
  gl_FragColor = texture2D(texture, uv);
}
