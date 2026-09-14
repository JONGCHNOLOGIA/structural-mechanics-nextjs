'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { blockColor } from '@/lib/calc/unitOptions';

// BeamElevationSVG(2D 측면도)를 3D로 다시 그린 버전. 사용자가 드래그해서 돌려볼 수 있고,
// 가만히 두면 천천히 자동 회전한다. 실제 단면 치수를 그대로 쓰는 스케일 모델이 아니라
// (2D 버전도 마찬가지) "순수굽힘 하에서 보가 어떻게 휘는지·모멘트가 어느 방향인지"를
// 보여주는 개념도라서, 길이·높이 비율은 보기 좋게 고정값을 씀.
// blocks prop(선택)을 주면, 단일 균질 보 대신 Composite Beams의 실제 블록별
// 색상·두께 비율을 반영한 적층 보로 그림 (단면 SVG와 같은 색/비율 규칙: 아래→위로 쌓고
// 폭이 다른 블록은 중앙정렬).
const GRAY = 0x51626f;
const CRIMSON = 0xc3002f;
const BEAM_FILL = 0xf2f0ea;

export default function BeamElevation3D({ momentLabel, bend, blocks }) {
  const mountRef = useRef(null);
  const bendRef = useRef(bend);
  bendRef.current = bend;
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const L = 6, H = 1, D = 1.2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(4, 6, 5);
    scene.add(dirLight);

    // ---- 휘어진 보 ----
    // blocks가 있으면: 블록마다 높이 비율(H 안에서) · 폭 비율(D 안에서, 중앙정렬)을 반영한
    // 색깔 있는 슬라브를 아래에서부터 쌓아올림. 없으면: 예전처럼 균질한 단일 박스.
    const segs = 32;
    const layerMeshes = []; // { mesh, geo, edges, baseY }

    function buildLayers() {
      layerMeshes.forEach(({ mesh, geo, edges: e, mat: m }) => {
        scene.remove(mesh);
        geo.dispose();
        m.dispose();
        e.geometry.dispose();
        e.material.dispose();
      });
      layerMeshes.length = 0;

      const hasBlocks = Array.isArray(blocksRef.current) && blocksRef.current.length > 0;
      if (hasBlocks) {
        const bs = blocksRef.current;
        const totalH = bs.reduce((s, b) => s + b.height, 0) || 1;
        const maxW = Math.max(...bs.map((b) => b.width)) || 1;
        let cum = 0;
        bs.forEach((b) => {
          const hFrac = (b.height / totalH) * H;
          const dFrac = Math.max(0.06, (b.width / maxW) * D);
          const centerY = -H / 2 + cum + hFrac / 2;
          cum += hFrac;
          const c = blockColor(b);
          const geo = new THREE.BoxGeometry(L, hFrac, dFrac, segs, 1, 1);
          const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(c.stroke), roughness: 0.75, metalness: 0.05 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.y = centerY;
          scene.add(mesh);
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: GRAY }));
          mesh.add(edges);
          layerMeshes.push({ mesh, geo, mat, edges, baseY: centerY });
        });
      } else {
        const geo = new THREE.BoxGeometry(L, H, D, segs, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: BEAM_FILL, roughness: 0.85, metalness: 0.05 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0;
        scene.add(mesh);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: GRAY }));
        mesh.add(edges);
        layerMeshes.push({ mesh, geo, mat, edges, baseY: 0 });
      }
    }
    buildLayers();

    function applyBend() {
      // bend prop(-24~24px)은 2D 버전(SVG, y축이 아래로 증가)과 같은 스케일 — 양수(M>0, 새깅)는
      // 2D에서 가운데가 아래로 처지는 방향. Three.js는 y축이 위로 증가하므로 부호를 반대로 적용.
      const curveAmount = (bendRef.current / 24) * -0.55;
      layerMeshes.forEach(({ mesh, geo, edges, baseY }) => {
        const pos = geo.attributes.position;
        const basePos = geo.userData.basePosition || (geo.userData.basePosition = pos.array.slice());
        for (let i = 0; i < pos.count; i++) {
          const x = basePos[i * 3];
          const t = x / (L / 2); // -1..1
          const offset = curveAmount * (1 - t * t); // 중앙에서 최대, 양끝은 0인 포물선
          pos.array[i * 3 + 1] = basePos[i * 3 + 1] + offset;
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        edges.geometry.dispose();
        edges.geometry = new THREE.EdgesGeometry(geo, 20);
      });
    }
    applyBend();

    // ---- 모멘트 화살표(양끝, 서로 반대 방향으로 도는 원호) ----
    function momentArrow(xPos, ccw) {
      const group = new THREE.Group();
      const arcAngle = Math.PI * 1.5;
      const torusGeo = new THREE.TorusGeometry(0.85, 0.045, 8, 28, arcAngle);
      const torusMat = new THREE.MeshStandardMaterial({ color: GRAY, roughness: 0.6 });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.rotation.z = ccw ? Math.PI * 0.25 : Math.PI * 1.25;
      if (!ccw) torus.rotation.y = Math.PI; // 반대편은 뒤집어서 반대 방향 회전처럼 보이게
      group.add(torus);

      const coneGeo = new THREE.ConeGeometry(0.1, 0.24, 10);
      const cone = new THREE.Mesh(coneGeo, torusMat);
      const endAngle = ccw ? Math.PI * 0.25 : -Math.PI * 0.25;
      cone.position.set(0.85 * Math.cos(endAngle), 0.85 * Math.sin(endAngle), 0);
      cone.rotation.z = endAngle + (ccw ? Math.PI / 2 : -Math.PI / 2);
      group.add(cone);

      group.position.set(xPos, 0, 0);
      return group;
    }
    scene.add(momentArrow(-L / 2 - 0.15, true));
    scene.add(momentArrow(L / 2 + 0.15, false));

    // ---- 분석 단면 위치 ("여기를 잘랐다" 느낌을 주는 반투명 절단면 + 테두리) ----
    // 예전엔 보 내부를 관통하는 점선 하나였는데, 그 부분이 불투명한 보 표면에 가려서 거의 안 보였음.
    // 대신 보 단면보다 살짝 큰 반투명 평면 + 밝은 테두리를 x=0에 끼워서, 어느 각도에서 봐도
    // 보 표면 위/아래/앞/뒤로 살짝 튀어나온 "절단면 카드"가 또렷하게 보이도록 함.
    const cutW = H * 1.7, cutD = D * 1.7;
    const cutPlaneGeo = new THREE.PlaneGeometry(cutD, cutW);
    const cutPlaneMat = new THREE.MeshBasicMaterial({
      color: CRIMSON,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cutPlane = new THREE.Mesh(cutPlaneGeo, cutPlaneMat);
    cutPlane.rotation.y = Math.PI / 2;
    scene.add(cutPlane);

    const half = { w: cutW / 2, d: cutD / 2 };
    const outlinePts = [
      new THREE.Vector3(0, -half.w, -half.d),
      new THREE.Vector3(0, half.w, -half.d),
      new THREE.Vector3(0, half.w, half.d),
      new THREE.Vector3(0, -half.w, half.d),
    ];
    const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePts);
    const outline = new THREE.LineLoop(outlineGeo, new THREE.LineBasicMaterial({ color: CRIMSON, linewidth: 2 }));
    scene.add(outline);

    // ---- 카메라: 드래그로 회전, 안 건드리면 천천히 자동 회전 ----
    let theta = -0.55, phi = 1.15, radius = 8.5;
    let dragging = false, lastX = 0, lastY = 0, idleTimer = 0;

    function updateCamera() {
      camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      );
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
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
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
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let lastBlocksSig = JSON.stringify(blocksRef.current || null);
    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      const sig = JSON.stringify(blocksRef.current || null);
      if (sig !== lastBlocksSig) {
        lastBlocksSig = sig;
        buildLayers();
      }
      applyBend();
      if (!dragging) {
        idleTimer += 1;
        if (idleTimer > 60) theta += 0.0035; // 3초 정도 안 건드리면 천천히 자동 회전 시작
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
      layerMeshes.forEach(({ geo, mat, edges }) => {
        geo.dispose();
        mat.dispose();
        edges.geometry.dispose();
        edges.material.dispose();
      });
      cutPlaneGeo.dispose();
      cutPlaneMat.dispose();
      outlineGeo.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div>
      <div ref={mountRef} style={{ width: '100%', maxWidth: 520, height: 220, margin: '10px auto 0' }} />
      <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--gray-soft)', fontWeight: 700, marginTop: -4 }}>
        🖱️ 드래그해서 돌려보세요
      </div>
      <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--gray-soft)', marginTop: 2 }}>
        순수굽힘(pure bending) 가정 — M = {momentLabel}
      </div>
    </div>
  );
}
