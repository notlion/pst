//!name draw

precision highp float;
precision highp int;

uniform sampler2D position0;
uniform mat4 projection, view;
uniform float side, pointSize, width;

varying vec2 uv;

//!vertex

attribute float index;

void main() {
  float y = floor(index / side);
  uv = vec2(index - y * side, y) / side;

  vec4 pos = texture2D(position0, uv);

  vec4 eye = view * pos;
  vec4 proj = projection * vec4(pointSize, pointSize, eye.z, eye.w);
  gl_PointSize = clamp(width * proj.x / proj.w, 2.0, 10.0);

  gl_Position = projection * eye;
}

//!fragment

uniform sampler2D color0;

void main() {
  gl_FragColor = texture2D(color0, uv);
}
