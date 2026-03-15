'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type CityDef = { name: string; lat: number; lon: number };
type PlottedCity = { name: string; lat: number; lon: number };

const CITIES: CityDef[] = [
  { name: 'Delhi', lat: 46.2, lon: -126.0 },
  { name: 'Mumbai', lat: 38.4, lon: -78.0 },
  { name: 'Bengaluru', lat: -22.8, lon: -47.0 },
  { name: 'Chennai', lat: 52.0, lon: 8.0 },
  { name: 'Kolkata', lat: 24.6, lon: 34.0 },
  { name: 'Hyderabad', lat: -26.4, lon: 27.0 },
  { name: 'Pune', lat: 26.8, lon: 58.0 },
  { name: 'Ahmedabad', lat: 19.2, lon: 84.0 },
  { name: 'Kochi', lat: -7.4, lon: 106.0 },
  { name: 'Goa', lat: -33.6, lon: 148.0 },
  { name: 'Jaipur', lat: 36.2, lon: 138.0 },
  { name: 'Guwahati', lat: -36.8, lon: 171.0 },
];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function latLonToVec3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function makeLabelTexture(text: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 90;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '700 38px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(14, 7, 33, 0.72)';
  ctx.beginPath();
  ctx.roundRect(8, 14, canvas.width - 16, canvas.height - 28, 14);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#f5f3ff';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function HeroRouteGlobe() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const routeLineRef = useRef<THREE.Line | null>(null);
  const cityPinsRef = useRef<THREE.Mesh[]>([]);
  const pinByCityRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const labelSpritesRef = useRef<THREE.Sprite[]>([]);
  const dragRef = useRef({ active: false, moved: false, prevX: 0, prevY: 0 });
  const targetRotationRef = useRef({ x: 0.34, y: 0.6 });
  const sourceRef = useRef<PlottedCity | null>(null);
  const destinationRef = useRef<PlottedCity | null>(null);

  const cityMap = useMemo(() => {
    const map = new Map<string, PlottedCity>();
    CITIES.forEach((city) => {
      map.set(city.name, { name: city.name, lat: city.lat, lon: city.lon });
    });
    return map;
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const isSmallViewport = window.innerWidth < 1200;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0.15, 4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmallViewport ? 1.4 : 2));
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0xc4b5fd, 0x1f1338, 0.9);
    scene.add(hemisphere);
    const directional = new THREE.DirectionalLight(0xfffbeb, 0.9);
    directional.position.set(2.5, 2, 2.5);
    scene.add(directional);

    const globeGroup = new THREE.Group();
    globeGroupRef.current = globeGroup;
    scene.add(globeGroup);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1.22, 56, 56),
      new THREE.MeshPhysicalMaterial({
        color: 0x201047,
        roughness: 0.44,
        metalness: 0.1,
        transmission: 0.05,
        clearcoat: 0.48,
        emissive: 0x261659,
        emissiveIntensity: 0.34,
      })
    );
    globeGroup.add(globe);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(1.225, 24, 20)),
      new THREE.LineBasicMaterial({ color: 0xb794f4, transparent: true, opacity: 0.28 })
    );
    globeGroup.add(wire);

    CITIES.forEach((city) => {
      const pinPos = latLonToVec3(city.lat, city.lon, 1.28);
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 18, 18),
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.5,
        })
      );
      pin.position.copy(pinPos);
      pin.userData = { city: city.name };
      globeGroup.add(pin);
      cityPinsRef.current.push(pin);
      pinByCityRef.current.set(city.name, pin);

      const labelTexture = makeLabelTexture(city.name);
      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: labelTexture, transparent: true, opacity: 0.95 })
      );
      label.position.copy(pinPos.clone().multiplyScalar(1.1).add(new THREE.Vector3(0, 0.09, 0)));
      label.scale.set(0.62, 0.15, 1);
      globeGroup.add(label);
      labelSpritesRef.current.push(label);
    });

    const starGeometry = new THREE.BufferGeometry();
    const stars = new Float32Array(160 * 3);
    for (let i = 0; i < 160; i += 1) {
      const r = 6 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      stars[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      stars[i * 3 + 1] = r * Math.cos(phi);
      stars[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xf5d0fe, size: 0.03, transparent: true, opacity: 0.75 })));

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const clearRoute = () => {
      if (!routeLineRef.current) return;
      routeLineRef.current.parent?.remove(routeLineRef.current);
      routeLineRef.current.geometry.dispose();
      (routeLineRef.current.material as THREE.Material).dispose();
      routeLineRef.current = null;
    };

    const paintPinSelection = (sourceName: string | null, destinationName: string | null) => {
      pinByCityRef.current.forEach((pin, cityName) => {
        const material = pin.material as THREE.MeshStandardMaterial;
        if (cityName === sourceName) {
          material.color.set(0x34d399);
          material.emissive.set(0x10b981);
          material.emissiveIntensity = 0.9;
          pin.scale.set(1.28, 1.28, 1.28);
          return;
        }
        if (cityName === destinationName) {
          material.color.set(0x60a5fa);
          material.emissive.set(0x3b82f6);
          material.emissiveIntensity = 0.9;
          pin.scale.set(1.28, 1.28, 1.28);
          return;
        }

        material.color.set(0xfacc15);
        material.emissive.set(0xf59e0b);
        material.emissiveIntensity = 0.5;
        pin.scale.set(1, 1, 1);
      });
    };

    const drawRoute = (from: { lat: number; lon: number }, to: { lat: number; lon: number }) => {
      clearRoute();
      if (!globeGroupRef.current) return;

      const fromVec = latLonToVec3(from.lat, from.lon, 1.34);
      const toVec = latLonToVec3(to.lat, to.lon, 1.34);
      const mid = fromVec.clone().add(toVec).multiplyScalar(0.5).normalize().multiplyScalar(1.95);
      const curve = new THREE.QuadraticBezierCurve3(fromVec, mid, toVec);
      const points = curve.getPoints(120);

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: 0xfacc15,
        dashSize: 0.11,
        gapSize: 0.07,
        transparent: true,
        opacity: 1,
        depthTest: false,
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      line.renderOrder = 20;
      line.frustumCulled = false;
      routeLineRef.current = line;
      globeGroupRef.current.add(line);
    };

    const rotateToCity = (city: { lat: number; lon: number }) => {
      const spinTargetY = ((city.lon - 20) * Math.PI) / 180;
      const spinTargetX = clamp((-city.lat * Math.PI) / 240, -0.7, 0.7);
      targetRotationRef.current.y = spinTargetY;
      targetRotationRef.current.x = spinTargetX;
    };

    const handlePinSelect = (cityName: string) => {
      const city = cityMap.get(cityName);
      if (!city) return;

      if (!sourceRef.current || (sourceRef.current && destinationRef.current)) {
        sourceRef.current = city;
        destinationRef.current = null;
        clearRoute();
        rotateToCity(city);
        paintPinSelection(city.name, null);
        return;
      }

      destinationRef.current = city;
      drawRoute(sourceRef.current, city);
      rotateToCity(city);
      paintPinSelection(sourceRef.current.name, city.name);
    };

    const onPointerDown = (event: PointerEvent) => {
      dragRef.current.active = true;
      dragRef.current.moved = false;
      dragRef.current.prevX = event.clientX;
      dragRef.current.prevY = event.clientY;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current.active) return;
      const dx = event.clientX - dragRef.current.prevX;
      const dy = event.clientY - dragRef.current.prevY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragRef.current.moved = true;
      }
      dragRef.current.prevX = event.clientX;
      dragRef.current.prevY = event.clientY;

      targetRotationRef.current.y += dx * 0.006;
      targetRotationRef.current.x = clamp(targetRotationRef.current.x + dy * 0.004, -0.9, 0.9);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!rendererRef.current || !cameraRef.current || !globeGroupRef.current) {
        dragRef.current.active = false;
        return;
      }

      if (!dragRef.current.moved) {
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, cameraRef.current);
        const intersects = raycaster.intersectObjects(cityPinsRef.current, false);
        if (intersects.length > 0) {
          const cityName = intersects[0].object.userData.city as string;
          handlePinSelect(cityName);
        }
      }

      dragRef.current.active = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (globeGroupRef.current) {
        const smoothFactor = prefersReducedMotion ? 0.07 : 0.1;
        globeGroupRef.current.rotation.y += (targetRotationRef.current.y - globeGroupRef.current.rotation.y) * smoothFactor;
        globeGroupRef.current.rotation.x += (targetRotationRef.current.x - globeGroupRef.current.rotation.x) * smoothFactor;
      }
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      rendererRef.current.render(scene, camera);
    };

    const onVisibility = () => {
      if (!document.hidden) {
        onResize();
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('pageshow', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pageshow', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);

      clearRoute();
      scene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
        if (obj instanceof THREE.Sprite) {
          const mat = obj.material as THREE.SpriteMaterial;
          mat.map?.dispose();
          mat.dispose();
        }
      });
      renderer.dispose();
      cityPinsRef.current = [];
      pinByCityRef.current.clear();
      labelSpritesRef.current = [];

      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [cityMap]);

  return (
    <div className="hero-globe-shell">
      <div ref={mountRef} className="hero-globe-canvas" />
      <div className="hero-globe-overlay" />
    </div>
  );
}
