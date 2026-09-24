'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/*
  압력용기 껍데기가 내부 압력과 "어떻게 버티고 있는가"를 보여주는 3D.

  - 껍데기는 반투명이라 안쪽이 비쳐 보인다. 안에서 밖으로 뻗는 화살표가 내부 압력이고,
    껍데기 위에 놓인 화살표가 그 압력을 붙잡고 있는 벽면의 응력이다.
  - 껍데기 한 곳을 네모나게 떠서(노란 테두리) 강조해 둔다. 그 조각을 크게 확대해서
    옆에 2D로 그려주는 일은 부르는 쪽(SVG)이 하고, 여기서는 "어디를 떴는지"만 보여준다.

  shape: 'sphere' | 'cylinder'
    - sphere  : 어느 방향으로 잘라도 같은 응력이라, 조각 위 화살표가 사방으로 똑같다.
    - cylinder: 둘레 방향(hoop)이 길이 방향의 두 배라, 화살표 길이가 눈에 띄게 다르다.
      이 차이가 두 페이지를 갈라놓는 개념이므로 그림에서 바로 읽히게 했다.

  hoopRatio / axialRatio 는 두 방향 응력의 상대 크기(0~1)로, 조각 위 화살표 길이에 쓴다.
*/

const SHELL = 0x7fa8c9;
const PRESSURE = 0xc3002f;
const STRESS = 0x1e7f72;
const PATCH = 0xb0790a;

