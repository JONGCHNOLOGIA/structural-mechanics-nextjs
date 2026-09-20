'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/*
  처짐과 굽힘응력을 함께 보여주는 3D 보. CH.9·CH.10이 공용으로 쓴다.

  참고자료 mmch9.pdf p.7의 Euler-Bernoulli 보 이론을 그대로 쓴다:
    - 처짐:   계산해 둔 v(x)를 그대로 정점에 반영 (보이도록 크게 부풀림)
    - 응력:   σ(x, y) = −M(x)·y / I  →  중립축에서 0, 위아래 표면에서 최대
  이 σ를 정점 색으로 칠하면 요청하신 ANSYS 그림 같은 그라데이션이 나온다.
  (압축 = 파랑, 0 = 초록, 인장 = 빨강)

  ⚠️ 유한요소해석이 아니다. 보 이론이라 하중이 찍히는 바로 아래 같은 국소 영역은
  실제와 다르다. 색은 "어디가 많이 받고 어디가 덜 받는가"를 읽는 용도다.

  드래그로 돌려보고, 가만히 두면 천천히 자동 회전 — 다른 3D 보기들과 같은 조작이다.
*/

const SEG_X = 90; // 길이 방향 분할 (처짐 곡선이 매끄럽게 보일 만큼)
const SEG_Y = 10; // 높이 방향 분할 (응력 그라데이션용)

// 압축(−1) → 0 → 인장(+1). 교재 컬러바와 같은 방향.
function stressColor(t, out) {
  const u = Math.max(-1, Math.min(1, t));
  if (u < 0) {
    // 0 → 압축: 초록 → 하늘 → 파랑
    const k = -u;
    out.setRGB(0.42 - 0.3 * k, 0.72 - 0.35 * k, 0.45 + 0.4 * k);
  } else {
    // 0 → 인장: 초록 → 노랑 → 빨강
    out.setRGB(0.42 + 0.55 * u, 0.72 - 0.5 * u, 0.45 - 0.35 * u);
  }
  return out;
}

