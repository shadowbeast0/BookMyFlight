import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildAirliner } from './planeScene.js';

const FLOOR = -0.75;
const CUT = 0.3;
const WINDOWS_X = [];
for (let x = -9.5; x <= 11; x += 0.92) if (Math.abs(x - 10.2) >= 0.5 && Math.abs(x + 8.2) >= 0.5) WINDOWS_X.push(x);
const SUN = new THREE.Vector3(-0.55, 0.16, 0.82).normalize();
const SEAT_Z = {
  narrow: { A: 1.36, B: 0.9, C: 0.44, D: -0.44, E: -0.9, F: -1.36 },
  wide: { A: 1.22, C: 0.52, D: -0.52, F: -1.22 },
};

const seatPositionOf = (seat) => { const l = seat.slice(-1); return l === 'A' || l === 'F' ? 'window' : l === 'C' || l === 'D' ? 'aisle' : 'middle'; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function box(w, h, d, x, y, z, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  if (rx) g.rotateZ(rx);
  g.translate(x, y, z);
  return g;
}

function economySeat() {
  return mergeGeometries([
    box(0.46, 0.13, 0.42, 0.02, 0.42, 0),
    box(0.1, 0.72, 0.42, -0.21, 0.8, 0, 0.12),
    box(0.12, 0.16, 0.34, -0.26, 1.18, 0, 0.12),
    box(0.4, 0.05, 0.05, 0.0, 0.56, 0.22),
    box(0.4, 0.05, 0.05, 0.0, 0.56, -0.22),
    box(0.05, 0.38, 0.05, 0.12, 0.18, 0.17),
    box(0.05, 0.38, 0.05, 0.12, 0.18, -0.17),
    box(0.05, 0.38, 0.05, -0.16, 0.18, 0.17),
    box(0.05, 0.38, 0.05, -0.16, 0.18, -0.17),
  ]);
}

function premiumSeat() {
  return mergeGeometries([
    box(0.52, 0.15, 0.46, 0.04, 0.44, 0),
    box(0.12, 0.8, 0.46, -0.23, 0.86, 0, 0.16),
    box(0.14, 0.2, 0.38, -0.3, 1.28, 0, 0.16),
    box(0.1, 0.3, 0.4, 0.33, 0.3, 0, -0.5),
    box(0.46, 0.08, 0.07, 0.02, 0.6, 0.25),
    box(0.46, 0.08, 0.07, 0.02, 0.6, -0.25),
    box(0.5, 0.36, 0.42, 0.02, 0.18, 0),
  ]);
}

function businessSeat() {
  return mergeGeometries([
    box(1.15, 0.14, 0.58, 0.15, 0.46, 0),
    box(0.14, 0.86, 0.58, -0.42, 0.9, 0, 0.24),
    box(0.16, 0.22, 0.46, -0.52, 1.34, 0, 0.24),
    box(1.4, 0.95, 0.06, 0.08, 0.48, 0.34),
    box(1.4, 0.95, 0.06, 0.08, 0.48, -0.34),
    box(0.06, 0.95, 0.68, -0.62, 0.48, 0),
    box(0.4, 0.5, 0.18, 0.55, 0.25, 0.22),
    box(0.04, 0.3, 0.38, 0.8, 0.85, 0),
    box(1.0, 0.36, 0.5, 0.15, 0.2, 0),
  ]);
}

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uSun: { value: SUN } },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uSun;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 zenith = vec3(0.03, 0.04, 0.16);
        vec3 mid = vec3(0.2, 0.15, 0.42);
        vec3 horizon = vec3(0.95, 0.5, 0.3);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, h));
        col = mix(col, zenith, smoothstep(0.18, 0.75, h));
        col = mix(col, vec3(0.42, 0.3, 0.42), smoothstep(0.0, -0.25, h));
        float s = max(dot(d, uSun), 0.0);
        col += vec3(1.0, 0.62, 0.32) * pow(s, 10.0) * 0.45;
        col += vec3(1.0, 0.86, 0.68) * pow(s, 900.0) * 2.2;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function cloudMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: SUN } },
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSun;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; } return v; }
      void main() {
        vec2 p = vW.xz * 0.028 + vec2(uTime * 0.04, 0.0);
        float d = fbm(p) * 0.75 + fbm(p * 3.1 + 4.0) * 0.35;
        float dens = smoothstep(0.38, 0.85, d);
        float lit = clamp((d - fbm(p + uSun.xz * 0.18) * 0.75 - fbm(p * 3.1 + 4.0 + uSun.xz * 0.5) * 0.35) * 3.0 + 0.45, 0.0, 1.0) * (0.35 + dens * 0.65);
        vec3 shadow = vec3(0.17, 0.13, 0.3);
        vec3 bright = vec3(0.98, 0.64, 0.46);
        vec3 col = mix(shadow, bright, lit);
        float dist = length(vW.xz);
        float fade = 1.0 - smoothstep(180.0, 520.0, dist);
        vec3 haze = vec3(0.7, 0.42, 0.38);
        col = mix(col, haze, smoothstep(80.0, 460.0, dist));
        gl_FragColor = vec4(col, (0.35 + dens * 0.65) * fade);
      }`,
  });
}

function windowAlpha(length, radius, mid) {
  const W = 2048;
  const H = 2048;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#000';
  const angH = 0.46 / radius / (Math.PI * 2);
  const winW = 0.32 / length;
  for (const u of [15 / 360, 0.5 - 15 / 360]) {
    for (const x of WINDOWS_X) {
      const v = 0.5 - (x - mid) / length;
      g.beginPath();
      g.roundRect((u - angH / 2) * W, (1 - v - winW / 2) * H, angH * W, winW * H, 14);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  return t;
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

export function createCabinScene(canvas, opts = {}) {
  const lite = !!opts.lite;
  const layout = opts.layout;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  renderer.setPixelRatio(lite ? 1 : Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 48, 24), skyMaterial());
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMaterial()));
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.4;

  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1), cloudMaterial());
  clouds.rotation.x = -Math.PI / 2;
  clouds.position.y = -38;
  scene.add(clouds);

  const cutTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT);
  const cut = [cutTop, new THREE.Plane(new THREE.Vector3(1, 0, 0), -12.45), new THREE.Plane(new THREE.Vector3(-1, 0, 0), -10.65)];
  const air = buildAirliner(lite);
  air.uniforms.sweep.value = -99;
  air.uniforms.glow.value = 0;
  air.uniforms.winBoost.value = 99;
  air.skin.clippingPlanes = cut;
  air.skin.clipIntersection = true;
  scene.add(air.plane);

  const interior = new THREE.Group();
  air.plane.add(interior);
  const X0 = -10.6;
  const X1 = 12.4;
  const LENGTH = X1 - X0;
  const MID = (X0 + X1) / 2;
  const RAD = 1.93;
  const shellGeo = new THREE.CylinderGeometry(RAD, RAD, LENGTH, lite ? 64 : 112, 1, true);
  shellGeo.rotateZ(Math.PI / 2);
  const shellMat = new THREE.MeshStandardMaterial({ color: '#ece8e1', roughness: 0.55, metalness: 0, side: THREE.BackSide, alphaMap: windowAlpha(LENGTH, RAD, MID), alphaTest: 0.5, clippingPlanes: cut, clipIntersection: true });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.position.x = MID;
  interior.add(shell);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(LENGTH - 0.4, 0.08, 3.5), new THREE.MeshStandardMaterial({ color: '#1c1838', roughness: 0.9 }));
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
  const frameShape = new THREE.Shape();
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
  rr(frameShape, 0.46, 0.64, 0.17);
  const hole = new THREE.Path();
  rr(hole, 0.3, 0.44, 0.12);
  frameShape.holes.push(hole);
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2, curveSegments: 8 });
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
  const binMat = new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.45 });
  for (const z of [1.18, -1.18]) {
    const bin = new THREE.Mesh(new THREE.BoxGeometry(LENGTH - 0.6, 0.42, 0.62), binMat);
    bin.position.set(MID, 1.12, z);
    bin.rotation.x = z > 0 ? -0.35 : 0.35;
    ceiling.add(bin);
  }
  const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(LENGTH - 0.6, 0.02, 0.14), new THREE.MeshBasicMaterial({ color: '#ffe6c8' }));
  lightStrip.position.set(MID, 1.86, 0);
  ceiling.add(lightStrip);
  ceiling.visible = false;

  const seatInfo = [];
  const meshes = [];
  const geos = { business: businessSeat(), premium: premiumSeat(), economy: economySeat() };
  const base = {
    business: new THREE.Color('#c9a06a'),
    premium: new THREE.Color('#2f6f9a'),
    economy: new THREE.Color('#4c5a86'),
  };
  let cursor = 12.0;
  const classSpan = {};
  for (const cls of layout) {
    const start = cursor;
    const list = [];
    for (let r = cls.firstRow; r <= cls.lastRow; r++) {
      const x = cursor - cls.pitch / 2;
      for (const l of cls.letters) list.push({ seat: `${r}${l}`, cls: cls.id, x, z: (cls.id === 'business' ? SEAT_Z.wide : SEAT_Z.narrow)[l] });
      cursor -= cls.pitch;
    }
    classSpan[cls.id] = { from: start, to: cursor, mid: (start + cursor) / 2 };
    cursor -= 0.4;
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: cls.id === 'business' ? 0.35 : 0.7, metalness: cls.id === 'business' ? 0.15 : 0 });
    const mesh = new THREE.InstancedMesh(geos[cls.id], mat, list.length);
    const m = new THREE.Matrix4();
    list.forEach((s, i) => {
      m.makeTranslation(s.x, FLOOR, s.z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, base[cls.id]);
      seatInfo.push({ ...s, mesh, index: i });
    });
    mesh.userData.list = list;
    mesh.userData.cls = cls.id;
    interior.add(mesh);
    meshes.push(mesh);
    const div = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 3.3), binMat);
    div.position.set(cursor + 0.2, FLOOR + 0.65, 0);
    interior.add(div);
  }
  const bySeat = new Map(seatInfo.map((s) => [s.seat, s]));

  scene.add(new THREE.HemisphereLight('#ffd9b8', '#3a2f66', 0.45));
  const sun = new THREE.DirectionalLight('#ffc08a', 2.6);
  sun.position.copy(SUN).multiplyScalar(60);
  scene.add(sun);
  for (let i = 0; i < 4; i++) {
    const l = new THREE.PointLight('#ffe8cf', 5, 8, 1.4);
    l.position.set(10 - i * 6.5, 1.0, 0);
    interior.add(l);
  }

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 2000);
  let composer = null;
  if (!lite) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.5, 0.9));
    composer.addPass(new OutputPass());
  }

  const occupied = new Set();
  const selected = [];
  const labels = new Map();
  let hovered = null;
  const recolor = () => {
    const c = new THREE.Color();
    for (const s of seatInfo) {
      if (selected.includes(s.seat) && view.mode !== 'seat') c.set('#ff9b3d');
      else if (occupied.has(s.seat)) c.set('#26242c');
      else c.copy(base[s.cls]);
      if (hovered === s.seat && !occupied.has(s.seat) && !selected.includes(s.seat)) c.offsetHSL(0, 0.05, 0.18);
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

  const view = {
    mode: 'overview',
    focusX: 0.8,
    az: 0.62,
    el: 0.92,
    dist: 30,
    pos: new THREE.Vector3(),
    tgt: new THREE.Vector3(),
    anim: null,
    seat: null,
    look: { x: 0, y: 0, tx: 0, ty: 0 },
  };
  recolor();
  const overviewPose = () => {
    const narrow = canvas.clientWidth < 760;
    const d = view.dist + (narrow ? 9 : 0);
    const tgt = new THREE.Vector3(view.focusX, FLOOR + 0.4, 0);
    const pos = new THREE.Vector3(
      tgt.x + Math.sin(view.az) * Math.cos(view.el) * d * 0.55,
      tgt.y + Math.sin(view.el) * d,
      tgt.z + Math.cos(view.az) * Math.cos(view.el) * d
    );
    return { pos, tgt, fov: narrow ? 44 : 36 };
  };
  const seatPose = (seat) => {
    const s = bySeat.get(seat);
    const side = s.z >= 0 ? 1 : -1;
    const pos = seatPositionOf(s.seat);
    const biz = s.cls === 'business';
    const lean = biz ? Math.abs(s.z) - 0.05 : pos === 'window' ? 1.3 : pos === 'middle' ? 1.02 : Math.abs(s.z);
    const wx = WINDOWS_X.reduce((a, b) => (Math.abs(b - s.x - 0.25) < Math.abs(a - s.x - 0.25) ? b : a));
    const eye = new THREE.Vector3(wx - (biz ? 0.45 : 0.18), biz ? 0.4 : 0.46, side * lean);
    const win = new THREE.Vector3(wx, 0.47, side * 1.86);
    const tgt = eye.clone().add(win.sub(eye).normalize().multiplyScalar(8));
    tgt.y -= 1.1;
    return { pos: eye, tgt, fov: biz ? 58 : pos === 'window' ? 62 : 52 };
  };
  const start = overviewPose();
  view.pos.copy(start.pos);
  view.tgt.copy(start.tgt);
  camera.fov = start.fov;

  const animateTo = (pose, via, dur = 1.7) => {
    view.anim = {
      t: 0,
      dur,
      p0: view.pos.clone(),
      t0: view.tgt.clone(),
      f0: camera.fov,
      p1: pose.pos.clone(),
      t1: pose.tgt.clone(),
      f1: pose.fov,
      via: via ? via.clone() : null,
    };
  };

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
  const onDown = (e) => {
    drag = { x: e.clientX, y: e.clientY, az: view.az, el: view.el, moved: false };
  };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    view.look.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    view.look.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      if (drag.moved && view.mode === 'overview' && !view.anim) {
        view.az = drag.az - dx * 0.006;
        view.el = clamp(drag.el + dy * 0.004, 0.35, 1.35);
        const p = overviewPose();
        view.pos.copy(p.pos);
        view.tgt.copy(p.tgt);
      }
      return;
    }
    if (view.mode !== 'overview' || view.anim) return;
    const s = pick(e.clientX, e.clientY);
    const next = s ? s.seat : null;
    if (next !== hovered) {
      hovered = next;
      recolor();
      canvas.style.cursor = s && !occupied.has(s.seat) ? 'pointer' : 'grab';
    }
    if (opts.onHover) opts.onHover(s ? { seat: s.seat, cls: s.cls, occupied: occupied.has(s.seat), x: e.clientX - r.left, y: e.clientY - r.top } : null);
  };
  const onUp = (e) => {
    const d = drag;
    drag = null;
    if (!d || d.moved || view.mode !== 'overview' || view.anim) return;
    const s = pick(e.clientX, e.clientY);
    if (s && !occupied.has(s.seat) && opts.onToggle) opts.onToggle(s.seat);
  };
  const onLeave = () => {
    drag = null;
    if (hovered) { hovered = null; recolor(); }
    if (opts.onHover) opts.onHover(null);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
  let wasInside = false;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    clouds.material.uniforms.uTime.value = t;
    for (const f of air.fans) f.rotation.x += 14 * dt;
    air.beacon.material.color.setRGB(Math.sin(t * 8) > 0.6 ? 1 : 0.15, 0.05, 0.08);

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
      if (a.t >= 1) view.anim = null;
    }
    const inside = view.mode === 'seat' && view.pos.y < 1.45;
    if (inside !== wasInside) {
      wasInside = inside;
      ceiling.visible = inside;
      for (const [mat, planes] of [[shellMat, cut], [air.skin, cut], [frameMat, [cutTop]], [wallMat, [cutTop]]]) {
        mat.clippingPlanes = inside ? [] : planes;
        mat.needsUpdate = true;
      }
    }
    for (const sp of labels.values()) sp.visible = !inside;

    view.look.x += (view.look.tx - view.look.x) * 0.06;
    view.look.y += (view.look.ty - view.look.y) * 0.06;
    camera.position.copy(view.pos);
    tmpT.copy(view.tgt);
    if (view.mode === 'seat' && !view.anim) {
      tmpT.x += view.look.x * 2.2;
      tmpT.y -= view.look.y * 1.2;
    } else if (view.mode === 'overview' && !drag) {
      camera.position.x += view.look.x * 0.6;
      camera.position.y -= view.look.y * 0.4;
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
    setSelected(list) { selected.length = 0; selected.push(...list); recolor(); },
    focusClass(id) {
      const span = classSpan[id];
      view.focusX = span ? span.mid : 0.8;
      view.dist = span ? (id === 'economy' ? 19 : 14) : 30;
      if (view.mode === 'overview') animateTo(overviewPose(), null, 1.2);
    },
    viewSeat(seat) {
      if (!bySeat.has(seat)) return;
      const pose = seatPose(seat);
      const s = bySeat.get(seat);
      view.mode = 'seat';
      view.seat = seat;
      recolor();
      view.look.tx = 0;
      view.look.ty = 0;
      animateTo(pose, new THREE.Vector3(s.x + 0.5, 3.2, s.z * 0.6), 2.1);
      if (opts.onHover) opts.onHover(null);
    },
    overview() {
      const s = bySeat.get(view.seat);
      view.mode = 'overview';
      recolor();
      if (s) view.focusX = s.x;
      animateTo(overviewPose(), s ? new THREE.Vector3(s.x + 0.5, 3.2, s.z * 0.6) : null, 1.8);
    },
    setRunning(v) { running = v; },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
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
