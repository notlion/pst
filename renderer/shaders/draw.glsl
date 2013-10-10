//!name draw

precision highp float;
precision highp int;

uniform sampler2D position;
uniform mat4 transform;
uniform float side;

//!vertex

attribute float index;

void main() {
  float y = floor(index / side);
  float x = index - y * side;
  gl_Position = transform * texture2D(position, vec2(y / side, x / side));
}

//!fragment

void main() {
  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