export default function BeamDeflect3D({ pts, L, height = 0.5, width = 0.3, exaggerate = true }) {
  const mountRef = useRef(null);
  const propsRef = useRef({ pts, L, height, width, exaggerate });
  const rebuildRef = useRef(null);
  propsRef.current = { pts, L, height, width, exaggerate };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const dl = new THREE.DirectionalLight(0xffffff, 0.35);
    dl.position.set(3, 6, 5);
    scene.add(dl);

    const SPAN = 6; // 화면상의 보 길이
    let mesh = null, geo = null, mat = null, edges = null, ghost = null;

    function clear() {
      [mesh, edges, ghost].forEach((o) => o && scene.remove(o));
      if (geo) geo.dispose();
      if (mat) mat.dispose();
      if (edges) {
        edges.geometry.dispose();
        edges.material.dispose();
      }
      if (ghost) {
        ghost.geometry.dispose();
        ghost.material.dispose();
      }
      mesh = geo = mat = edges = ghost = null;
    }

    function build() {
      const p = propsRef.current;
      clear();
      const list = Array.isArray(p.pts) ? p.pts : [];
      if (list.length < 2 || !(p.L > 0)) return;

      const hS = 0.9; // 화면상의 보 높이
      const bS = 0.55; // 화면상의 보 폭

      // 처짐과 모멘트를 x에 대해 빠르게 찾아 쓰려고 미리 뽑아둔다
      const xs = list.map((q) => q.x);
      const vs = list.map((q) => q.v || 0);
      const ms = list.map((q) => q.M || 0);
      const maxAbsV = Math.max(1e-12, ...vs.map(Math.abs));
      const maxAbsM = Math.max(1e-12, ...ms.map(Math.abs));
      // 처짐은 보 길이에 비해 아주 작아서 실제 비율로는 안 보인다 — 높이의 60%까지 부풀린다
      const vGain = p.exaggerate ? (hS * 0.6) / maxAbsV : 1;

      const sample = (arr, x) => {
        const t = (x / p.L) * (list.length - 1);
        const i = Math.max(0, Math.min(list.length - 2, Math.floor(t)));
        const f = t - i;
        return arr[i] + (arr[i + 1] - arr[i]) * f;
      };

      geo = new THREE.BoxGeometry(SPAN, hS, bS, SEG_X, SEG_Y, 1);
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const c = new THREE.Color();

      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const xReal = ((px + SPAN / 2) / SPAN) * p.L; // 화면좌표 → 실제 x
        // 처짐: v는 아래로 +인 관례라 three.js의 위로 +에 맞춰 부호를 뒤집는다
        pos.setY(i, py - sample(vs, xReal) * vGain);

        // 응력: σ = −M·y/I. I와 실제 치수는 색의 "상대적 세기"에만 영향을 주므로,
        // 여기서는 M(x)와 높이 방향 위치(py)만으로 정규화한다.
        const yNorm = py / (hS / 2); // −1(아래) ~ +1(위)
        const sigma = -sample(ms, xReal) * yNorm;
        stressColor(sigma / maxAbsM, c);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      pos.needsUpdate = true;
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();

      mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo, 30),
        new THREE.LineBasicMaterial({ color: 0x51626f, transparent: true, opacity: 0.45 })
      );
      scene.add(edges);

      // 변형 전 위치를 옅게 남겨서 얼마나 처졌는지 견주어 볼 수 있게 한다
      const ghostGeo = new THREE.BoxGeometry(SPAN, hS, bS);
      ghost = new THREE.LineSegments(
        new THREE.EdgesGeometry(ghostGeo),
        new THREE.LineDashedMaterial({ color: 0x8a97a2, dashSize: 0.12, gapSize: 0.09, transparent: true, opacity: 0.5 })
      );
      ghost.computeLineDistances();
      scene.add(ghost);
      ghostGeo.dispose();
    }
    rebuildRef.current = build;
    build();

    let theta = -0.62, phi = 1.12, radius = 9.2;
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

    function onDown(e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      idle = 0;
    }
    function onMove(e) {
      if (!dragging) return;
      theta -= (e.clientX - lastX) * 0.008;
      phi = Math.min(Math.PI - 0.15, Math.max(0.15, phi - (e.clientY - lastY) * 0.008));
      lastX = e.clientX;
      lastY = e.clientY;
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
      const w = mount.clientWidth || 460;
      const h = Math.round(w * 0.46);
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
      if (!dragging) {
        idle += 1;
        if (idle > 60) theta += 0.003;
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
      clear();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    propsRef.current = { pts, L, height, width, exaggerate };
    if (rebuildRef.current) rebuildRef.current();
  }, [pts, L, height, width, exaggerate]);

  return (
    <div>
      <div ref={mountRef} style={{ width: '100%', maxWidth: 560, margin: '0 auto' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6, fontSize: 10.5, color: 'var(--gray-soft)' }}>
        <span style={{ fontWeight: 800, color: '#2D57A8' }}>압축 −</span>
        <span
          style={{
            width: 120,
            height: 10,
            display: 'inline-block',
            background: 'linear-gradient(to right, rgb(31,94,217), rgb(107,184,115), rgb(247,112,26))',
            border: '1px solid var(--line)',
          }}
        />
        <span style={{ fontWeight: 800, color: '#C3002F' }}>+ 인장</span>
      </div>
      <p style={{ fontSize: 10.5, color: 'var(--gray-soft)', textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
        색 = 굽힘응력 σ = −M(x)·y / I (Euler-Bernoulli) · 점선 = 변형 전 · 드래그로 돌려볼 수 있어요
        <br />
        처짐은 실제보다 크게 부풀려 그렸습니다.
      </p>
    </div>
  );
}
