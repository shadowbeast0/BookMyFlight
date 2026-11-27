import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const LEN = 38;
export const HALF = LEN / 2;
const R = 2;
export const GROUND = -4.6;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };

function fuselageProfile(x) {
  if (x > 12.5) {
    const s = (x - 12.5) / (HALF - 12.5);
    return { r: R * Math.pow(Math.max(0, 1 - Math.pow(s, 2.1)), 0.52), dy: -s * s * 0.45 };
  }
  if (x < -10.5) {
    const s = (-10.5 - x) / (HALF - 10.5);
    return { r: R * (1 - Math.pow(s, 1.35) * 0.84), dy: Math.pow(s, 1.7) * 1.35 };
  }
  return { r: R, dy: 0 };
}

function liveryTexture(dark) {
  const W = 1024;
  const H = 4096;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const e = document.createElement('canvas');
  e.width = W;
  e.height = H;
  const ge = e.getContext('2d');
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, W, H);
  const yOf = (x) => (1 - (x + HALF) / LEN) * H;
  const uPx = (u) => u * W;
  g.fillStyle = '#eef0f4';
  g.fillRect(0, 0, W, H);
  const belly = g.createLinearGradient(uPx(0.06), 0, uPx(0.44), 0);
  belly.addColorStop(0, '#eef0f4');
  belly.addColorStop(0.12, '#1b1440');
  belly.addColorStop(0.5, '#120c30');
  belly.addColorStop(0.88, '#1b1440');
  belly.addColorStop(1, '#eef0f4');
  g.fillStyle = belly;
  g.fillRect(uPx(0.06), 0, uPx(0.38), H);
  for (const [u0, dir] of [[0.995, 1], [0.505, -1]]) {
    const stripe = (u, w, col) => { g.fillStyle = col; g.fillRect(uPx(u - (dir > 0 ? w : 0)), yOf(16.5), uPx(w), yOf(-13) - yOf(16.5)); };
    stripe(u0, 0.012, '#7c3aed');
    stripe(u0 - dir * 0.016, 0.007, '#ff9b3d');
  }
  const swoosh = (uc, dir) => {
    g.save();
    g.beginPath();
    g.moveTo(uPx(uc), yOf(-8));
    g.bezierCurveTo(uPx(uc + dir * 0.05), yOf(-12), uPx(uc + dir * 0.12), yOf(-15), uPx(uc + dir * 0.2), yOf(-HALF));
    g.lineTo(uPx(uc + dir * 0.3), yOf(-HALF));
    g.bezierCurveTo(uPx(uc + dir * 0.2), yOf(-15), uPx(uc + dir * 0.07), yOf(-11), uPx(uc), yOf(-8));
    const sg = g.createLinearGradient(0, yOf(-8), 0, yOf(-HALF));
    sg.addColorStop(0, 'rgba(124,58,237,0)');
    sg.addColorStop(0.4, '#7c3aed');
    sg.addColorStop(1, '#ff9b3d');
    g.fillStyle = sg;
    g.fill();
    g.restore();
  };
  swoosh(0.88, -1);
  swoosh(0.62, 1);
  const winU = [0.958, 0.542];
  for (const u of winU) {
    for (let x = -9.5; x <= 11; x += 0.92) {
      if (Math.abs(x - 10.2) < 0.5 || Math.abs(x + 8.2) < 0.5) continue;
      const cx = uPx(u);
      const cy = yOf(x);
      g.fillStyle = '#0a0d16';
      g.beginPath();
      g.roundRect(cx - 21, cy - 19, 42, 38, 14);
      g.fill();
      ge.fillStyle = dark ? '#ffcf8a' : '#ffe2b8';
      ge.beginPath();
      ge.roundRect(cx - 17, cy - 15, 34, 30, 12);
      ge.fill();
    }
    for (const dx of [10.2, -8.2, 13.6, -14.2]) {
      g.strokeStyle = 'rgba(40,40,60,0.55)';
      g.lineWidth = 3;
      g.beginPath();
      g.roundRect(uPx(u) - 26, yOf(dx) - 52, 52, 104, 14);
      g.stroke();
    }
  }
  g.fillStyle = '#05070d';
  for (let i = 0; i < 6; i++) {
    const u = 0.75 + (i - 2.5) * 0.045;
    g.beginPath();
    g.moveTo(uPx(u - 0.018), yOf(15.15));
    g.lineTo(uPx(u + 0.018), yOf(15.15));
    g.lineTo(uPx(u + 0.014), yOf(16.0 - Math.abs(i - 2.5) * 0.12));
    g.lineTo(uPx(u - 0.014), yOf(16.0 - Math.abs(i - 2.5) * 0.12));
    g.closePath();
    g.fill();
  }
  const name = (u, rot) => {
    g.save();
    g.translate(uPx(u), yOf(2.5));
    g.rotate(rot);
    g.font = '700 78px "Arial Black", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#1b1440';
    g.fillText('BOOK MY FLIGHT', 0, 0);
    g.restore();
  };
  name(0.905, -Math.PI / 2);
  name(0.595, Math.PI / 2);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const emissive = new THREE.CanvasTexture(e);
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

function finTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 1024, 1024, 0);
  bg.addColorStop(0, '#120c30');
  bg.addColorStop(0.55, '#5b21b6');
  bg.addColorStop(1, '#ff9b3d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = '#fff';
  g.lineWidth = 64;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(150, 720);
  g.bezierCurveTo(360, 690, 600, 560, 860, 300);
  g.stroke();
  g.fillStyle = '#ffd29b';
  g.beginPath();
  g.arc(860, 300, 70, 0, Math.PI * 2);
  g.fill();
  g.font = '900 120px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = '#fff';
  g.fillText('BMF', 512, 900);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function airfoil(n = 22) {
  const up = [];
  const lo = [];
  for (let i = 0; i <= n; i++) {
    const b = i / n;
    const cc = (1 - Math.cos(b * Math.PI)) / 2;
    const yt = 5 * (0.2969 * Math.sqrt(cc) - 0.126 * cc - 0.3516 * cc * cc + 0.2843 * cc ** 3 - 0.1036 * cc ** 4);
    up.push([cc, yt]);
    lo.push([cc, -yt * 0.78]);
  }
  const pts = [];
  for (let i = n; i >= 0; i--) pts.push(up[i]);
  for (let i = 1; i < n; i++) pts.push(lo[i]);
  return pts;
}

function loft(sections, thickAxis = 'y') {
  const foil = airfoil();
  const pos = [];
  const idx = [];
  const m = foil.length;
  for (const s of sections) {
    for (const [cc, yt] of foil) {
      const x = s.x - cc * s.chord;
      const th = yt * s.t * s.chord;
      if (thickAxis === 'y') pos.push(x, s.y + th + (s.camber || 0) * Math.sin(cc * Math.PI) * s.chord, s.z);
      else pos.push(x, s.y, s.z + th);
    }
  }
  for (let j = 0; j < sections.length - 1; j++) {
    for (let i = 0; i < m; i++) {
      const a = j * m + i;
      const b = j * m + ((i + 1) % m);
      const c = (j + 1) * m + i;
      const d = (j + 1) * m + ((i + 1) % m);
      idx.push(a, c, b, b, c, d);
    }
  }
  const tipCenter = pos.length / 3;
  const ls = sections[sections.length - 1];
  pos.push(ls.x - ls.chord * 0.45, ls.y, ls.z);
  const base = (sections.length - 1) * m;
  for (let i = 0; i < m; i++) idx.push(base + i, base + ((i + 1) % m), tipCenter);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function mirrorZ(geo) {
  const g = geo.clone();
  g.scale(1, 1, -1);
  const index = g.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const t = index[i + 1];
    index[i + 1] = index[i + 2];
    index[i + 2] = t;
  }
  g.computeVertexNormals();
  return g;
}

function engine(mats, lite) {
  const grp = new THREE.Group();
  const seg = lite ? 40 : 72;
  const prof = [
    [1.02, 3.2], [1.18, 3.32], [1.3, 3.22], [1.36, 2.9], [1.38, 2.2], [1.34, 1.0], [1.22, -0.4], [1.02, -1.5], [0.9, -1.8],
    [0.86, -1.75], [0.95, -0.6], [1.05, 1.2], [1.07, 2.4], [1.06, 3.0], [1.02, 3.2],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const nac = new THREE.LatheGeometry(prof, seg);
  nac.rotateZ(-Math.PI / 2);
  const nacelle = new THREE.Mesh(nac, mats.nacelle);
  nacelle.castShadow = true;
  grp.add(nacelle);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.13, 0.1, 16, seg), mats.chrome);
  lip.rotation.y = Math.PI / 2;
  lip.position.x = 3.22;
  grp.add(lip);
  const core = new THREE.LatheGeometry([[0.001, -3.6], [0.25, -3.3], [0.55, -2.6], [0.72, -1.9], [0.78, -1.2]].map(([r, y]) => new THREE.Vector2(r, y)), seg);
  core.rotateZ(-Math.PI / 2);
  grp.add(new THREE.Mesh(core, mats.exhaust));
  const fan = new THREE.Group();
  fan.position.x = 2.55;
  const spin = new THREE.LatheGeometry([[0.001, 0.75], [0.2, 0.62], [0.33, 0.3], [0.38, 0.0], [0.38, -0.2]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
  spin.rotateZ(-Math.PI / 2);
  fan.add(new THREE.Mesh(spin, mats.spinner));
  const bladeGeo = new THREE.BoxGeometry(0.05, 0.64, 0.24);
  bladeGeo.translate(0, 0.7, 0);
  const n = lite ? 18 : 24;
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(bladeGeo, mats.blade);
    b.rotation.x = (i / n) * Math.PI * 2;
    b.rotateY(0.5);
    fan.add(b);
  }
  const disk = new THREE.Mesh(new THREE.CircleGeometry(1.05, 48), mats.dark);
  disk.rotation.y = Math.PI / 2;
  disk.position.x = -0.25;
  fan.add(disk);
  grp.add(fan);
  return { grp, fan };
}

function gear(mats) {
  const grp = new THREE.Group();
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.6, 16), mats.chrome);
  strut.position.y = -1.3;
  grp.add(strut);
  const tyre = new THREE.TorusGeometry(0.42, 0.2, 14, 32);
  for (const z of [-0.42, 0.42]) {
    const w = new THREE.Mesh(tyre, mats.tyre);
    w.position.set(0, -2.55, z);
    w.castShadow = true;
    grp.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.26, 20), mats.chrome);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(0, -2.55, z);
    grp.add(hub);
  }
  return grp;
}

