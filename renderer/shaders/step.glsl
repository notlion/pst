//!name step

precision highp float;
precision highp int;

uniform float side;
uniform float elapsed;

#define PI  3.141592653589793
#define TAU 6.283185307179586

// Pseudo-random value [0, 1] at vec2 {p}, {x, y}, or {x}
float rand(vec2 p          ) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float rand(float x, float y) { return rand(vec2(x, y));                                       }
float rand(float x)          { return rand(vec2(x, 0.));                                      }

// Pseudo-random point on the unit-sphere
vec3 rand3(vec2 p) {
  float phi = rand(p) * PI * 2.;
  float ct = rand(p.yx) * 2. - 1.;
  float rho = sqrt(1. - ct * ct);
  return vec3(rho * cos(phi), rho * sin(phi), ct);
}

vec3 rand3(float x, float y) { return rand3(vec2(x, y)); }
vec3 rand3(float x         ) { return rand3(x, x * 2.);  }

//!vertex

attribute vec4 position;

void main() {
  gl_Position = position;
}

//!fragment

void main() {
  float index = gl_FragCoord.x + gl_FragCoord.y * side;
  vec2 uv = gl_FragCoord.xy / side;
	//gl_FragColor = vec4(uv, 1.0, 1.0);
	gl_FragColor = vec4(rand3(index), 1.);
  gl_FragColor.xyz *= cos(elapsed) + 2.;
	//gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
