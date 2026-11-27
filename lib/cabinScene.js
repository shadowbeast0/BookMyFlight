import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildAirliner, GROUND, HALF, LEN } from './planeScene.js';

const FLOOR = -0.75;
const CUT = 0.3;
const X0 = -10.6;
const X1 = 14.15;
const RAD = 1.9;
const DOOR_X = 13.6;
const DOOR_HALF = 0.5;
const DOOR_TOP = 1.25;
const WIN_W = 0.4;
const WIN_H = 0.58;
const WINDOWS_X = [];
for (let x = -9.5; x <= 11; x += 0.92) if (Math.abs(x - 10.2) >= 0.5 && Math.abs(x + 8.2) >= 0.5) WINDOWS_X.push(x);
const SEAT_Z = {
  narrow: { A: 1.36, B: 0.9, C: 0.44, D: -0.44, E: -0.9, F: -1.36 },
  wide: { A: 1.22, C: 0.52, D: -0.52, F: -1.22 },
};

const PRESETS = [
  { h: 0, zenith: [0.01, 0.015, 0.05], mid: [0.03, 0.05, 0.13], horizon: [0.09, 0.11, 0.22], ground: [0.03, 0.035, 0.07], sun: [0.35, 0.42, -0.84], sunCol: [0.75, 0.82, 1], glow: 0.25, stars: 1, cShadow: [0.03, 0.04, 0.08], cBright: [0.3, 0.36, 0.52], haze: [0.07, 0.09, 0.17], hSky: [0.44, 0.51, 0.79], hGround: [0.05, 0.05, 0.1], hI: 0.35, sunI: 0.7, exposure: 0.95, facade: 1 },
  { h: 3.9, zenith: [0.01, 0.015, 0.05], mid: [0.03, 0.05, 0.13], horizon: [0.09, 0.11, 0.22], ground: [0.03, 0.035, 0.07], sun: [0.35, 0.42, -0.84], sunCol: [0.75, 0.82, 1], glow: 0.25, stars: 1, cShadow: [0.03, 0.04, 0.08], cBright: [0.3, 0.36, 0.52], haze: [0.07, 0.09, 0.17], hSky: [0.44, 0.51, 0.79], hGround: [0.05, 0.05, 0.1], hI: 0.35, sunI: 0.7, exposure: 0.95, facade: 1 },
  { h: 5.9, zenith: [0.08, 0.12, 0.32], mid: [0.42, 0.36, 0.62], horizon: [1, 0.62, 0.45], ground: [0.35, 0.3, 0.4], sun: [0.8, 0.06, 0.6], sunCol: [1, 0.7, 0.5], glow: 0.6, stars: 0.15, cShadow: [0.3, 0.27, 0.45], cBright: [1, 0.78, 0.7], haze: [0.75, 0.6, 0.62], hSky: [1, 0.85, 0.8], hGround: [0.3, 0.27, 0.4], hI: 0.5, sunI: 2, exposure: 0.85, facade: 0.6 },
  { h: 8.5, zenith: [0.12, 0.32, 0.75], mid: [0.38, 0.6, 0.9], horizon: [0.8, 0.88, 0.97], ground: [0.55, 0.62, 0.7], sun: [0.6, 0.45, 0.66], sunCol: [1, 0.93, 0.82], glow: 0.35, stars: 0, cShadow: [0.55, 0.62, 0.75], cBright: [1, 1, 1], haze: [0.78, 0.85, 0.95], hSky: [0.8, 0.88, 1], hGround: [0.45, 0.45, 0.5], hI: 0.65, sunI: 2.6, exposure: 0.75, facade: 0.15 },
  { h: 13, zenith: [0.08, 0.25, 0.68], mid: [0.3, 0.55, 0.9], horizon: [0.75, 0.85, 0.97], ground: [0.5, 0.58, 0.68], sun: [-0.2, 0.85, 0.5], sunCol: [1, 0.97, 0.92], glow: 0.3, stars: 0, cShadow: [0.58, 0.65, 0.78], cBright: [1, 1, 1], haze: [0.76, 0.84, 0.95], hSky: [0.85, 0.9, 1], hGround: [0.45, 0.45, 0.5], hI: 0.7, sunI: 2.8, exposure: 0.72, facade: 0.1 },
  { h: 17.3, zenith: [0.1, 0.16, 0.42], mid: [0.45, 0.4, 0.65], horizon: [1, 0.62, 0.36], ground: [0.45, 0.33, 0.4], sun: [-0.55, 0.16, 0.82], sunCol: [1, 0.75, 0.5], glow: 0.55, stars: 0, cShadow: [0.3, 0.25, 0.42], cBright: [1, 0.72, 0.52], haze: [0.8, 0.55, 0.48], hSky: [1, 0.85, 0.72], hGround: [0.23, 0.18, 0.4], hI: 0.45, sunI: 2.6, exposure: 0.78, facade: 0.35 },
  { h: 19.3, zenith: [0.03, 0.04, 0.16], mid: [0.2, 0.15, 0.42], horizon: [0.95, 0.5, 0.3], ground: [0.42, 0.3, 0.42], sun: [-0.6, 0.02, 0.8], sunCol: [1, 0.55, 0.35], glow: 0.5, stars: 0.35, cShadow: [0.17, 0.13, 0.3], cBright: [0.98, 0.64, 0.46], haze: [0.7, 0.42, 0.38], hSky: [1, 0.85, 0.72], hGround: [0.23, 0.18, 0.4], hI: 0.4, sunI: 1.6, exposure: 0.82, facade: 0.8 },
  { h: 21.5, zenith: [0.01, 0.015, 0.05], mid: [0.03, 0.05, 0.13], horizon: [0.09, 0.11, 0.22], ground: [0.03, 0.035, 0.07], sun: [0.35, 0.42, -0.84], sunCol: [0.75, 0.82, 1], glow: 0.25, stars: 1, cShadow: [0.03, 0.04, 0.08], cBright: [0.3, 0.36, 0.52], haze: [0.07, 0.09, 0.17], hSky: [0.44, 0.51, 0.79], hGround: [0.05, 0.05, 0.1], hI: 0.35, sunI: 0.7, exposure: 0.95, facade: 1 },
];

const seatPositionOf = (seat) => { const l = seat.slice(-1); return l === 'A' || l === 'F' ? 'window' : l === 'C' || l === 'D' ? 'aisle' : 'middle'; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };

function presetAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let a = PRESETS[0];
  let b = PRESETS[1];
  for (let i = 0; i < PRESETS.length - 1; i++) {
    if (h >= PRESETS[i].h && h <= PRESETS[i + 1].h) { a = PRESETS[i]; b = PRESETS[i + 1]; break; }
    if (h > PRESETS[PRESETS.length - 1].h) { a = PRESETS[PRESETS.length - 1]; b = { ...PRESETS[0], h: 24 }; }
  }
  const k = smooth((h - a.h) / Math.max(0.001, b.h - a.h));
  const out = {};
  for (const key of Object.keys(a)) {
    if (key === 'h') continue;
    const va = a[key];
    const vb = b[key];
    out[key] = Array.isArray(va) ? va.map((x, i) => x + (vb[i] - x) * k) : va + (vb - va) * k;
  }
  return out;
}

function box(w, h, d, x, y, z, rx = 0, shade = 1) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  if (rx) g.rotateZ(rx);
  g.translate(x, y, z);
  const n = g.attributes.position.count;
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(shade), 3));
  return g;
}

function economySeat() {
  return mergeGeometries([
    box(0.46, 0.13, 0.42, 0.02, 0.42, 0, 0, 0.62),
    box(0.1, 0.72, 0.42, -0.21, 0.8, 0, 0.12, 1),
    box(0.12, 0.16, 0.34, -0.26, 1.18, 0, 0.12, 1.5),
    box(0.4, 0.05, 0.05, 0.0, 0.56, 0.22, 0, 0.3),
    box(0.4, 0.05, 0.05, 0.0, 0.56, -0.22, 0, 0.3),
    box(0.05, 0.38, 0.05, 0.12, 0.18, 0.17, 0, 0.25),
    box(0.05, 0.38, 0.05, 0.12, 0.18, -0.17, 0, 0.25),
    box(0.05, 0.38, 0.05, -0.16, 0.18, 0.17, 0, 0.25),
    box(0.05, 0.38, 0.05, -0.16, 0.18, -0.17, 0, 0.25),
  ]);
}

function premiumSeat() {
  return mergeGeometries([
    box(0.52, 0.15, 0.46, 0.04, 0.44, 0, 0, 0.62),
    box(0.12, 0.8, 0.46, -0.23, 0.86, 0, 0.16, 1),
    box(0.14, 0.2, 0.38, -0.3, 1.28, 0, 0.16, 1.5),
    box(0.1, 0.3, 0.4, 0.33, 0.3, 0, -0.5, 0.55),
    box(0.46, 0.08, 0.07, 0.02, 0.6, 0.25, 0, 0.3),
    box(0.46, 0.08, 0.07, 0.02, 0.6, -0.25, 0, 0.3),
    box(0.5, 0.36, 0.42, 0.02, 0.18, 0, 0, 0.28),
  ]);
}

function businessSeat() {
  return mergeGeometries([
    box(1.15, 0.14, 0.58, 0.15, 0.46, 0, 0, 0.42),
    box(0.14, 0.86, 0.58, -0.42, 0.9, 0, 0.24, 0.5),
    box(0.16, 0.22, 0.46, -0.52, 1.34, 0, 0.24, 0.8),
    box(1.4, 0.95, 0.06, 0.08, 0.48, 0.34, 0, 1),
    box(1.4, 0.95, 0.06, 0.08, 0.48, -0.34, 0, 1),
    box(0.06, 0.95, 0.68, -0.62, 0.48, 0, 0, 1),
    box(0.4, 0.5, 0.18, 0.55, 0.25, 0.22, 0, 0.85),
    box(0.04, 0.3, 0.38, 0.8, 0.85, 0, 0, 0.12),
    box(1.0, 0.36, 0.5, 0.15, 0.2, 0, 0, 0.3),
  ]);
}