export function buildAirliner(lite = false) {
  const livery = liveryTexture(true);
  const sweep = { value: HALF + 2 };
  const glow = { value: 1 };
  const winBoost = { value: 0 };
  const lockX = { value: 3.0 };
  const lockOn = { value: 0 };
  const skin = new THREE.MeshPhysicalMaterial({
    map: livery.map,
    emissiveMap: livery.emissive,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 1.0,
    metalness: 0.25,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  skin.onBeforeCompile = (sh) => {
    sh.uniforms.uSweep = sweep;
    sh.uniforms.uGlow = glow;
    sh.uniforms.uWin = winBoost;
    sh.uniforms.uLockX = lockX;
    sh.uniforms.uLockOn = lockOn;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nuniform float uSweep;\nuniform float uGlow;\nuniform float uWin;\nuniform float uLockX;\nuniform float uLockOn;')
      .replace('#include <map_fragment>', `#include <map_fragment>
float edgeD = vLocal.x - uSweep;
float painted = smoothstep(-0.15, 0.35, edgeD);
diffuseColor.rgb = mix(vec3(0.13, 0.14, 0.16), diffuseColor.rgb, painted);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float winOn = smoothstep(uWin - 1.2, uWin, -vLocal.x + 12.0);
totalEmissiveRadiance *= painted * (0.25 + 0.75 * winOn);
float lockMask = smoothstep(0.7, 0.2, abs(vLocal.x - uLockX)) * step(0.0, vLocal.z) * uLockOn;
totalEmissiveRadiance += vec3(1.0, 0.55, 0.15) * lockMask * length(totalEmissiveRadiance) * 2.5;
totalEmissiveRadiance += vec3(0.55, 0.75, 1.0) * exp(-edgeD * edgeD * 10.0) * uGlow * 1.4;`);
  };

  const mats = {
    skin,
    wing: new THREE.MeshPhysicalMaterial({ color: '#c9ced8', metalness: 0.55, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    nacelle: new THREE.MeshPhysicalMaterial({ color: '#1a1240', metalness: 0.35, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.06, side: THREE.DoubleSide }),
    chrome: new THREE.MeshStandardMaterial({ color: '#d9dde6', metalness: 1, roughness: 0.18 }),
    exhaust: new THREE.MeshStandardMaterial({ color: '#3a3a42', metalness: 0.9, roughness: 0.45 }),
    spinner: new THREE.MeshPhysicalMaterial({ color: '#e9ecf2', metalness: 0.6, roughness: 0.2, clearcoat: 1 }),
    blade: new THREE.MeshStandardMaterial({ color: '#8c93a3', metalness: 1, roughness: 0.28 }),
    dark: new THREE.MeshStandardMaterial({ color: '#0a0a10', metalness: 0.3, roughness: 0.8 }),
    tyre: new THREE.MeshStandardMaterial({ color: '#111114', metalness: 0, roughness: 0.85 }),
    fin: new THREE.MeshPhysicalMaterial({ map: finTexture(), metalness: 0.3, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
    stab: new THREE.MeshPhysicalMaterial({ color: '#e4e7ee', metalness: 0.4, roughness: 0.3, clearcoat: 0.8 }),
  };

  const paintSweep = (mat) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSweep = sweep;
      sh.uniforms.uGlow = glow;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nuniform float uSweep;\nuniform float uGlow;')
        .replace('#include <map_fragment>', `#include <map_fragment>
float edgeD = vLocal.x - uSweep;
float painted = smoothstep(-0.15, 0.35, edgeD);
diffuseColor.rgb = mix(vec3(0.13, 0.14, 0.16), diffuseColor.rgb, painted);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(0.55, 0.75, 1.0) * exp(-edgeD * edgeD * 10.0) * uGlow * 1.4;`);
    };
  };
  paintSweep(mats.fin);
  paintSweep(mats.stab);

  const plane = new THREE.Group();

  const prof = [];
  const PN = lite ? 90 : 160;
  for (let i = 0; i <= PN; i++) {
    const x = -HALF + (LEN * i) / PN;
    prof.push(new THREE.Vector2(Math.max(0.0005, fuselageProfile(x).r), x));
  }
  const fus = new THREE.LatheGeometry(prof, lite ? 48 : 96);
  fus.rotateZ(-Math.PI / 2);
  const fp = fus.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i);
    fp.setY(i, fp.getY(i) + fuselageProfile(x).dy);
  }
  fus.computeVertexNormals();
  const fuselage = new THREE.Mesh(fus, skin);
  fuselage.castShadow = true;
  plane.add(fuselage);

  const wingR = loft([
    { x: 5.0, y: -1.25, z: 1.2, chord: 9.2, t: 0.13, camber: 0.02 },
    { x: 3.4, y: -1.05, z: 4.2, chord: 6.6, t: 0.12, camber: 0.02 },
    { x: 0.4, y: -0.6, z: 9.0, chord: 3.9, t: 0.11, camber: 0.015 },
    { x: -4.6, y: 0.15, z: 15.6, chord: 1.7, t: 0.1, camber: 0.01 },
    { x: -5.4, y: 0.55, z: 16.35, chord: 1.35, t: 0.1 },
    { x: -6.0, y: 1.6, z: 16.75, chord: 1.0, t: 0.1 },
    { x: -6.7, y: 2.9, z: 16.95, chord: 0.62, t: 0.1 },
  ], 'y');
  for (const g of [wingR, mirrorZ(wingR)]) {
    const m = new THREE.Mesh(g, mats.wing);
    m.castShadow = true;
    m.receiveShadow = true;
    plane.add(m);
  }
  const stabR = loft([
    { x: -13.4, y: 1.0, z: 0.4, chord: 4.6, t: 0.1 },
    { x: -15.8, y: 1.25, z: 3.6, chord: 3.0, t: 0.09 },
    { x: -18.6, y: 1.55, z: 6.6, chord: 1.5, t: 0.09 },
  ], 'y');
  for (const g of [stabR, mirrorZ(stabR)]) {
    const m = new THREE.Mesh(g, mats.stab);
    m.castShadow = true;
    plane.add(m);
  }
  const finGeo = loft([
    { x: -10.6, y: 1.2, z: 0, chord: 7.2, t: 0.1 },
    { x: -13.4, y: 4.6, z: 0, chord: 4.8, t: 0.1 },
    { x: -16.6, y: 8.8, z: 0, chord: 2.4, t: 0.1 },
  ], 'z');
  const fpos = finGeo.attributes.position;
  const fuv = [];
  for (let i = 0; i < fpos.count; i++) fuv.push((fpos.getX(i) + 18) / 8.5, (fpos.getY(i) - 1) / 8.2);
  finGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fuv, 2));
  const fin = new THREE.Mesh(finGeo, mats.fin);
  fin.castShadow = true;
  plane.add(fin);

  const fans = [];
  for (const z of [6.4, -6.4]) {
    const e = engine(mats, lite);
    e.grp.position.set(2.2, -2.75, z);
    plane.add(e.grp);
    fans.push(e.fan);
    const pylon = loft([
      { x: 3.6, y: -1.95, z, chord: 5.6, t: 0.16 },
      { x: 3.2, y: -1.05, z, chord: 5.0, t: 0.14 },
    ], 'z');
    const py = new THREE.Mesh(pylon, mats.stab);
    plane.add(py);
  }

  const gears = [];
  const nose = gear(mats);
  gears.push(nose);
  nose.position.set(13.8, -1.55, 0);
  nose.scale.setScalar(0.85);
  plane.add(nose);
  for (const z of [2.9, -2.9]) {
    const mg = gear(mats);
    mg.position.set(-0.6, -1.45, z);
    plane.add(mg);
    gears.push(mg);
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), new THREE.MeshBasicMaterial({ color: '#ff3040' }));
  beacon.position.set(-1, 2.05, 0);
  plane.add(beacon);
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: '#ff2a3a' }));
  navL.position.set(-4.7, 0.3, -15.7);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: '#2aff7a' }));
  navR.position.set(-4.7, 0.3, 15.7);
  plane.add(navL, navR);

  return { plane, fans, beacon, mats, skin, gears, uniforms: { sweep, glow, winBoost, lockX, lockOn } };
}

