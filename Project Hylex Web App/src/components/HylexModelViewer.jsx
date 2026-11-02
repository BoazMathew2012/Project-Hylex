import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Box from 'lucide-react/dist/esm/icons/box.mjs';
import Rotate3D from 'lucide-react/dist/esm/icons/rotate-3d.mjs';
import Maximize2 from 'lucide-react/dist/esm/icons/maximize-2.mjs';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw.mjs';
import Download from 'lucide-react/dist/esm/icons/download.mjs';
import Move3D from 'lucide-react/dist/esm/icons/move-3d.mjs';
import Droplets from 'lucide-react/dist/esm/icons/droplets.mjs';
import Cpu from 'lucide-react/dist/esm/icons/cpu.mjs';

const MODEL_URL = `${import.meta.env.BASE_URL}models/hylex-system.glb`;

export default function HylexModelViewer() {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeAngle, setActiveAngle] = useState('Orbit');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const setAngle = useCallback((angle) => {
    const current = sceneRef.current;
    if (!current) return;
    const { controls, camera, distance } = current;
    const positions = {
      Orbit: [1.7, 1.18, 2.2],
      Front: [0, 0.46, 2.7],
      Side: [2.7, 0.55, 0],
      Top: [0, 2.8, 0.12],
    };
    const [x, y, z] = positions[angle] || positions.Orbit;
    camera.position.set(x * distance, y * distance, z * distance);
    controls.target.set(0, 0, 0);
    controls.update();
    setActiveAngle(angle);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let renderer;
    let controls;
    let frame;
    let observer;
    let disposed = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1321');
    scene.fog = new THREE.Fog('#0b1321', 6, 13);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
    camera.position.set(2.4, 1.55, 3.1);

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);
    } catch {
      setStatus('unsupported');
      return undefined;
    }

    const hemi = new THREE.HemisphereLight(0xb9e7ef, 0x101827, 2.15);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff5e8, 3.2);
    key.position.set(3.5, 5, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x60d8e9, 2.1);
    fill.position.set(-4, 2.5, -2);
    scene.add(fill);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.32;
    controls.minDistance = 0.8;
    controls.maxDistance = 7;
    controls.maxPolarAngle = Math.PI * 0.49;

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    new GLTFLoader().load(MODEL_URL, (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z) || 1;
      const modelScale = 2.05 / maxDimension;
      model.position.copy(center).multiplyScalar(-modelScale);
      model.scale.setScalar(modelScale);
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        if (object.material) {
          const mats = Array.isArray(object.material) ? object.material : [object.material];
          mats.forEach((material) => {
            if (material.transparent && material.opacity < 1) material.depthWrite = false;
          });
        }
      });
      scene.add(model);
      const fittedBounds = new THREE.Box3().setFromObject(model);
      const fittedSize = fittedBounds.getSize(new THREE.Vector3());
      const floorY = fittedBounds.min.y - 0.018;
      const stageRadius = Math.max(fittedSize.x, fittedSize.z, 0.72) * 0.52;
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(stageRadius, 96),
        new THREE.MeshStandardMaterial({ color: '#080d17', roughness: 0.94, metalness: 0.02 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = floorY;
      ground.receiveShadow = true;
      scene.add(ground);
      const distance = 2.05;
      sceneRef.current = { controls, camera, distance };
      camera.position.set(distance * 1.7, distance * 1.18, distance * 2.2);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
      setStatus('ready');
    }, undefined, () => {
      if (!disposed) setStatus('error');
    });

    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => material.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const current = sceneRef.current;
    if (current) current.controls.autoRotate = autoRotate;
  }, [autoRotate, status]);

  const toggleFullscreen = async () => {
    const host = hostRef.current?.closest('.hylex-model-stage');
    if (!host) return;
    try {
      if (!document.fullscreenElement) await host.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const update = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  return (
    <section className="hylex-model-page animate-rise-in" aria-label="Interactive Hylex project model">
      <div className="hylex-model-intro">
        <div>
          <div className="hylex-eyebrow flex items-center gap-2"><span className="hylex-eyebrow-dot" /> BUILT FOR CIRCULAR WATER</div>
          <h2>Hylex, from every angle.</h2>
          <p>Explore the complete treatment prototype in an interactive 3D view.</p>
        </div>
        <a className="hylex-model-download" href={MODEL_URL} download="hylex-system.glb">
          <Download size={14} /> Download model
        </a>
      </div>

      <div className="hylex-model-layout">
        <aside className="hylex-model-details">
          <div className="hylex-model-detail-label">SYSTEM AT A GLANCE</div>
          <p className="hylex-model-detail-copy">A compact treatment line that turns salty feedwater into a monitored, reusable output.</p>
          <div className="hylex-model-feature">
            <span className="hylex-model-feature-icon"><Droplets size={16} /></span>
            <div><strong>Electro-coagulation</strong><span>Mineral capture &amp; separation</span></div>
          </div>
          <div className="hylex-model-feature">
            <span className="hylex-model-feature-icon"><Rotate3D size={16} /></span>
            <div><strong>Vortex polishing</strong><span>Helix-driven final treatment</span></div>
          </div>
          <div className="hylex-model-feature">
            <span className="hylex-model-feature-icon"><Cpu size={16} /></span>
            <div><strong>Edge-AI controller</strong><span>Live sensing &amp; process control</span></div>
          </div>
          <div className="hylex-model-instruction"><Move3D size={15} /><span>Drag to orbit · scroll to zoom</span></div>
          <div className="hylex-model-ready"><span className={`hylex-model-ready-dot ${status === 'ready' ? 'is-ready' : ''}`} />{status === 'ready' ? 'Interactive model ready' : status === 'loading' ? 'Loading 3D model…' : status === 'unsupported' ? '3D is unavailable in this browser' : 'Model could not be loaded'}</div>
        </aside>

        <div className={`hylex-model-stage ${isFullscreen ? 'is-fullscreen' : ''}`}>
          <div className="hylex-model-stage-topline"><span><span className="hylex-model-stage-dot" /> HYLEX / COMPLETE SYSTEM</span><span>3D PRESENTATION</span></div>
          <div ref={hostRef} className="hylex-model-canvas" role="img" aria-label="Interactive three-dimensional model of the Hylex water treatment prototype" />
          {status !== 'ready' && <div className="hylex-model-loading"><Box size={20} />{status === 'loading' ? 'Preparing model view' : status === 'unsupported' ? 'Enable WebGL to view the model' : 'Please refresh to try the model again'}</div>}
          <div className="hylex-model-toolbar">
            <div className="hylex-model-angles" role="group" aria-label="Model view angle">
              {['Orbit', 'Front', 'Side', 'Top'].map((angle) => (
                <button key={angle} type="button" onClick={() => setAngle(angle)} className={activeAngle === angle ? 'is-active' : ''}>{angle}</button>
              ))}
            </div>
            <div className="hylex-model-actions">
              <button type="button" onClick={() => setAutoRotate((value) => !value)} className={autoRotate ? 'is-active' : ''} aria-label={autoRotate ? 'Pause auto-rotation' : 'Resume auto-rotation'} title={autoRotate ? 'Pause rotation' : 'Resume rotation'}><Rotate3D size={15} /></button>
              <button type="button" onClick={() => setAngle('Orbit')} aria-label="Reset model view" title="Reset view"><RotateCcw size={15} /></button>
              <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit full screen' : 'View full screen'} title="Full screen"><Maximize2 size={15} /></button>
            </div>
          </div>
          <div className="hylex-model-scale">FULL SYSTEM · INTERACTIVE 3D</div>
        </div>
      </div>
    </section>
  );
}