function skyMaterial(u) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: u,
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uGround;
      uniform vec3 uSun; uniform vec3 uSunCol; uniform float uGlow; uniform float uStars;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.18, h));
        col = mix(col, uZenith, smoothstep(0.18, 0.75, h));
        col = mix(col, uGround, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, normalize(uSun)), 0.0);
        col += uSunCol * pow(s, 10.0) * uGlow * 0.8;
        col += uSunCol * pow(s, 900.0) * 2.2;
        vec3 cell = floor(d * 320.0);
        float r = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float tw = fract(sin(dot(cell, vec3(4.1, 7.7, 1.3))) * 9182.31);
        col += vec3(0.85, 0.9, 1.0) * step(0.9972, r) * (0.5 + tw) * smoothstep(0.02, 0.3, h) * uStars;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function cloudMaterial(u) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: u,
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uSun; uniform vec3 uShadow; uniform vec3 uBright; uniform vec3 uHaze; uniform float uOpacity;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; } return v; }
      void main() {
        vec2 p = vW.xz * 0.028 + vec2(uTime * 0.04, 0.0);
        float d = fbm(p) * 0.75 + fbm(p * 3.1 + 4.0) * 0.35;
        float dens = smoothstep(0.38, 0.85, d);
        vec3 sd = normalize(uSun);
        float lit = clamp((d - fbm(p + sd.xz * 0.18) * 0.75 - fbm(p * 3.1 + 4.0 + sd.xz * 0.5) * 0.35) * 3.0 + 0.45, 0.0, 1.0) * (0.35 + dens * 0.65);
        vec3 col = mix(uShadow, uBright, lit);
        float dist = length(vW.xz);
        float fade = 1.0 - smoothstep(180.0, 520.0, dist);
        col = mix(col, uHaze, smoothstep(80.0, 460.0, dist));
        gl_FragColor = vec4(col, (0.35 + dens * 0.65) * fade * uOpacity);
      }`,
  });
}

function shellAlpha(length, mid, withDoor) {
  const W = 2048;
  const H = 2048;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#000';
  const angH = WIN_H / RAD / (Math.PI * 2);
  const winW = WIN_W / length;
  const row = (x) => (0.5 + (x - mid) / length) * H;
  for (const u of [15 / 360, 0.5 - 15 / 360]) {
    for (const x of WINDOWS_X) {
      g.beginPath();
      g.roundRect((u - angH / 2) * W, row(x) - (winW * H) / 2, angH * W, winW * H, 22);
      g.fill();
    }
  }
  if (withDoor) {
    const t0 = Math.asin(FLOOR / RAD) / (Math.PI * 2);
    const t1 = Math.asin(DOOR_TOP / RAD) / (Math.PI * 2);
    const top = row(DOOR_X + DOOR_HALF);
    const bottom = row(DOOR_X - DOOR_HALF);
    g.fillRect((1 + t0) * W, Math.min(top, bottom), -t0 * W, Math.abs(bottom - top));
    g.fillRect(0, Math.min(top, bottom), t1 * W, Math.abs(bottom - top));
  }
  return new THREE.CanvasTexture(c);
}

function skinDoorAlpha() {
  const W = 512;
  const H = 2048;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#000';
  const R = 2;
  const u0 = Math.asin(-FLOOR / R) / (Math.PI * 2);
  const u1 = Math.asin(DOOR_TOP / R) / (Math.PI * 2);
  const row = (x) => (1 - (x + HALF) / LEN) * H;
  const top = row(DOOR_X + DOOR_HALF);
  const bottom = row(DOOR_X - DOOR_HALF);
  g.fillRect(0, top, u0 * W, bottom - top);
  g.fillRect((1 - u1) * W, top, u1 * W, bottom - top);
  return new THREE.CanvasTexture(c);
}

function labelSprite(text) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffb45e';
  g.beginPath();
  g.roundRect(28, 8, 200, 84, 26);
  g.fill();
  g.beginPath();
  g.moveTo(108, 90);
  g.lineTo(128, 120);
  g.lineTo(148, 90);
  g.fill();
  g.fillStyle = '#1a0e05';
  g.font = '800 54px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(0.9, 0.45, 1);
  s.renderOrder = 10;
  return s;
}

function apronTexture(gate) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#3c3f47';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`;
    g.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 40, 2 + Math.random() * 40);
  }
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 2;
  for (let i = 0; i <= S; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke();
  }
  const px = (x) => ((x + 80) / 160) * S;
  const pz = (z) => ((z + 80) / 160) * S;
  g.strokeStyle = '#e8b52e';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(px(-80), pz(0));
  g.lineTo(px(14.2), pz(0));
  g.stroke();
  g.lineWidth = 10;
  g.beginPath();
  g.moveTo(px(14.4), pz(-3));
  g.lineTo(px(14.4), pz(3));
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 4;
  g.setLineDash([24, 18]);
  for (const z of [-26, 13.6]) {
    g.beginPath();
    g.moveTo(px(-80), pz(z));
    g.lineTo(px(80), pz(z));
    g.stroke();
  }
  g.setLineDash([]);
  g.save();
  g.translate(px(22), pz(-6));
  g.rotate(-Math.PI / 2);
  g.fillStyle = '#e8b52e';
  g.font = '800 64px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText(gate, 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function facadeTextures() {
  const W = 1024;
  const H = 128;
  const make = (lit) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = lit ? '#000' : '#1e2430';
    g.fillRect(0, 0, W, H);
    for (let x = 6; x < W; x += 22) {
      for (const [y, h] of [[10, 52], [70, 48]]) {
        if (lit) {
          const on = Math.random();
          g.fillStyle = on > 0.25 ? `rgba(255,${200 + Math.random() * 40},${140 + Math.random() * 60},${0.5 + on * 0.5})` : '#000';
        } else g.fillStyle = `rgb(${40 + Math.random() * 20},${60 + Math.random() * 25},${85 + Math.random() * 30})`;
        g.fillRect(x, y, 18, h);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: make(false), emissive: make(true) };
}

function buildGate(gateName, lite) {
  const gate = new THREE.Group();
  const groundMat = new THREE.MeshStandardMaterial({ color: '#33363d', roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND - 0.02;
  gate.add(ground);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ map: apronTexture(gateName), roughness: 0.9 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, GROUND, 0);
  gate.add(apron);

  const fac = facadeTextures();
  const facadeMat = new THREE.MeshStandardMaterial({ map: fac.map, emissiveMap: fac.emissive, emissive: new THREE.Color('#ffd9a8'), emissiveIntensity: 1, roughness: 0.35, metalness: 0.3 });
  fac.map.wrapS = fac.emissive.wrapS = THREE.RepeatWrapping;
  fac.map.repeat.x = fac.emissive.repeat.x = 3;
  const wallMat = new THREE.MeshStandardMaterial({ color: '#2a2f3b', roughness: 0.7 });
  const terminal = new THREE.Mesh(new THREE.BoxGeometry(150, 10, 18), [wallMat, wallMat, wallMat, wallMat, wallMat, facadeMat]);
  terminal.position.set(-10, GROUND + 5, 16 + 9);
  gate.add(terminal);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(154, 0.6, 22), new THREE.MeshStandardMaterial({ color: '#d6d9df', roughness: 0.5, metalness: 0.4 }));
  roof.position.set(-10, GROUND + 10.3, 16 + 8);
  gate.add(roof);

  const metal = new THREE.MeshStandardMaterial({ color: '#c3c7cf', roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide });
  const glass = new THREE.MeshStandardMaterial({ color: '#86a7d6', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const dark = new THREE.MeshStandardMaterial({ color: '#16181d', roughness: 0.8 });
  const bridge = new THREE.Group();
  const floorY = FLOOR;
  const tunnelZ0 = 4.4;
  const tunnelZ1 = 16;
  const len = tunnelZ1 - tunnelZ0;
  const tz = (tunnelZ0 + tunnelZ1) / 2;
  bridge.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, len), metal).translateX(DOOR_X).translateY(floorY - 0.06).translateZ(tz));
  bridge.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, len), metal).translateX(DOOR_X).translateY(floorY + 2.4).translateZ(tz));
  for (const sx of [-1, 1]) {
    bridge.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, len), metal).translateX(DOOR_X + sx * 1.3).translateY(floorY + 0.45).translateZ(tz));
    bridge.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, len), glass).translateX(DOOR_X + sx * 1.3).translateY(floorY + 1.28).translateZ(tz));
    bridge.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, len), metal).translateX(DOOR_X + sx * 1.3).translateY(floorY + 2.02).translateZ(tz));
  }
  const cabLen = tunnelZ0 - 2.05;
  const cz = (tunnelZ0 + 2.05) / 2;
  bridge.add(new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, cabLen), metal).translateX(DOOR_X).translateY(floorY - 0.06).translateZ(cz));
  bridge.add(new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, cabLen), metal).translateX(DOOR_X).translateY(floorY + 2.5).translateZ(cz));
  for (const sx of [-1, 1]) bridge.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.5, cabLen), glass).translateX(DOOR_X + sx * 1.5).translateY(floorY + 1.25).translateZ(cz));
  for (const sx of [-1, 1]) bridge.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.5), dark).translateX(DOOR_X + sx * 1.15).translateY(floorY + 1.3).translateZ(2.25));
  bridge.add(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.25, 0.5), dark).translateX(DOOR_X).translateY(floorY + 2.5).translateZ(2.25));
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, len), new THREE.MeshBasicMaterial({ color: '#fff1dc' }));
  strip.position.set(DOOR_X, floorY + 2.33, tz);
  bridge.add(strip);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, floorY - GROUND, 16), metal);
  column.position.set(DOOR_X, (floorY + GROUND) / 2, 7.5);
  bridge.add(column);
  const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1), dark);
  bogie.position.set(DOOR_X, GROUND + 0.3, 7.5);
  bridge.add(bogie);
  gate.add(bridge);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.1), new THREE.MeshStandardMaterial({ color: '#e8eaf0', roughness: 0.35, metalness: 0.2 }));
  panel.position.set(DOOR_X + 1.25, 0.25, 2.2);
  panel.rotation.y = -0.25;
  gate.add(panel);

  const lampMat = new THREE.MeshBasicMaterial({ color: '#fff2d6' });
  for (const [x, z] of [[-42, -38], [-80, -12], [64, 10], [30, 13]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 24, 8), metal);
    pole.position.set(x, GROUND + 12, z);
    gate.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 1.2), lampMat);
    head.position.set(x, GROUND + 24.2, z);
    gate.add(head);
  }
  if (!lite) {
    const tug = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 2), new THREE.MeshStandardMaterial({ color: '#e8b52e', roughness: 0.6 }));
    tug.position.set(22, GROUND + 0.7, -2);
    gate.add(tug);
    for (let i = 0; i < 3; i++) {
      const cart = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1.8), new THREE.MeshStandardMaterial({ color: '#59606e', roughness: 0.7 }));
      cart.position.set(-6 - i * 3.2, GROUND + 0.9, -9);
      gate.add(cart);
    }
  }
  return { gate, facadeMat, lampMat };
}

