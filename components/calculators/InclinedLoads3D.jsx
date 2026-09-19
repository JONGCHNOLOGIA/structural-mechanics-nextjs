'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// 참고자료(mmch6.pdf p.37)의 3D 응력분포 그림은 쐐기 모양이 뭘 의미하는지 알아보기 어려워서,
// 대신 단면 자리에 D→F→E→G 사각형 모양의 "색이 칠해진 판"을 띄우는 방식으로 새로 그림 —
// 각 꼭짓점의 실제 응력 부호/크기에 따라 흰색(0)→크림슨(압축)/틸(인장)로 보간되는 그라데이션.
// 중립축(점선)도 실제 각도(β)로 표시해서, "이 선을 기준으로 압축/인장이 나뉜다"가 한눈에 보이게 함.
const CRIMSON = 0xc3002f;
const TEAL = 0x1e7f72;
const GRAY = 0x51626f;
const INK = 0x3a3a3a;

export default function InclinedLoads3D({ b, h, alphaRad, corners, betaRad, maxSigma, q, qMax }) {
  const mountRef = useRef(null);
  const propsRef = useRef({ b, h, alphaRad, corners, betaRad, maxSigma, q, qMax });
  const rebuildRef = useRef(null);
  propsRef.current = { b, h, alphaRad, corners, betaRad, maxSigma, q, qMax };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7);
    dl.position.set(4, 6, 5);
    scene.add(dl);

    const L = 6;
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.85 });
    let beam = null;
    let stressPlane = null;
    let naLine = null;
    const cornerDots = [];

    function rebuild() {
      const { b, h, alphaRad, corners, betaRad, maxSigma, q, qMax } = propsRef.current;
      if (beam) {
        if (beam.userData.loadGroup) {
          scene.remove(beam.userData.loadGroup);
          beam.userData.loadGroup.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) o.material.dispose && o.material.dispose();
          });
        }
        scene.remove(beam);
        beam.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose && o.material.dispose();
        });
      }
      cornerDots.length = 0;

      const maxDim = Math.max(b, h);
      const s = 2.2 / maxDim;
      const bS = b * s,
        hS = h * s;

      // 하중을 올리면 실제로 처지는 게 보이도록 길이 방향으로 잘게 쪼갠다 (안 쪼개면 휘지 않는다)
      const beamGeo = new THREE.BoxGeometry(L, hS, bS, 40, 1, 1);
      beam = new THREE.Mesh(beamGeo, beamMat);
      beam.rotation.x = alphaRad;
      scene.add(beam);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(beamGeo, 25), new THREE.LineBasicMaterial({ color: GRAY }));
      beam.add(edges);

      // ---- 처짐 ----
      // 기울어진 단면에서는 하중이 수직이어도 보가 수직으로 처지지 않는다. 실제 처짐은
      // 중립축(n-n)에 수직인 방향으로 일어나며, 이게 이 단원의 핵심이다. 그래서 여기서도
      // 중립축 각도 β에서 처짐 방향을 얻는다 — 중립축 방향이 (sinβ, cosβ)이므로 그 수직은
      // (cosβ, -sinβ)이고, 하중이 누르는 쪽이라 부호를 뒤집어 (-cosβ, sinβ)로 쓴다.
      // (α=0이면 β=0이라 (-1,0), 즉 평범하게 아래로 처진다)
      const qLevel = qMax > 0 ? Math.max(-1, Math.min(1, (q || 0) / qMax)) : 0;
      const maxDefl = 0.45 * qLevel;
      const dy = -Math.cos(betaRad) * maxDefl;
      const dz = Math.sin(betaRad) * maxDefl;
      {
        const pos = beamGeo.attributes.position;
        const base = pos.array.slice();
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3];
          const t = x / (L / 2); // -1..1, 양 끝이 ±1
          const shape = 1 - t * t; // 단순지지보처럼 양 끝은 0, 가운데가 최대
          pos.array[i * 3 + 1] = base[i * 3 + 1] + dy * shape;
          pos.array[i * 3 + 2] = base[i * 3 + 2] + dz * shape;
        }
        pos.needsUpdate = true;
        beamGeo.computeVertexNormals();
        edges.geometry.dispose();
        edges.geometry = new THREE.EdgesGeometry(beamGeo, 25);
      }

      // ---- 등분포하중 화살표 ----
      // 하중은 언제나 연직(중력) 방향이라 기울어진 보가 아니라 씬에 직접 붙인다 —
      // "하중은 수직인데 단면만 기울어 있다"가 이 그림에서 읽혀야 하는 부분이다.
      // 화살표 개수는 스팬을 일정 간격으로 나눈 값이고, 굵기·길이로 크기를 나타내지는 않는다.
      if (Math.abs(qLevel) > 1e-6) {
        const loadGroup = new THREE.Group();
        const half = (hS * Math.abs(Math.cos(alphaRad)) + bS * Math.abs(Math.sin(alphaRad))) / 2;
        const topY = half + 0.18;
        const arrowLen = 0.55;
        const mat = new THREE.MeshBasicMaterial({ color: CRIMSON });
        const n = 9;
        for (let i = 0; i < n; i++) {
          const x = -L / 2 + (L * i) / (n - 1);
          const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, arrowLen, 6), mat);
          shaft.position.set(x, topY + arrowLen / 2 + 0.1, 0);
          loadGroup.add(shaft);
          const head = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 8), mat);
          head.position.set(x, topY + 0.07, 0);
          head.rotation.x = Math.PI;
          loadGroup.add(head);
        }
        // 화살표 꼬리를 잇는 선 — 이게 있어야 "고르게 퍼진 하중"으로 읽힌다
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-L / 2, topY + arrowLen + 0.1, 0),
          new THREE.Vector3(L / 2, topY + arrowLen + 0.1, 0),
        ]);
        loadGroup.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: CRIMSON })));
        beam.userData.loadGroup = loadGroup;
        scene.add(loadGroup);
      }

      // 응력 색상판 (D-F-E-G 사각형 둘레 순서) — 색 강도는 지금 이 순간의 최대 응력이 아니라
      // q 슬라이더 최댓값 기준 응력(maxSigma)으로 고정 정규화해서, 하중을 올릴수록 점점 진해지게 함.
      const maxAbs = maxSigma != null ? Math.max(1e-9, maxSigma) : Math.max(1e-9, ...corners.map((c) => Math.abs(c.sigma)));
      const colorFor = (sigma) => {
        const t = Math.min(1, Math.abs(sigma) / maxAbs);
        const base = new THREE.Color(sigma >= 0 ? TEAL : CRIMSON);
        return new THREE.Color(0xffffff).lerp(base, t);
      };
      const order = ['D', 'F', 'E', 'G'].map((n) => corners.find((c) => c.name === n));
      const toLocal = (c) => new THREE.Vector3(L / 2 + 0.02, (c.y / (h / 2)) * (hS / 2), (c.z / (b / 2)) * (bS / 2));
      const pts = order.map(toLocal);
      const cols = order.map((c) => colorFor(c.sigma));
      const positions = new Float32Array([
        pts[0].x, pts[0].y, pts[0].z, pts[1].x, pts[1].y, pts[1].z, pts[2].x, pts[2].y, pts[2].z,
        pts[0].x, pts[0].y, pts[0].z, pts[2].x, pts[2].y, pts[2].z, pts[3].x, pts[3].y, pts[3].z,
      ]);
      const colors = new Float32Array([
        cols[0].r, cols[0].g, cols[0].b, cols[1].r, cols[1].g, cols[1].b, cols[2].r, cols[2].g, cols[2].b,
        cols[0].r, cols[0].g, cols[0].b, cols[2].r, cols[2].g, cols[2].b, cols[3].r, cols[3].g, cols[3].b,
      ]);
      const planeGeo = new THREE.BufferGeometry();
      planeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      planeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const planeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
      stressPlane = new THREE.Mesh(planeGeo, planeMat);
      beam.add(stressPlane);

      // 중립축(n-n): tanβ = y/z
      const naLen = Math.max(bS, hS) * 0.85;
      const dirY = Math.sin(betaRad) * naLen,
        dirZ = Math.cos(betaRad) * naLen;
      const naGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(L / 2 + 0.04, dirY, dirZ),
        new THREE.Vector3(L / 2 + 0.04, -dirY, -dirZ),
      ]);
      naLine = new THREE.Line(naGeo, new THREE.LineDashedMaterial({ color: INK, dashSize: 0.07, gapSize: 0.05 }));
      naLine.computeLineDistances();
      beam.add(naLine);

      order.forEach((c) => {
        const p = toLocal(c);
        const dotGeo = new THREE.SphereGeometry(0.045, 12, 12);
        const dotMat = new THREE.MeshBasicMaterial({ color: c.sigma >= 0 ? TEAL : CRIMSON });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(p);
        dot.position.x += 0.03;
        beam.add(dot);
        cornerDots.push(dot);
      });
    }
    rebuildRef.current = rebuild;
    rebuild();

    // 응력 색상판(= 우리가 계산하는 단면)은 보의 +x 끝에 붙어 있다. theta가 음수면 카메라가
    // -x 쪽에 서게 되어 그 반대쪽 민짜 끝면을 보면서 시작했다. 부호를 뒤집어 처음부터
    // 계산 단면이 정면으로 오게 한다. (가만히 두면 뒤에서 theta를 천천히 늘려 자동 회전한다)
    let theta = 0.6,
      phi = 1.1,
      radius = 8.5;
    let dragging = false,
      lastX = 0,
      lastY = 0,
      idleTimer = 0;

    function updateCamera() {
      camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
      camera.lookAt(0, 0, 0);
    }
    updateCamera();

    function onPointerDown(e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      idleTimer = 0;
    }
    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - lastX,
        dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      theta -= dx * 0.008;
      phi = Math.min(Math.PI - 0.15, Math.max(0.15, phi - dy * 0.008));
      updateCamera();
    }
    function onPointerUp() {
      dragging = false;
    }
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    function resize() {
      const w = mount.clientWidth,
        h2 = mount.clientHeight;
      camera.aspect = w / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h2);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      if (!dragging) {
        idleTimer += 1;
        if (idleTimer > 60) theta += 0.0035;
        updateCamera();
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // props가 바뀔 때마다(치수/각도/응력) 다시 지오메트리만 새로 그림 — 씬/카메라는 그대로 유지
  useEffect(() => {
    propsRef.current = { b, h, alphaRad, corners, betaRad, maxSigma, q, qMax };
    if (rebuildRef.current) rebuildRef.current();
  }, [b, h, alphaRad, corners, betaRad, maxSigma, q, qMax]);

  return (
    <div>
      <div ref={mountRef} style={{ width: '100%', maxWidth: 520, height: 260, margin: '10px auto 0' }} />
      <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--gray-soft)', fontWeight: 700, marginTop: -4 }}>
        🖱️ 드래그해서 돌려보세요 — 판 색이 진할수록 응력이 커요
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 4, fontSize: 10.5 }}>
        <span style={{ color: 'var(--crimson)', fontWeight: 700 }}>■ 압축</span>
        <span style={{ color: 'var(--gray-soft)', fontWeight: 700 }}>┄ 중립축</span>
        <span style={{ color: 'var(--teal)', fontWeight: 700 }}>■ 인장</span>
      </div>
    </div>
  );
}