export function createPlaneScene(canvas, opts = {}) {
  const lite = !!opts.lite;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  renderer.setPixelRatio(lite ? 1 : Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05040b');
  scene.fog = new THREE.FogExp2('#07061a', 0.0135);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);

  const { plane, fans, beacon, uniforms: { sweep, glow, winBoost, lockOn } } = buildAirliner(lite);
  scene.add(plane);

  let floor;
  if (!lite) {
    floor = new Reflector(new THREE.PlaneGeometry(400, 400), {
      textureWidth: Math.round(window.innerWidth * 0.5),
      textureHeight: Math.round(window.innerHeight * 0.5),
      color: 0x5a5a66,
    });
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = GROUND - 0.01;
    scene.add(floor);
  }
  const floorTint = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: '#08070f', metalness: 0.2, roughness: 0.55, transparent: true, opacity: lite ? 1 : 0.82 })
  );
  floorTint.rotation.x = -Math.PI / 2;
  floorTint.position.y = GROUND;
  floorTint.receiveShadow = true;
  scene.add(floorTint);
  const lineMat = new THREE.MeshBasicMaterial({ color: '#ffb45e', transparent: true, opacity: 0.55 });
  for (let i = -6; i <= 6; i++) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.12), lineMat);
    l.rotation.x = -Math.PI / 2;
    l.position.set(i * 5, GROUND + 0.02, 0);
    scene.add(l);
  }

  const stripMat = new THREE.MeshBasicMaterial({ color: '#c8d4ff' });
  const coneMat = new THREE.MeshBasicMaterial({ color: '#9fb4ff', transparent: true, opacity: 0.016, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = -3; i <= 3; i++) {
    for (const z of [-9, 0, 9]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 0.5), stripMat);
      strip.position.set(i * 11, 17, z);
      scene.add(strip);
      if (!lite && z === 0) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 7, 21, 32, 1, true), coneMat);
        cone.position.set(i * 11, 6.5, z);
        scene.add(cone);
      }
    }
  }
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 50, 64, 1, true), new THREE.MeshStandardMaterial({ color: '#0b0a1c', roughness: 0.9, side: THREE.BackSide }));
  wall.position.y = 18;
  scene.add(wall);

  const dustN = lite ? 400 : 1600;
  const dp = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dp[i * 3] = (Math.random() - 0.5) * 70;
    dp[i * 3 + 1] = GROUND + Math.random() * 20;
    dp[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#cdd8ff', size: 0.06, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  scene.add(new THREE.HemisphereLight('#7f8cff', '#0a0612', 0.35));
  const key = new THREE.SpotLight('#ffffff', 220, 140, 0.6, 0.7, 1.4);
  key.position.set(14, 26, 18);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#6d7bff', 0.9);
  rim.position.set(-30, 12, -20);
  scene.add(rim);
  const warm = new THREE.DirectionalLight('#ff8a3d', 0);
  warm.position.set(-20, 6, 30);
  scene.add(warm);
  const fill = new THREE.PointLight('#ffb45e', 20, 40, 1.8);
  fill.position.set(18, -2, 10);
  scene.add(fill);

  let composer = null;
  let bloom = null;
  if (!lite) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.45, 0.94);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const keys = [
    { p: 0.0, pos: [34, 2.5, 26], tgt: [2, 0.5, 0], fov: 34 },
    { p: 0.12, pos: [28, 0.5, 20], tgt: [4, 0, 1], fov: 30 },
    { p: 0.24, pos: [12.5, -2.2, 13.5], tgt: [3.5, -2.7, 6.4], fov: 32 },
    { p: 0.34, pos: [9.5, -2.0, 10.8], tgt: [3, -2.6, 6.4], fov: 34 },
    { p: 0.44, pos: [12, 3.4, 14], tgt: [5, 1.2, 0], fov: 30 },
    { p: 0.54, pos: [-2, 3.6, 14.5], tgt: [-5, 1.2, 0], fov: 30 },
    { p: 0.64, pos: [-3, 9, 24], tgt: [-4, 0, 13], fov: 38 },
    { p: 0.74, pos: [-26, 7, 20], tgt: [-15, 5.5, 0], fov: 34 },
    { p: 0.84, pos: [-30, 4, 8], tgt: [-14, 5, 0], fov: 34 },
    { p: 0.92, pos: [30, 6, 34], tgt: [4, 2, 0], fov: 40 },
    { p: 1.0, pos: [36, 9, 40], tgt: [20, 6, 0], fov: 42 },
  ];
  const posCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal');
  const tgtCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.tgt)), false, 'centripetal');
  const keyP = keys.map((k) => k.p);
  const remap = (p) => {
    for (let i = 0; i < keyP.length - 1; i++) {
      if (p <= keyP[i + 1]) {
        const f = (p - keyP[i]) / (keyP[i + 1] - keyP[i]);
        return (i + f) / (keyP.length - 1);
      }
    }
    return 1;
  };
  const fovAt = (p) => {
    for (let i = 0; i < keys.length - 1; i++) {
      if (p <= keys[i + 1].p) {
        const f = smooth((p - keys[i].p) / (keys[i + 1].p - keys[i].p));
        return keys[i].fov + (keys[i + 1].fov - keys[i].fov) * f;
      }
    }
    return keys[keys.length - 1].fov;
  };

  const part = (id, x, y, z, from, to) => ({ id, pos: new THREE.Vector3(x, y, z), from, to });
  const hotspots = [
    part('cockpit', 16.4, 0.75, 1.15, 0.015, 0.14),
    part('fuselage', 4, 1.95, 0.5, 0.03, 0.14),
    part('mainGear', -0.6, -3.7, 3.3, 0.04, 0.14),
    part('engine', 5.3, -1.85, 6.6, 0.2, 0.38),
    part('pylon', 2.4, -1.55, 6.4, 0.22, 0.38),
    part('windows', 4.6, 0.62, 1.93, 0.44, 0.57),
    part('door', 10.2, 0.2, 1.97, 0.43, 0.5),
    part('wing', 0.6, -0.45, 9.6, 0.6, 0.71),
    part('flaps', -2.9, -0.62, 6.6, 0.6, 0.71),
    part('winglet', -6.3, 2.3, 16.9, 0.6, 0.71),
    part('fin', -13.6, 6.0, 0.25, 0.73, 0.86),
    part('rudder', -18.1, 7.0, 0.15, 0.75, 0.86),
    part('stabiliser', -16.4, 1.45, 4.6, 0.73, 0.86),
  ];

  const state = { p: 0, sp: 0, px: 0, py: 0, tx: 0, ty: 0, w: 1, h: 1 };
  const tmp = new THREE.Vector3();
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    state.w = w;
    state.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (composer) composer.setSize(w, h);
    if (bloom) bloom.resolution.set(w / 2, h / 2);
  };
  resize();

  const clock = new THREE.Clock();
  let raf = 0;
  let running = true;
  let fanSpeed = 2;
  const render = () => {
    raf = requestAnimationFrame(render);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    state.sp += (state.p - state.sp) * 0.08;
    state.px += (state.tx - state.px) * 0.05;
    state.py += (state.ty - state.py) * 0.05;
    const p = state.sp;

    const narrow = state.w < 760;
    const u = remap(p);
    posCurve.getPoint(u, camera.position);
    tgtCurve.getPoint(u, tmp);
    camera.position.x += state.px * 1.2;
    camera.position.y += state.py * 0.8;
    if (narrow) camera.position.addScaledVector(camera.position.clone().sub(tmp).normalize(), 9);
    camera.lookAt(tmp);
    camera.fov = fovAt(p) + (narrow ? 8 : 0);
    camera.updateProjectionMatrix();

    sweep.value = HALF + 2 - smooth(p / 0.14) * (LEN + 4);
    glow.value = p < 0.15 ? 1 : Math.max(0, 1 - (p - 0.15) / 0.04);
    winBoost.value = -4 + smooth((p - 0.42) / 0.14) * 26;
    lockOn.value = smooth((p - 0.48) / 0.05) * (0.7 + 0.3 * Math.sin(t * 6));
    const target = 2 + smooth((p - 0.18) / 0.16) * 26 + (p > 0.86 ? 40 : 0);
    fanSpeed += (target - fanSpeed) * 0.04;
    for (const f of fans) f.rotation.x += fanSpeed * dt;

    const warmK = smooth((p - 0.58) / 0.08) * (1 - smooth((p - 0.74) / 0.08));
    warm.intensity = warmK * 2.4;
    fill.intensity = 20 + warmK * 60;
    scene.fog.color.setRGB(0.027 + warmK * 0.06, 0.024 + warmK * 0.02, 0.1 - warmK * 0.05);

    const take = smooth((p - 0.86) / 0.14);
    plane.position.x = take * take * 60;
    plane.position.y = Math.max(0, take - 0.35) * 18;
    plane.rotation.z = Math.max(0, take - 0.3) * 0.25;
    beacon.material.color.setRGB(Math.sin(t * 8) > 0.6 ? 1 : 0.15, 0.05, 0.08);

    const dpos = dustGeo.attributes.position;
    for (let i = 0; i < dustN; i += 4) dpos.setY(i, GROUND + ((dpos.getY(i) - GROUND + dt * 0.15) % 20));
    dpos.needsUpdate = true;

    if (opts.onHotspots) {
      const out = [];
      for (const h of hotspots) {
        const on = p > h.from && p < h.to;
        tmp.copy(h.pos);
        plane.localToWorld(tmp);
        tmp.project(camera);
        out.push({ id: h.id, x: (tmp.x * 0.5 + 0.5) * state.w, y: (-tmp.y * 0.5 + 0.5) * state.h, on: on && tmp.z < 1 });
      }
      opts.onHotspots(out);
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);
  };
  render();

  return {
    setProgress(p) { state.p = clamp(p); },
    setPointer(x, y) { state.tx = x; state.ty = y; },
    setRunning(v) { running = v; },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      renderer.dispose();
      pmrem.dispose();
      if (composer) composer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    },
  };
}