export function createCabinScene(canvas, opts = {}) {
  const lite = !!opts.lite;
  const layout = opts.layout;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  renderer.setPixelRatio(lite ? 1 : Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const skyU = {
    uZenith: { value: new THREE.Vector3() },
    uMid: { value: new THREE.Vector3() },
    uHorizon: { value: new THREE.Vector3() },
    uGround: { value: new THREE.Vector3() },
    uSun: { value: new THREE.Vector3(0, 1, 0) },
    uSunCol: { value: new THREE.Vector3(1, 1, 1) },
    uGlow: { value: 0.5 },
    uStars: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 48, 24), skyMaterial(skyU));
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMaterial(skyU)));
  scene.environmentIntensity = 0.4;
  let envTex = null;

  const cloudU = {
    uTime: { value: 0 },
    uSun: skyU.uSun,
    uShadow: { value: new THREE.Vector3() },
    uBright: { value: new THREE.Vector3() },
    uHaze: { value: new THREE.Vector3() },
    uOpacity: { value: 1 },
  };
  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1), cloudMaterial(cloudU));
  clouds.rotation.x = -Math.PI / 2;
  clouds.position.y = -38;
  scene.add(clouds);

  const cutTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT);
  const cut = [cutTop, new THREE.Plane(new THREE.Vector3(1, 0, 0), -(X1 + 0.05)), new THREE.Plane(new THREE.Vector3(-1, 0, 0), X0 - 0.05)];
  const air = buildAirliner(lite);
  air.uniforms.sweep.value = -99;
  air.uniforms.glow.value = 0;
  air.uniforms.winBoost.value = 99;
  air.skin.clippingPlanes = cut;
  air.skin.clipIntersection = true;
  scene.add(air.plane);
  const doorAlpha = skinDoorAlpha();

  const interior = new THREE.Group();
  air.plane.add(interior);
  const LENGTH = X1 - X0;
  const MID = (X0 + X1) / 2;
  const shellGeo = new THREE.CylinderGeometry(RAD, RAD, LENGTH, lite ? 72 : 128, 1, true);
  shellGeo.rotateZ(Math.PI / 2);
  const alphaPlain = shellAlpha(LENGTH, MID, false);
  const alphaDoor = shellAlpha(LENGTH, MID, true);
  const shellMat = new THREE.MeshStandardMaterial({ color: '#d8d3cb', roughness: 0.62, metalness: 0, side: THREE.BackSide, alphaMap: alphaPlain, alphaTest: 0.5, clippingPlanes: cut, clipIntersection: true });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.position.x = MID;
  interior.add(shell);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(LENGTH - 0.2, 0.08, 3.5), new THREE.MeshStandardMaterial({ color: '#1c1838', roughness: 0.9 }));
  floor.position.set(MID, FLOOR - 0.04, 0);
  interior.add(floor);
  const aisle = new THREE.Mesh(new THREE.BoxGeometry(LENGTH - 0.6, 0.005, 0.5), new THREE.MeshStandardMaterial({ color: '#2b2357', roughness: 0.8 }));
  aisle.position.set(MID, FLOOR + 0.002, 0);
  interior.add(aisle);
  const stripMat = new THREE.MeshBasicMaterial({ color: '#ffb45e' });
  for (const z of [0.26, -0.26]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(LENGTH - 0.6, 0.01, 0.02), stripMat);
    s.position.set(MID, FLOOR + 0.01, z);
    interior.add(s);
  }
  const wallMat = new THREE.MeshStandardMaterial({ color: '#d9d3ca', roughness: 0.6, side: THREE.DoubleSide, clippingPlanes: [cutTop] });
  for (const x of [X0 + 0.02, X1 - 0.02]) {
    const wall = new THREE.Mesh(new THREE.CircleGeometry(RAD, 48), wallMat);
    wall.rotation.y = Math.PI / 2;
    wall.position.x = x;
    interior.add(wall);
  }
  const galley = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.9, 1.3), new THREE.MeshStandardMaterial({ color: '#8d939e', roughness: 0.35, metalness: 0.55, clippingPlanes: [cutTop] }));
  galley.position.set(X1 - 0.4, FLOOR + 0.95, -1.0);
  interior.add(galley);

  const rr = (path, w, h, r) => {
    path.moveTo(-w / 2 + r, -h / 2);
    path.lineTo(w / 2 - r, -h / 2);
    path.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    path.lineTo(w / 2, h / 2 - r);
    path.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    path.lineTo(-w / 2 + r, h / 2);
    path.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    path.lineTo(-w / 2, -h / 2 + r);
    path.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  };
  const frameShape = new THREE.Shape();
  rr(frameShape, WIN_W + 0.18, WIN_H + 0.22, 0.2);
  const hole = new THREE.Path();
  rr(hole, WIN_W - 0.01, WIN_H - 0.01, 0.15);
  frameShape.holes.push(hole);
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2, curveSegments: 10 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#f4f1ec', roughness: 0.4, clippingPlanes: [cutTop] });
  const frames = new THREE.InstancedMesh(frameGeo, frameMat, WINDOWS_X.length * 2);
  {
    const sn = Math.sin(Math.PI / 12);
    const cs = Math.cos(Math.PI / 12);
    const m = new THREE.Matrix4();
    let i = 0;
    for (const side of [1, -1]) {
      const X = new THREE.Vector3(-side, 0, 0);
      const Y = new THREE.Vector3(0, cs, -side * sn);
      const Z = new THREE.Vector3(0, -sn, -side * cs);
      for (const x of WINDOWS_X) {
        m.makeBasis(X, Y, Z);
        m.setPosition(x, RAD * sn - sn * 0.04, side * (RAD * cs - cs * 0.04));
        frames.setMatrixAt(i++, m);
      }
    }
  }
  interior.add(frames);
  const ceiling = new THREE.Group();
  interior.add(ceiling);
  const binMat = new THREE.MeshStandardMaterial({ color: '#e6e2db', roughness: 0.5 });
  for (const z of [1.16, -1.16]) {
    const bin = new THREE.Mesh(new THREE.BoxGeometry(X1 - 1.6 - X0, 0.42, 0.6), binMat);
    bin.position.set((X0 + X1 - 1.6) / 2, 1.14, z);
    bin.rotation.x = z > 0 ? -0.35 : 0.35;
    ceiling.add(bin);
  }
  const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(LENGTH - 0.6, 0.02, 0.14), new THREE.MeshBasicMaterial({ color: '#ffe6c8' }));
  lightStrip.position.set(MID, 1.84, 0);
  ceiling.add(lightStrip);
  ceiling.visible = false;

  const seatInfo = [];
  const meshes = [];
  const rowX = {};
  const geos = { business: businessSeat(), premium: premiumSeat(), economy: economySeat() };
  const classBase = {
    business: new THREE.Color('#d6bf98'),
    premium: new THREE.Color('#2f6f9a'),
    economy: new THREE.Color('#4c5a86'),
  };
  let cursor = 11.9;
  for (const cls of layout) {
    const list = [];
    for (let r = cls.firstRow; r <= cls.lastRow; r++) {
      const x = cursor - cls.pitch / 2;
      rowX[r] = { x, pitch: cls.pitch };
      for (const l of cls.letters) list.push({ seat: `${r}${l}`, row: r, cls: cls.id, x, z: (cls.id === 'business' ? SEAT_Z.wide : SEAT_Z.narrow)[l] });
      cursor -= cls.pitch;
    }
    cursor -= 0.4;
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: cls.id === 'business' ? 0.62 : 0.72, metalness: 0 });
    const mesh = new THREE.InstancedMesh(geos[cls.id], mat, list.length);
    const m = new THREE.Matrix4();
    list.forEach((s, i) => {
      m.makeTranslation(s.x, FLOOR, s.z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, classBase[cls.id]);
      seatInfo.push({ ...s, mesh, index: i, base: classBase[cls.id].clone() });
    });
    mesh.userData.list = list;
    interior.add(mesh);
    meshes.push(mesh);
    const div = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 3.3), binMat);
    div.position.set(cursor + 0.2, FLOOR + 0.65, 0);
    interior.add(div);
  }
  const bySeat = new Map(seatInfo.map((s) => [s.seat, s]));

  const hemi = new THREE.HemisphereLight('#ffd9b8', '#3a2f66', 0.45);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffc08a', 2.6);
  scene.add(sun);
  for (let i = 0; i < 4; i++) {
    const l = new THREE.PointLight('#ffe2c4', 1.7, 7, 1.6);
    l.position.set(10 - i * 6.5, 1.0, 0);
    interior.add(l);
  }

  const gateBuilt = opts.intro ? buildGate(opts.gate || 'B12', lite) : null;
  if (gateBuilt) scene.add(gateBuilt.gate);

  const applyTime = (hour) => {
    const p = presetAt(hour);
    skyU.uZenith.value.set(...p.zenith);
    skyU.uMid.value.set(...p.mid);
    skyU.uHorizon.value.set(...p.horizon);
    skyU.uGround.value.set(...p.ground);
    skyU.uSun.value.set(...p.sun).normalize();
    skyU.uSunCol.value.set(...p.sunCol);
    skyU.uGlow.value = p.glow;
    skyU.uStars.value = p.stars;
    cloudU.uShadow.value.set(...p.cShadow);
    cloudU.uBright.value.set(...p.cBright);
    cloudU.uHaze.value.set(...p.haze);
    hemi.color.setRGB(...p.hSky);
    hemi.groundColor.setRGB(...p.hGround);
    hemi.intensity = p.hI;
    sun.color.setRGB(...p.sunCol);
    sun.intensity = p.sunI;
    sun.position.copy(skyU.uSun.value).multiplyScalar(60);
    renderer.toneMappingExposure = p.exposure;
    if (gateBuilt) {
      gateBuilt.facadeMat.emissiveIntensity = 0.15 + p.facade * 1.4;
      gateBuilt.lampMat.color.setScalar(0.35 + p.facade * 0.65);
    }
    const next = pmrem.fromScene(envScene, 0.02).texture;
    scene.environment = next;
    if (envTex) envTex.dispose();
    envTex = next;
  };
  applyTime(opts.hour ?? 18);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 2200);
  let composer = null;
  if (!lite) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.5, 0.92));
    composer.addPass(new OutputPass());
  }

  const occupied = new Set();
  const held = new Set();
  const selected = [];
  const labels = new Map();
  let hovered = null;
  const view = {
    mode: opts.intro ? 'intro' : 'overview',
    focusX: 0.8,
    az: 0.62,
    el: 0.92,
    dist: 30,
    distT: 30,
    yaw: 0,
    pitch: 0,
    fovT: 60,
    pos: new THREE.Vector3(),
    tgt: new THREE.Vector3(),
    anim: null,
    seat: null,
    look: { x: 0, y: 0, tx: 0, ty: 0 },
  };
  const recolor = () => {
    const c = new THREE.Color();
    for (const s of seatInfo) {
      if (selected.includes(s.seat) && view.mode !== 'seat') c.set('#ff9b3d');
      else if (occupied.has(s.seat)) c.set('#26242c');
      else if (held.has(s.seat)) c.set('#5b4250');
      else c.copy(s.base);
      if (hovered === s.seat && !occupied.has(s.seat) && !held.has(s.seat) && !selected.includes(s.seat)) c.offsetHSL(0, 0.05, 0.18);
      s.mesh.setColorAt(s.index, c);
    }
    for (const m of meshes) m.instanceColor.needsUpdate = true;
    for (const [seat, sp] of labels) if (!selected.includes(seat)) { interior.remove(sp); sp.material.map.dispose(); sp.material.dispose(); labels.delete(seat); }
    for (const seat of selected) {
      if (labels.has(seat)) continue;
      const s = bySeat.get(seat);
      if (!s) continue;
      const sp = labelSprite(seat);
      sp.position.set(s.x, FLOOR + (s.cls === 'business' ? 1.9 : 1.75), s.z);
      interior.add(sp);
      labels.set(seat, sp);
    }
  };
  const setTint = (fn) => {
    for (const s of seatInfo) {
      const hex = fn ? fn(s.seat) : null;
      s.base = hex ? new THREE.Color(hex) : classBase[s.cls].clone();
    }
    recolor();
  };
  if (opts.seatColor) setTint(opts.seatColor);
  else recolor();

  const narrow = () => canvas.clientWidth < 760;
  const overviewPose = () => {
    const d = view.dist + (narrow() ? Math.max(5, view.dist * 0.35) : 0);
    const tgt = new THREE.Vector3(view.focusX, FLOOR + 0.4, 0);
    const pos = new THREE.Vector3(
      tgt.x + Math.sin(view.az) * Math.cos(view.el) * d * 0.55,
      tgt.y + Math.sin(view.el) * d,
      tgt.z + Math.cos(view.az) * Math.cos(view.el) * d
    );
    return { pos, tgt, fov: narrow() ? 46 : 36 };
  };
  const sectionPose = (first, last) => {
    if (first == null) {
      view.focusX = 0.8;
      view.dist = view.distT = 30;
      view.el = 0.92;
      return overviewPose();
    }
    const a = rowX[first];
    const b = rowX[last];
    const from = a.x + a.pitch / 2;
    const to = b.x - b.pitch / 2;
    view.focusX = (from + to) / 2;
    view.dist = view.distT = clamp((from - to) * 0.95 + 5.5, 8.5, 18);
    view.el = 1.0;
    return overviewPose();
  };
  const seatPose = (seat) => {
    const s = bySeat.get(seat);
    const side = s.z >= 0 ? 1 : -1;
    const pos = seatPositionOf(s.seat);
    const biz = s.cls === 'business';
    const lean = biz ? Math.abs(s.z) - 0.05 : pos === 'window' ? 1.28 : pos === 'middle' ? 1.0 : Math.abs(s.z);
    const usable = WINDOWS_X.filter((x) => x > X0 + 0.6 && x < X1 - 0.6);
    const wx = usable.reduce((a, b) => (Math.abs(b - s.x - 0.25) < Math.abs(a - s.x - 0.25) ? b : a));
    const eyeX = clamp(clamp(wx - (biz ? 0.45 : 0.18), s.x - (biz ? 0.3 : 0.12), s.x + (biz ? 0.5 : 0.3)), X0 + 0.5, X1 - 0.5);
    const eye = new THREE.Vector3(eyeX, biz ? 0.4 : 0.46, side * lean);
    const win = new THREE.Vector3(wx, 0.47, side * 1.84);
    const tgt = eye.clone().add(win.sub(eye).normalize().multiplyScalar(8));
    tgt.y -= 1.1;
    return { pos: eye, tgt, fov: biz ? 58 : pos === 'window' ? 62 : 54 };
  };

  if (view.mode === 'overview') {
    const start = overviewPose();
    view.pos.copy(start.pos);
    view.tgt.copy(start.tgt);
    camera.fov = start.fov;
  }

  const animateTo = (pose, via, dur = 1.7) => {
    view.anim = { t: 0, dur, p0: view.pos.clone(), t0: view.tgt.clone(), f0: camera.fov, p1: pose.pos.clone(), t1: pose.tgt.clone(), f1: pose.fov, via: via ? via.clone() : null };
  };

  const introKeys = [
    [0, [58, 13, -52], [4, -1.5, 4], 34],
    [3.0, [44, 6, -40], [8, -1, 2], 36],
    [5.0, [30, 3, -4], [12, -0.5, 4], 42],
    [6.8, [19, 1.6, 11], [DOOR_X, 0.4, 4], 46],
    [8.4, [16.2, 0.95, 5.4], [DOOR_X, 0.7, 1.2], 52],
    [9.9, [DOOR_X, 0.85, 3.0], [DOOR_X, 0.75, -1.5], 58],
    [11.2, [DOOR_X - 0.1, 0.8, 0.35], [11.4, 0.6, -0.8], 60],
    [12.4, [12.6, 0.8, 0], [0, 0.3, 0], 58],
    [14.0, [10.4, 1.0, 0], [-4, 0.1, 0], 56],
  ];
  const introCurvePos = new THREE.CatmullRomCurve3(introKeys.map((k) => new THREE.Vector3(...k[1])), false, 'centripetal');
  const introCurveTgt = new THREE.CatmullRomCurve3(introKeys.map((k) => new THREE.Vector3(...k[2])), false, 'centripetal');
  const INTRO_END = introKeys[introKeys.length - 1][0];
  const intro = { t: 0, stage: '', lift: null, done: !opts.intro };
  const introStages = [[0, 'gate'], [6.4, 'bridge'], [10.4, 'door'], [13.6, 'lift']];
  const setDoorOpen = (open) => {
    air.skin.alphaMap = open ? doorAlpha : null;
    air.skin.alphaTest = open ? 0.5 : 0;
    air.skin.needsUpdate = true;
    shellMat.alphaMap = open ? alphaDoor : alphaPlain;
    shellMat.needsUpdate = true;
  };
  const defaultFocus = opts.defaultSection || null;
  const finishIntro = (instant) => {
    intro.done = true;
    intro.lift = null;
    setDoorOpen(false);
    if (gateBuilt) gateBuilt.gate.visible = false;
    cloudU.uOpacity.value = 1;
    for (const g of air.gears) g.visible = false;
    view.mode = 'overview';
    const pose = defaultFocus ? sectionPose(defaultFocus[0], defaultFocus[1]) : sectionPose(null);
    if (instant) {
      view.anim = null;
      view.pos.copy(pose.pos);
      view.tgt.copy(pose.tgt);
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    } else animateTo(pose, null, 1.8);
    if (opts.onIntro) opts.onIntro('done');
  };
  if (opts.intro) {
    setDoorOpen(true);
    cloudU.uOpacity.value = 0;
    view.pos.set(...introKeys[0][1]);
    view.tgt.set(...introKeys[0][2]);
    camera.fov = introKeys[0][3];
  } else {
    for (const g of air.gears) g.visible = false;
    if (defaultFocus) {
      const pose = sectionPose(defaultFocus[0], defaultFocus[1]);
      view.pos.copy(pose.pos);
      view.tgt.copy(pose.tgt);
      camera.fov = pose.fov;
    }
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    return hit.object.userData.list[hit.instanceId];
  };
  let drag = null;
  const touches = new Map();
  let pinch = 0;
  const zoomBy = (f) => {
    if (view.mode === 'seat') view.fovT = clamp(view.fovT * f, 24, 92);
    else if (view.mode === 'overview') view.distT = clamp(view.distT * f, 6, 48);
  };
  const panBy = (dx) => {
    if (view.mode !== 'overview' || view.anim) return;
    view.focusX = clamp(view.focusX + dx, X0 + 1.5, X1 - 1.5);
    const p = overviewPose();
    view.pos.copy(p.pos);
    view.tgt.copy(p.tgt);
  };
  const onDown = (e) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
      drag = null;
      return;
    }
    drag = { x: e.clientX, y: e.clientY, az: view.az, el: view.el, yaw: view.yaw, pitch: view.pitch, moved: false };
    if (view.mode === 'seat') canvas.style.cursor = 'grabbing';
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2 && pinch) {
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 0) zoomBy(pinch / d);
      pinch = d;
      return;
    }
    view.look.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    view.look.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (view.mode === 'intro') return;
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      if (drag.moved && !view.anim) {
        if (view.mode === 'seat') {
          const k = (camera.fov / 60) * 0.0042;
          view.yaw = drag.yaw - dx * k;
          view.pitch = clamp(drag.pitch + dy * k, -1.35, 1.35);
        } else {
          view.az = drag.az - dx * 0.006;
          view.el = clamp(drag.el + dy * 0.004, 0.35, 1.45);
          const p = overviewPose();
          view.pos.copy(p.pos);
          view.tgt.copy(p.tgt);
        }
      }
      return;
    }
    if (view.mode !== 'overview' || view.anim) return;
    const s = pick(e.clientX, e.clientY);
    const next = s ? s.seat : null;
    if (next !== hovered) {
      hovered = next;
      recolor();
      canvas.style.cursor = s && !occupied.has(s.seat) && !held.has(s.seat) ? 'pointer' : 'grab';
    }
    if (opts.onHover) opts.onHover(s ? { seat: s.seat, cls: s.cls, occupied: occupied.has(s.seat), held: held.has(s.seat), x: e.clientX - r.left, y: e.clientY - r.top } : null);
  };
  const onUp = (e) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = 0;
    const d = drag;
    drag = null;
    if (view.mode === 'seat') canvas.style.cursor = 'grab';
    if (!d || d.moved || view.mode !== 'overview' || view.anim) return;
    const s = pick(e.clientX, e.clientY);
    if (s && !occupied.has(s.seat) && opts.onToggle) opts.onToggle(s.seat);
  };
  const onWheel = (e) => {
    e.preventDefault();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) panBy(-e.deltaX * 0.012);
    else zoomBy(Math.exp(e.deltaY * 0.0012));
  };
  const onLeave = (e) => {
    touches.delete(e.pointerId);
    if (drag && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) return;
    drag = null;
    if (hovered) { hovered = null; recolor(); }
    if (opts.onHover) opts.onHover(null);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  let inset = 0;
  let insetNow = 0;
  const applyInset = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (insetNow > 0.5) camera.setViewOffset(w + insetNow, h, insetNow, 0, w, h);
    else camera.clearViewOffset();
    camera.aspect = (w + insetNow) / h;
    camera.updateProjectionMatrix();
  };
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    applyInset();
    if (composer) composer.setSize(w, h);
    if (view.mode === 'overview' && !view.anim) {
      const p = overviewPose();
      view.pos.copy(p.pos);
      view.tgt.copy(p.tgt);
    }
  };
  resize();

  let last = performance.now();
  let t = 0;
  let raf = 0;
  let running = true;
  const tmpT = new THREE.Vector3();
  let wasSolid = null;
  const updateIntro = (dt) => {
    if (intro.lift) {
      const L = intro.lift;
      L.t = Math.min(1, L.t + dt / 3.4);
      if (gateBuilt) gateBuilt.gate.position.y = -Math.pow(L.t, 2.2) * 320;
      cloudU.uOpacity.value = smooth((L.t - 0.25) / 0.6);
      const g = 1 - smooth((L.t - 0.15) / 0.35);
      for (const gear of air.gears) gear.scale.y = Math.max(0.01, g);
      if (L.t > 0.35 && !L.closed) { L.closed = true; setDoorOpen(false); }
      if (L.t >= 1 && !view.anim) finishIntro(false);
      return;
    }
    intro.t += dt;
    let current = introStages[0][1];
    for (const [at, name] of introStages) if (intro.t >= at) current = name;
    if (current !== intro.stage) {
      intro.stage = current;
      if (opts.onIntro) opts.onIntro(current);
    }
    if (intro.t >= INTRO_END) {
      intro.lift = { t: 0, closed: false };
      animateTo(sectionPose(null), new THREE.Vector3(6, 14, 10), 3.4);
      return;
    }
    let i = 0;
    while (i < introKeys.length - 2 && intro.t > introKeys[i + 1][0]) i++;
    const a = introKeys[i];
    const b = introKeys[i + 1];
    const k = (intro.t - a[0]) / (b[0] - a[0]);
    const kk = i === 0 ? k * k * (3 - 2 * k) * 0.5 + k * 0.5 : k;
    const u = (i + kk) / (introKeys.length - 1);
    introCurvePos.getPoint(u, view.pos);
    introCurveTgt.getPoint(u, view.tgt);
    camera.fov = a[3] + (b[3] - a[3]) * smooth(k);
    camera.updateProjectionMatrix();
  };

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, view.mode === 'intro' ? 0.1 : 0.05);
    last = now;
    t += dt;
    cloudU.uTime.value = t;
    for (const f of air.fans) f.rotation.x += (view.mode === 'intro' ? 3 : 14) * dt;
    air.beacon.material.color.setRGB(Math.sin(t * 8) > 0.6 ? 1 : 0.15, 0.05, 0.08);

    if (view.mode === 'intro' && !intro.done) updateIntro(dt);

    if (view.anim) {
      const a = view.anim;
      a.t = Math.min(1, a.t + dt / a.dur);
      const k = ease(a.t);
      if (a.via) {
        const u = 1 - k;
        view.pos.set(
          u * u * a.p0.x + 2 * u * k * a.via.x + k * k * a.p1.x,
          u * u * a.p0.y + 2 * u * k * a.via.y + k * k * a.p1.y,
          u * u * a.p0.z + 2 * u * k * a.via.z + k * k * a.p1.z
        );
      } else view.pos.lerpVectors(a.p0, a.p1, k);
      view.tgt.lerpVectors(a.t0, a.t1, k);
      camera.fov = a.f0 + (a.f1 - a.f0) * k;
      camera.updateProjectionMatrix();
      if (a.t >= 1) {
        view.anim = null;
        if (view.mode === 'seat') {
          const d = tmpT.copy(view.tgt).sub(view.pos).normalize();
          view.yaw = Math.atan2(d.z, d.x);
          view.pitch = Math.asin(clamp(d.y, -1, 1));
          view.fovT = camera.fov;
        } else view.distT = view.dist;
      }
    } else if (view.mode === 'seat') {
      if (Math.abs(camera.fov - view.fovT) > 0.01) {
        camera.fov += (view.fovT - camera.fov) * 0.14;
        camera.updateProjectionMatrix();
      }
    } else if (view.mode === 'overview' && Math.abs(view.dist - view.distT) > 0.001) {
      view.dist += (view.distT - view.dist) * 0.14;
      const p = overviewPose();
      view.pos.copy(p.pos);
      view.tgt.copy(p.tgt);
    }

    const insetGoal = view.mode === 'overview' ? inset : 0;
    if (Math.abs(insetNow - insetGoal) > 0.5) {
      insetNow += (insetGoal - insetNow) * 0.1;
      applyInset();
    }
    const solid = (view.mode === 'seat' && view.pos.y < 1.45) || (view.mode === 'intro' && !intro.lift);
    if (solid !== wasSolid) {
      wasSolid = solid;
      ceiling.visible = solid;
      for (const [mat, planes] of [[shellMat, cut], [air.skin, cut], [frameMat, [cutTop]], [wallMat, [cutTop]], [galley.material, [cutTop]]]) {
        mat.clippingPlanes = solid ? [] : planes;
        mat.needsUpdate = true;
      }
    }
    for (const sp of labels.values()) sp.visible = view.mode === 'overview';

    view.look.x += (view.look.tx - view.look.x) * 0.06;
    view.look.y += (view.look.ty - view.look.y) * 0.06;
    camera.position.copy(view.pos);
    tmpT.copy(view.tgt);
    if (view.mode === 'seat' && !view.anim) {
      const cp = Math.cos(view.pitch);
      tmpT.set(view.pos.x + Math.cos(view.yaw) * cp * 8, view.pos.y + Math.sin(view.pitch) * 8, view.pos.z + Math.sin(view.yaw) * cp * 8);
    } else if (view.mode === 'overview' && !drag) {
      camera.position.x += view.look.x * 0.5;
      camera.position.y -= view.look.y * 0.35;
    }
    air.plane.updateMatrixWorld();
    air.plane.localToWorld(camera.position);
    air.plane.localToWorld(tmpT);
    camera.lookAt(tmpT);
    if (composer) composer.render();
    else renderer.render(scene, camera);
  };
  loop();

  return {
    setOccupied(list) { occupied.clear(); for (const s of list) occupied.add(String(s).toUpperCase()); recolor(); },
    setHeld(list) { held.clear(); for (const s of list) held.add(String(s).toUpperCase()); recolor(); },
    setSelected(list) { selected.length = 0; selected.push(...list); recolor(); },
    setTint,
    setTime(hour) { applyTime(hour); },
    focusRows(first, last) {
      if (view.mode === 'intro') return;
      const fromSeat = view.mode === 'seat';
      view.mode = 'overview';
      recolor();
      animateTo(sectionPose(first ?? null, last ?? null), fromSeat ? view.pos.clone().setY(3.4) : null, fromSeat ? 1.9 : 1.3);
    },
    pan(dx) { panBy(dx); },
    viewSeat(seat) {
      if (!bySeat.has(seat) || view.mode === 'intro') return;
      const pose = seatPose(seat);
      const s = bySeat.get(seat);
      view.mode = 'seat';
      view.seat = seat;
      canvas.style.cursor = 'grab';
      recolor();
      animateTo(pose, new THREE.Vector3(s.x + 0.5, 3.2, s.z * 0.6), 2.1);
      if (opts.onHover) opts.onHover(null);
    },
    overview() {
      const s = bySeat.get(view.seat);
      view.mode = 'overview';
      recolor();
      if (s) view.focusX = s.x;
      view.dist = view.distT = Math.min(view.dist, 14);
      animateTo(overviewPose(), s ? new THREE.Vector3(s.x + 0.5, 3.2, s.z * 0.6) : null, 1.8);
    },
    skipIntro() { if (view.mode === 'intro' && !intro.done) finishIntro(true); },
    setInset(px) { inset = Math.max(0, px); },
    zoom(dir) { zoomBy(dir > 0 ? 0.82 : 1.22); },
    setRunning(v) { running = v; },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      renderer.dispose();
      pmrem.dispose();
      if (envTex) envTex.dispose();
      if (composer) composer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    },
  };
}
