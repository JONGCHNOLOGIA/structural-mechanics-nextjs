'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/*
  "평면응력인데 왜 z방향으로도 변형되는가"를 보여주기 위한 얇은 판 3D.

  평면응력은 σz = 0이라는 뜻이지 εz = 0이라는 뜻이 아니다. σx·σy가 옆으로 당기거나 미는 만큼
  판은 두께 방향으로도 줄거나 늘어난다 — εz = −(ν/E)(σx+σy). XY 방향으로만 힘을 줬는데
  두께가 얇아지는 걸 눈으로 보면 이 구분이 훨씬 빨리 붙는다.

  회색 반투명 = 변형 전, 색 있는 판 = 변형 후. 두께 변화는 가로·세로보다 훨씬 작아서
  같은 배수로 부풀리면 보이지 않으므로, 두께만 따로 더 크게 부풀려 그리고 그 사실을 화면에 적는다.
  (숫자 자체는 왼쪽 그림의 표에 실제값으로 나와 있다)

  BeamElevation3D / InclinedLoads3D와 같은 방식 — 드래그로 돌리고, 가만히 두면 천천히 자동 회전.
*/

const INK = 0x51626f;
const CRIMSON = 0xc3002f;
const TEAL = 0x1e7f72;

// 가로·세로는 이 정도 비율까지 움직이면 충분히 보인다
const XY_MAX_VISUAL = 0.45;
// 두께는 원래 얇아서, 같은 배수로는 변화가 안 보인다 — 따로 더 크게 부풀린다
const Z_MAX_VISUAL = 0.7;

export default function PlateDeform3D({ ex, ey, ez, gxy }) {
  const mountRef = useRef(null);
  const propsRef = useRef({ ex, ey, ez, gxy });
  propsRef.current = { ex, ey, ez, gxy };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.65);
    dl.position.set(4, 6, 5);
    scene.add(dl);

    // 변형 전 판 — 가로 2, 세로 2, 두께 0.22 (얇은 판)
    const W = 2, H = 2, T = 0.22;

    const ghostGeo = new THREE.BoxGeometry(W, T, H);
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x9aa4ad,
      transparent: true,
      opacity: 0.18,
      roughness: 0.9,
      depthWrite: false,
    });
    const ghost = new THREE.Mesh(ghostGeo, ghostMat);
    scene.add(ghost);
    const ghostEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(ghostGeo),
      new THREE.LineDashedMaterial({ color: 0x8a97a2, dashSize: 0.08, gapSize: 0.06 })
    );
    ghostEdges.computeLineDistances();
    ghost.add(ghostEdges);

    const plateGeo = new THREE.BoxGeometry(W, T, H);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.8, metalness: 0.05 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    scene.add(plate);
    const plateEdges = new THREE.LineSegments(new THREE.EdgesGeometry(plateGeo), new THREE.LineBasicMaterial({ color: INK }));
    plate.add(plateEdges);

    // 두께 방향을 가리키는 화살표 한 쌍 — 판이 얇아지면 안쪽을, 두꺼워지면 바깥쪽을 가리킨다
    function thicknessArrow(sign) {
      const g = new THREE.Group();
      const shaftGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8);
      const mat = new THREE.MeshBasicMaterial({ color: sign > 0 ? TEAL : CRIMSON });
      const shaft = new THREE.Mesh(shaftGeo, mat);
      g.add(shaft);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 10), mat);
      cone.position.y = -0.24 * sign;
      cone.rotation.x = sign > 0 ? Math.PI : 0;
      g.add(cone);
      return g;
    }
    const arrowTop = thicknessArrow(1);
    const arrowBottom = thicknessArrow(-1);
    scene.add(arrowTop, arrowBottom);

    function applyStrain() {
      const p = propsRef.current;
      // 가로·세로 중 큰 쪽이 XY_MAX_VISUAL 만큼 움직이도록 공통 배수를 잡는다
      const maxXY = Math.max(Math.abs(p.ex), Math.abs(p.ey), Math.abs(p.gxy), 1e-12);
      const gainXY = XY_MAX_VISUAL / maxXY;
      // 두께는 따로 — εz만 기준으로 부풀린다
      const gainZ = Z_MAX_VISUAL / Math.max(Math.abs(p.ez), 1e-12);

      const sx = 1 + p.ex * gainXY;
      const sz = 1 + p.ey * gainXY; // 화면의 깊이축(z)이 판의 y방향
      const sy = 1 + p.ez * gainZ; // 화면의 높이축(y)이 판의 두께

      plate.scale.set(Math.max(0.05, sx), Math.max(0.05, sy), Math.max(0.05, sz));
      // 전단은 판을 한쪽으로 미는 것 — 두께 방향을 축으로 비트는 게 아니라 xz 평면 안에서 기울인다
      plate.rotation.y = -p.gxy * gainXY * 0.5;

      // 색: 두꺼워지면 인장(청록), 얇아지면 압축(크림슨) 쪽으로 물들인다
      const t = Math.min(1, Math.abs(p.ez) / Math.max(Math.abs(p.ez), 1e-12));
      const base = new THREE.Color(p.ez >= 0 ? TEAL : CRIMSON);
      plateMat.color.copy(new THREE.Color(0xf2f0ea).lerp(base, 0.45 * t));

      const half = (T / 2) * plate.scale.y;
      arrowTop.position.set(0, half + 0.3, 0);
      arrowBottom.position.set(0, -half - 0.3, 0);
      const inward = p.ez < 0;
      arrowTop.rotation.z = inward ? Math.PI : 0;
      arrowBottom.rotation.z = inward ? Math.PI : 0;
    }
    applyStrain();

    let theta = 0.75, phi = 1.05, radius = 6.4;
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
      const wpx = mount.clientWidth || 400;
      const hpx = Math.round(wpx * 0.58);
      renderer.setSize(wpx, hpx, false);
      camera.aspect = wpx / hpx;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      applyStrain();
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
      [ghostGeo, plateGeo].forEach((g) => g.dispose());
      [ghostMat, plateMat].forEach((m) => m.dispose());
      ghostEdges.geometry.dispose();
      ghostEdges.material.dispose();
      plateEdges.geometry.dispose();
      plateEdges.material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div>
      <div ref={mountRef} style={{ width: '100%', maxWidth: 520, margin: '0 auto' }} />
      <p style={{ fontSize: 10.5, color: 'var(--gray-soft)', textAlign: 'center', marginTop: 6, lineHeight: 1.6 }}>
        회색 점선 = 변형 전 · 드래그하면 돌려볼 수 있어요.
        <br />
        두께 변화(εz)는 가로·세로보다 훨씬 작아서, 보이도록 두께만 따로 더 크게 부풀려 그렸습니다.
      </p>
    </div>
  );
}
