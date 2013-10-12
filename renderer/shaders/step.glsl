//!name step

precision highp float;
precision highp int;

uniform float side;
uniform float time;
uniform float count;

#define PI  3.141592653589793
#define TAU 6.283185307179586

//!vertex

attribute vec4 position;

void main() {
  gl_Position = position;
}

//!fragment

uniform sampler2D noiseLUT;

float noise(in vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
  vec2 rg = texture2D(noiseLUT, (uv + 0.5) / 256.0, -100.0).yx;
  return mix(rg.x, rg.y, f.z);
}

struct PrevPoint {
  vec4 pos;
  vec4 color;
};

struct Point {
  vec4 pos;
  vec4 color;
  vec2 uv;
  float index;
  PrevPoint prev;
};

//{{shaderSrc}}

void main() {
  Point point;

  point.pos = vec4(0.0, 0.0, 0.0, 1.0);
  point.color = vec4(1.0);
  point.uv = gl_FragCoord.xy / side;
  point.index = gl_FragCoord.x + gl_FragCoord.y * side;

  iter(point);

  gl_FragColor = point.pos;
}