export default function VesselShell3D({ shape = 'sphere', hoopRatio = 1, axialRatio = 1 }) {
  const mountRef = useRef(null);
  const propsRef = useRef({ shape, hoopRatio, axialRatio });
  const rebuildRef = useRef(null);
  propsRef.current = { shape, hoopRatio, axialRatio };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 0.55);
    dl.position.set(4, 6, 5);
    scene.add(dl);

    const R = 1.6;
    let group = null;

    function clear() {
      if (!group) return;
      scene.remove(group);
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose && o.material.dispose();
      });
      group = null;
    }

    function arrow(from, to, color, thickness = 0.022, headLen = 0.16) {
      const g = new THREE.Group();
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      if (len < 1e-6) return g;
      dir.normalize();
      const mat = new THREE.MeshBasicMaterial({ color });
      const shaftLen = Math.max(0.01, len - headLen);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, shaftLen, 7), mat);
      shaft.position.copy(from).addScaledVector(dir, shaftLen / 2);
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.add(shaft);
      const head = new THREE.Mesh(new THREE.ConeGeometry(thickness * 2.6, headLen, 10), mat);
      head.position.copy(from).addScaledVector(dir, len - headLen / 2);
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.add(head);
      return g;
    }

    function build() {
      const p = propsRef.current;
      clear();
      group = new THREE.Group();
      scene.add(group);

      const shellMat = new THREE.MeshStandardMaterial({
        color: SHELL,
        transparent: true,
        opacity: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      // ---- 껍데기 ----
      let patchPos, patchNormal, patchUp;
      if (p.shape === 'sphere') {
        group.add(new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), shellMat));
        const wire = new THREE.LineSegments(
          new THREE.WireframeGeometry(new THREE.SphereGeometry(R, 16, 10)),
          new THREE.LineBasicMaterial({ color: SHELL, transparent: true, opacity: 0.35 })
        );
        group.add(wire);
        // 조각은 살짝 위·앞쪽에서 뜬다 (카메라에서 잘 보이는 자리)
        patchNormal = new THREE.Vector3(0.45, 0.5, 0.74).normalize();
        patchPos = patchNormal.clone().multiplyScalar(R);
        patchUp = new THREE.Vector3(0, 1, 0);
      } else {
        const H = 2.6;
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 40, 1, true), shellMat);
        cyl.rotation.z = Math.PI / 2; // 길이 방향을 x축으로
        group.add(cyl);
        [-H / 2, H / 2].forEach((x) => {
          const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 36), shellMat);
          cap.rotation.y = Math.PI / 2;
          cap.position.x = x;
          group.add(cap);
        });
        const wire = new THREE.LineSegments(
          new THREE.WireframeGeometry(new THREE.CylinderGeometry(R, R, H, 18, 3, true)),
          new THREE.LineBasicMaterial({ color: SHELL, transparent: true, opacity: 0.35 })
        );
        wire.rotation.z = Math.PI / 2;
        group.add(wire);
        patchNormal = new THREE.Vector3(0, 0.55, 0.83).normalize();
        patchPos = new THREE.Vector3(0, patchNormal.y * R, patchNormal.z * R);
        patchUp = new THREE.Vector3(1, 0, 0); // 조각의 "가로"를 길이 방향으로 잡는다
      }

      // ---- 내부 압력: 중심에서 껍데기 쪽으로 뻗는 화살표 ----
      const dirs = [];
      const N = 12;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        dirs.push(new THREE.Vector3(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0.2).normalize());
        dirs.push(new THREE.Vector3(Math.cos(a) * 0.5, Math.sin(a) * 0.5, -0.8).normalize());
      }
      dirs.forEach((d) => {
        const from = d.clone().multiplyScalar(R * 0.25);
        const to = d.clone().multiplyScalar(R * 0.88);
        group.add(arrow(from, to, PRESSURE, 0.013, 0.1));
      });

      // ---- 떠낸 조각 ----
      const patchSize = 0.44;
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), patchNormal);
      const patch = new THREE.Mesh(
        new THREE.PlaneGeometry(patchSize, patchSize),
        new THREE.MeshBasicMaterial({ color: PATCH, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthTest: false })
      );
      patch.position.copy(patchPos).addScaledVector(patchNormal, 0.012);
      patch.quaternion.copy(quat);
      group.add(patch);
      const border = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-patchSize / 2, -patchSize / 2, 0),
          new THREE.Vector3(patchSize / 2, -patchSize / 2, 0),
          new THREE.Vector3(patchSize / 2, patchSize / 2, 0),
          new THREE.Vector3(-patchSize / 2, patchSize / 2, 0),
        ]),
        new THREE.LineBasicMaterial({ color: PATCH, depthTest: false })
      );
      border.position.copy(patch.position);
      border.quaternion.copy(quat);
      group.add(border);

      // ---- 조각 위의 벽면 응력 화살표 ----
      // 껍데기 접선 방향 두 개를 잡아 각각 양쪽으로 당기는 화살표를 그린다.
      const tanA = new THREE.Vector3().crossVectors(patchNormal, patchUp).normalize();
      const tanB = new THREE.Vector3().crossVectors(patchNormal, tanA).normalize();
      const base = patchPos.clone().addScaledVector(patchNormal, 0.02);
      const lenA = 0.28 + 0.42 * (p.shape === 'sphere' ? 1 : p.axialRatio);
      const lenB = 0.28 + 0.42 * (p.shape === 'sphere' ? 1 : p.hoopRatio);
      [1, -1].forEach((sgn) => {
        group.add(arrow(base.clone().addScaledVector(tanA, sgn * patchSize * 0.5), base.clone().addScaledVector(tanA, sgn * (patchSize * 0.5 + lenA)), STRESS, 0.02, 0.13));
        group.add(arrow(base.clone().addScaledVector(tanB, sgn * patchSize * 0.5), base.clone().addScaledVector(tanB, sgn * (patchSize * 0.5 + lenB)), STRESS, 0.02, 0.13));
      });
    }
    rebuildRef.current = build;
    build();

    let theta = 0.6, phi = 1.15, radius = 6.2;
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
      const w = mount.clientWidth || 380;
      const h = Math.round(w * 0.72);
      // setSize(..., false)는 CSS 크기를 안 건드려서, devicePixelRatio>1인 화면(대부분의 폰)에서
      // 캔버스가 드로잉 버퍼 크기(= CSS 크기 × pixelRatio, 여기선 최대 2배)로 렌더링되며 부모
      // 폭을 넘어 가로 스크롤을 만든다 — 모바일 폭에서 실측으로 발견한 버그. CSS 크기를 직접 맞춘다.
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + 'px';
      renderer.domElement.style.height = h + 'px';
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
    propsRef.current = { shape, hoopRatio, axialRatio };
    if (rebuildRef.current) rebuildRef.current();
  }, [shape, hoopRatio, axialRatio]);

  return <div ref={mountRef} style={{ width: '100%', maxWidth: 420, margin: '0 auto' }} />;
}
