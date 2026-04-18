/* Three.js Wireframe Globe — Hero section */
(function () {
  if (typeof THREE === 'undefined') return;

  const container = document.getElementById('hero-globe-container');
  if (!container) return;

  const W = container.clientWidth;
  const H = container.clientHeight;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // Scene & Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  camera.position.z = 2.8;

  // Globe wireframe
  const sphereGeo = new THREE.SphereGeometry(1, 24, 16);
  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x00FF41,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
  });
  const globe = new THREE.Mesh(sphereGeo, wireframeMat);
  scene.add(globe);

  // Outer shell — subtle
  const outerGeo = new THREE.SphereGeometry(1.02, 12, 8);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0x00F0FF,
    wireframe: true,
    transparent: true,
    opacity: 0.04,
  });
  scene.add(new THREE.Mesh(outerGeo, outerMat));

  // Lat/Lon grid lines
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00FF41, transparent: true, opacity: 0.35 });

  function latLine(lat) {
    const pts = [];
    const r = Math.cos((lat * Math.PI) / 180);
    const y = Math.sin((lat * Math.PI) / 180);
    for (let lon = 0; lon <= 360; lon += 5) {
      const rad = (lon * Math.PI) / 180;
      pts.push(new THREE.Vector3(r * Math.cos(rad), y, r * Math.sin(rad)));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
  }

  function lonLine(lon) {
    const pts = [];
    const rad = (lon * Math.PI) / 180;
    for (let lat = -90; lat <= 90; lat += 5) {
      const r = Math.cos((lat * Math.PI) / 180);
      const y = Math.sin((lat * Math.PI) / 180);
      pts.push(new THREE.Vector3(r * Math.cos(rad), y, r * Math.sin(rad)));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
  }

  const gridGroup = new THREE.Group();
  [-60, -30, 0, 30, 60].forEach(lat => gridGroup.add(latLine(lat)));
  [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].forEach(lon => gridGroup.add(lonLine(lon)));
  scene.add(gridGroup);

  // Location nodes
  const locations = [
    { lat: 12.9716, lon: 77.5946, label: 'BANGALORE', color: 0x00FF41 },
    { lat: 12.2958, lon: 76.6394, label: 'MYSORE', color: 0x00F0FF },
  ];

  function latLonToVec3(lat, lon, radius = 1.04) {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  const nodeGeo = new THREE.SphereGeometry(0.025, 8, 8);
  const nodes = locations.map(loc => {
    const mat = new THREE.MeshBasicMaterial({ color: loc.color });
    const node = new THREE.Mesh(nodeGeo, mat);
    const pos = latLonToVec3(loc.lat, loc.lon);
    node.position.copy(pos);
    scene.add(node);
    return { mesh: node, mat, color: loc.color, pos };
  });

  // Pulse rings
  const ringNodes = nodes.map(n => {
    const ringGeo = new THREE.RingGeometry(0.025, 0.05, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: n.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(n.pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(ring);
    return { mesh: ring, mat: ringMat, t: Math.random() * Math.PI * 2 };
  });

  // Pulse line between nodes
  const linePts = [latLonToVec3(12.9716, 77.5946, 1.05), latLonToVec3(12.2958, 76.6394, 1.05)];
  const connLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(linePts),
    new THREE.LineBasicMaterial({ color: 0x00FF41, transparent: true, opacity: 0.5 })
  );
  scene.add(connLine);

  // Mouse interaction
  let mouseX = 0, mouseY = 0;
  container.addEventListener('mousemove', e => {
    const rect = container.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  let autoRotY = 0;
  let clock = 0;

  function animate() {
    requestAnimationFrame(animate);
    clock += 0.016;
    autoRotY += 0.003;

    globe.rotation.y = autoRotY + mouseX * 0.3;
    globe.rotation.x = mouseY * 0.2;
    gridGroup.rotation.y = globe.rotation.y;
    gridGroup.rotation.x = globe.rotation.x;

    // Rotate nodes with globe
    nodes.forEach(n => {
      n.mesh.rotation.copy(globe.rotation);
    });

    // Pulse rings
    ringNodes.forEach(r => {
      r.t += 0.04;
      const s = 1 + Math.sin(r.t) * 0.5;
      r.mesh.scale.set(s, s, s);
      r.mat.opacity = 0.6 * (1 - Math.abs(Math.sin(r.t)));
    });

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    const W2 = container.clientWidth;
    const H2 = container.clientHeight;
    camera.aspect = W2 / H2;
    camera.updateProjectionMatrix();
    renderer.setSize(W2, H2);
  });
})();
