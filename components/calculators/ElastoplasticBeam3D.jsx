'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/*
  모멘트를 키우면 보가 휘다가, 항복모멘트를 넘어서면 표면부터 소성으로 변해가는 모습.

  보를 높이 방향으로 세 겹으로 쪼개서 그린다:
    - 가운데(−e ~ +e): 아직 탄성으로 버티는 코어
    - 위/아래(±e ~ ±c): 이미 항복해버린 소성 영역
  탄성 구간에서는 e = c라서 소성 겹이 두께 0이 되어 보이지 않고, 모멘트를 키울수록
  소성 영역이 표면에서 안쪽으로 먹어 들어온다. 완전소성이면 e = 0이라 코어가 사라진다.

  중요한 부분: 소성은 되돌릴 수 없다. 그래서 모멘트를 다시 0으로 내려도 보가 완전히
  펴지지 않고 휜 채로 남는다(잔류변형). 이 컴포넌트는 그 잔류 곡률(residualRatio)을
  받아서 현재 곡률에 더해 그리기만 하고, "지금까지 겪은 최대 모멘트"를 기억하는 일은
  부르는 쪽에서 한다.

  BeamElevation3D와 같은 방식 — 드래그로 돌리고, 가만히 두면 천천히 자동 회전.
*/

const CRIMSON = 0xc3002f;
const CORE = 0xe1f2ef;
const CORE_EDGE = 0x1e7f72;
const GRAY = 0x8a97a2;

// 화면에서 허용할 최대 휨 (곡률비가 아무리 커져도 이보다 더 휘지는 않게 한다)
const MAX_BEND = 0.85;
// 이 곡률비쯤에서 MAX_BEND에 닿도록 — 완전소성 근처에서 곡률이 무한대로 가기 때문에 상한이 필요하다
const BEND_FULL_AT = 4;

export default function ElastoplasticBeam3D({ width, height, c, e, kappaRatio, residualRatio, stage }) {
  const mountRef = useRef(null);
  const propsRef = useRef({ width, height, c, e, kappaRatio, residualRatio, stage });
  const rebuildRef = useRef(null);
  propsRef.current = { width, height, c, e, kappaRatio, residualRatio, stage };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6);
    dl.position.set(4, 6, 5);
    scene.add(dl);

    const L = 6;
    const SEGS = 44;
    let layers = []; // { mesh, geo, mat, edges }

    function clearLayers() {
      layers.forEach(({ mesh, geo, mat, edges }) => {
        scene.remove(mesh);
        geo.dispose();
        mat.dispose();
        edges.geometry.dispose();
        edges.material.dispose();
      });
      layers = [];
    }

    // 세 겹(소성 아래 / 탄성 코어 / 소성 위)을 현재 e에 맞춰 다시 만든다.
    // 두께가 0에 가까운 겹은 아예 만들지 않는다 — 두께 0짜리 Box는 면이 겹쳐 지저분해진다.
    function build() {
      const p = propsRef.current;
      clearLayers();
      const maxDim = Math.max(p.width, p.height);
      const s = 2.0 / maxDim;
      const hS = p.height * s;
      const bS = p.width * s;
      const cS = (p.c || p.height / 2) * s;
      const eS = Math.max(0, Math.min(cS, (p.e || 0) * s));

      const bands = [
        { y0: -cS, y1: -eS, plastic: true },
        { y0: -eS, y1: eS, plastic: false },
        { y0: eS, y1: cS, plastic: true },
      ];

      bands.forEach((band, i) => {
        const th = band.y1 - band.y0;
        if (th < 1e-4) return;
        const geo = new THREE.BoxGeometry(L, th, bS, SEGS, 1, 1);
        const mat = new THREE.MeshStandardMaterial({
          color: band.plastic ? CRIMSON : CORE,
          roughness: 0.85,
          metalness: 0.05,
          transparent: !band.plastic,
          opacity: band.plastic ? 1 : 0.92,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.baseY = (band.y0 + band.y1) / 2;
        scene.add(mesh);
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo, 25),
          new THREE.LineBasicMaterial({ color: band.plastic ? CRIMSON : CORE_EDGE })
        );
        mesh.add(edges);
        layers.push({ mesh, geo, mat, edges, key: i });
      });
      applyBend();
    }
    rebuildRef.current = build;

    function applyBend() {
      const p = propsRef.current;
      // 잔류 곡률 + 지금 모멘트가 만드는 곡률. 곡률비가 커질수록 휘되 상한에 완만하게 붙는다.
      const total = (p.kappaRatio || 0) + (p.residualRatio || 0);
      const norm = Math.min(1, total / BEND_FULL_AT);
      const bend = -MAX_BEND * norm; // 아래로 볼록(새깅)

      layers.forEach(({ mesh, geo, edges }) => {
        const pos = geo.attributes.position;
        const base = geo.userData.basePosition || (geo.userData.basePosition = pos.array.slice());
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3];
          const t = x / (L / 2);
          pos.array[i * 3 + 1] = base[i * 3 + 1] + bend * (1 - t * t);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        mesh.position.y = mesh.userData.baseY;
        edges.geometry.dispose();
        edges.geometry = new THREE.EdgesGeometry(geo, 25);
      });
    }

    build();

    // ---- 양 끝 모멘트 화살표 ----
    function momentArrow(xPos, ccw) {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x51626f, roughness: 0.6 });
      const torus = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.038, 8, 26, Math.PI * 1.5), mat);
      torus.rotation.z = ccw ? Math.PI * 0.25 : Math.PI * 1.25;
      if (!ccw) torus.rotation.y = Math.PI;
      group.add(torus);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.2, 10), mat);
      const a = ccw ? Math.PI * 0.25 : -Math.PI * 0.25;
      cone.position.set(0.7 * Math.cos(a), 0.7 * Math.sin(a), 0);
      cone.rotation.z = a + (ccw ? Math.PI / 2 : -Math.PI / 2);
      group.add(cone);
      group.position.set(xPos, 0, 0);
      return group;
    }
    scene.add(momentArrow(-L / 2 - 0.2, true));
    scene.add(momentArrow(L / 2 + 0.2, false));

    // ---- 카메라 ----
    let theta = -0.55, phi = 1.12, radius = 8.2;
    let dragging = false, lastX = 0, lastY = 0, idle = 0;
    function updateCamera() {
      camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(0, 0, 0);
    }
    updateCamera();

    function onDown(ev) {
      dragging = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      idle = 0;
    }
    function onMove(ev) {
      if (!dragging) return;
      theta -= (ev.clientX - lastX) * 0.008;
      phi = Math.min(Math.PI - 0.15, Math.max(0.15, phi - (ev.clientY - lastY) * 0.008));
      lastX = ev.clientX;
      lastY = ev.clientY;
      updateCamera();
    }
    function onUp() {
      dragging = false;
    }
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    function resize() {
      const w = mount.clientWidth || 420;
      const h = Math.round(w * 0.52);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      applyBend();
      if (!dragging) {
        idle += 1;
        if (idle > 60) theta += 0.0032;
        updateCamera();
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      mount.removeChild(renderer.domElement);
      clearLayers();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 단면 치수나 소성 경계(e)가 바뀌면 겹을 다시 만든다 — 곡률만 바뀔 때는 매 프레임 applyBend가 처리한다
  useEffect(() => {
    propsRef.current = { width, height, c, e, kappaRatio, residualRatio, stage };
    if (rebuildRef.current) rebuildRef.current();
  }, [width, height, c, e, kappaRatio, residualRatio, stage]);

  return <div ref={mountRef} style={{ width: '100%', maxWidth: 560, margin: '0 auto' }} />;
}
