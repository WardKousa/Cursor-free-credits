import { useEffect, useRef } from "react";

/**
 * Neon glass-particle flow field, ported from neon-particle-flow.html into a
 * fixed, full-viewport React background. Instanced spheres, orange-dominant,
 * flowing left → right, cursor-reactive. Sits behind the whole app (z-index 0)
 * and is dimmed by a scrim so UI text always wins.
 *
 * Three.js r128 is loaded once from CDN (matches the reference exactly, so the
 * r128-era API — InstancedMesh.setColorAt, PMREMGenerator.fromEquirectangular —
 * behaves identically). Cursor tracking is global (window mousemove) so the
 * canvas can stay pointer-events:none and never swallow clicks meant for the UI.
 */

const THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

function loadThree(): Promise<any> {
  const w = window as any;
  if (w.THREE) return Promise.resolve(w.THREE);
  return new Promise((resolve, reject) => {
    let s = document.querySelector<HTMLScriptElement>("script[data-three-r128]");
    if (!s) {
      s = document.createElement("script");
      s.src = THREE_SRC;
      s.async = true;
      s.setAttribute("data-three-r128", "1");
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => resolve((window as any).THREE));
    s.addEventListener("error", () => reject(new Error("Failed to load three.js")));
    if (w.THREE) resolve(w.THREE);
  });
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    loadThree()
      .then((THREE) => {
        if (disposed || !canvas) return;

        // ---- Renderer / scene / camera ------------------------------------
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x040406, 1);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x040406, 0.022);

        const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
        camera.position.set(0, 0, 30);

        // ---- Environment map: dark with soft neon highlights --------------
        (function buildEnv() {
          const w = 512, h = 256, cv = document.createElement("canvas");
          cv.width = w; cv.height = h;
          const g = cv.getContext("2d")!;
          g.fillStyle = "#050507"; g.fillRect(0, 0, w, h);
          const blobs: [number, number, number, number][] = [
            [0.18, 0.30, 0xff7a1a, 0.9],
            [0.50, 0.22, 0xf2e4c4, 0.6],
            [0.78, 0.40, 0xe83ead, 0.7],
            [0.62, 0.70, 0x2f8bff, 0.6],
            [0.32, 0.66, 0x1ac99f, 0.5],
          ];
          blobs.forEach(([fx, fy, hex, a]) => {
            const x = fx * w, y = fy * h, rad = w * 0.22;
            const c = new THREE.Color(hex);
            const rg = g.createRadialGradient(x, y, 0, x, y, rad);
            rg.addColorStop(0, `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${a})`);
            rg.addColorStop(1, "rgba(0,0,0,0)");
            g.fillStyle = rg; g.fillRect(0, 0, w, h);
          });
          const tex = new THREE.CanvasTexture(cv);
          tex.mapping = THREE.EquirectangularReflectionMapping;
          const pmrem = new THREE.PMREMGenerator(renderer);
          pmrem.compileEquirectangularShader();
          scene.environment = pmrem.fromEquirectangular(tex).texture;
          tex.dispose();
          pmrem.dispose();
        })();

        // ---- Palette: orange dominant -------------------------------------
        const PALETTE = [
          0xff6a00, 0xff7a1a, 0xff5e00, 0xff8a2b, 0xff6a00, 0xff7414,
          0xff5e00, 0xffa24d, 0xff6a00, 0xf2e4c4, 0xe83ead, 0x2f8bff,
          0x1ac99f, 0xb266ff,
        ];

        // ---- Field setup ---------------------------------------------------
        const COUNT = reduce ? 2600 : 8200;
        const FIELD_W = 64, FIELD_H = 38, FIELD_D = 12;

        const geo = new THREE.SphereGeometry(1, 16, 16);
        const mat = new THREE.MeshPhysicalMaterial({
          roughness: 0.06, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.05,
          reflectivity: 0.5, ior: 1.45, envMapIntensity: 1.15,
        });
        const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(mesh);

        const base = new Float32Array(COUNT * 3);
        const off = new Float32Array(COUNT * 3);
        const vel = new Float32Array(COUNT * 3);
        const radius = new Float32Array(COUNT);
        const phase = new Float32Array(COUNT);
        const color = new THREE.Color();

        for (let i = 0; i < COUNT; i++) {
          base[i * 3] = (Math.random() - 0.5) * FIELD_W;
          base[i * 3 + 1] = (Math.random() - 0.5) * FIELD_H;
          base[i * 3 + 2] = (Math.random() - 0.5) * FIELD_D;
          radius[i] = 0.05 + Math.pow(Math.random(), 2.0) * 0.16;
          phase[i] = Math.random() * Math.PI * 2;
          color.setHex(PALETTE[(Math.random() * PALETTE.length) | 0]);
          mesh.setColorAt(i, color);
        }
        mesh.instanceColor.needsUpdate = true;

        // ---- Lights --------------------------------------------------------
        scene.add(new THREE.AmbientLight(0x161009, 0.8));
        const key = new THREE.PointLight(0xff7a1a, 0.85, 160); key.position.set(-18, 8, 26); scene.add(key);
        const rimA = new THREE.PointLight(0xe83ead, 0.6, 140); rimA.position.set(20, -10, 18); scene.add(rimA);
        const rimB = new THREE.PointLight(0x2f8bff, 0.5, 140); rimB.position.set(6, 16, -12); scene.add(rimB);

        // ---- Cursor (global, so UI stays clickable) -----------------------
        const ndc = new THREE.Vector2(2, 2);
        const ray = new THREE.Raycaster();
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const mouseWorld = new THREE.Vector3(9999, 9999, 0);
        const prevMouse = new THREE.Vector3(9999, 9999, 0);
        const mouseVelV = new THREE.Vector3();
        let pointerActive = false;
        let parallaxX = 0, parallaxY = 0;

        const onMove = (clientX: number, clientY: number) => {
          ndc.x = (clientX / window.innerWidth) * 2 - 1;
          ndc.y = -(clientY / window.innerHeight) * 2 + 1;
          parallaxX = ndc.x; parallaxY = ndc.y;
          pointerActive = true;
        };
        const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY);
        const tm = (e: TouchEvent) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); };
        const ml = () => { pointerActive = false; };
        window.addEventListener("mousemove", mm);
        window.addEventListener("touchmove", tm, { passive: true });
        window.addEventListener("mouseout", ml);

        // ---- Animation -----------------------------------------------------
        const dummy = new THREE.Object3D();
        const FLOW = reduce ? 0.8 : 5.5;
        const PUSH_R = 8.5, PUSH_STRENGTH = 60, DAMP = 0.86, SPRING = 0.055;
        const half = FIELD_W / 2;
        let last = performance.now();

        function step(now: number) {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;

          if (pointerActive) {
            ray.setFromCamera(ndc, camera);
            ray.ray.intersectPlane(plane, mouseWorld);
            mouseVelV.subVectors(mouseWorld, prevMouse);
            prevMouse.copy(mouseWorld);
          } else {
            mouseWorld.set(9999, 9999, 0);
            mouseVelV.set(0, 0, 0);
          }

          for (let i = 0; i < COUNT; i++) {
            const ix = i * 3, iy = ix + 1, iz = ix + 2;
            base[ix] += FLOW * dt;
            if (base[ix] > half) base[ix] -= FIELD_W;

            const px = base[ix] + off[ix];
            const py = base[iy] + off[iy];
            const dx = px - mouseWorld.x;
            const dy = py - mouseWorld.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < PUSH_R * PUSH_R) {
              const d = Math.sqrt(d2) || 0.0001;
              const f = 1 - d / PUSH_R;
              vel[ix] += (dx / d) * f * f * PUSH_STRENGTH * dt + mouseVelV.x * f * 0.6;
              vel[iy] += (dy / d) * f * f * PUSH_STRENGTH * dt + mouseVelV.y * f * 0.6;
              vel[iz] += (Math.random() - 0.5) * f * 8 * dt;
            }

            vel[ix] *= DAMP; vel[iy] *= DAMP; vel[iz] *= DAMP;
            off[ix] += vel[ix] * dt - off[ix] * SPRING;
            off[iy] += vel[iy] * dt - off[iy] * SPRING;
            off[iz] += vel[iz] * dt - off[iz] * SPRING;

            const bob = reduce ? 0 : Math.sin(now * 0.001 + phase[i]) * 0.12;
            dummy.position.set(base[ix] + off[ix], base[iy] + off[iy] + bob, base[iz] + off[iz]);
            const s = radius[i];
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;

          camera.position.x += (parallaxX * 3 - camera.position.x) * 0.04;
          camera.position.y += (parallaxY * 2 - camera.position.y) * 0.04;
          camera.lookAt(0, 0, 0);

          renderer.render(scene, camera);
          raf = requestAnimationFrame(step);
        }

        function resize() {
          const w = window.innerWidth, h = window.innerHeight;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        window.addEventListener("resize", resize);
        resize();
        raf = requestAnimationFrame(step);

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", resize);
          window.removeEventListener("mousemove", mm);
          window.removeEventListener("touchmove", tm);
          window.removeEventListener("mouseout", ml);
          geo.dispose();
          mat.dispose();
          renderer.dispose();
        };
      })
      .catch(() => {
        /* CDN blocked / WebGL unavailable — the app degrades to the flat bg. */
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, []);

  return (
    <div aria-hidden className="particle-field">
      <canvas ref={canvasRef} />
      <div className="particle-field__scrim" />
    </div>
  );
}
