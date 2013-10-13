//!name draw

precision highp float;
precision highp int;

uniform sampler2D position;
uniform mat4 projection, view;
uniform float side, pointSize, width;

//!vertex

attribute float index;

void main() {
  float y = floor(index / side);
  float x = index - y * side;

  vec4 pos = texture2D(position, vec2(y / side, x / side));

  vec4 eye = view * pos;
  vec4 proj = projection * vec4(pointSize, pointSize, eye.z, eye.w);
  gl_PointSize = clamp(width * proj.x / proj.w, 1.0, 10.0);

  gl_Position = projection * eye;
}

//!fragment

void main() {
  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
