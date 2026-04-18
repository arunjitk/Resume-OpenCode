/* Three.js Skills Tag Cloud Sphere */
(function () {
  if (typeof THREE === 'undefined') return;

  const container = document.getElementById('skills-sphere-container');
  if (!container) return;

  const SKILLS = [
    { name: 'Threat Hunting', cat: 'core' },
    { name: 'Log Analysis', cat: 'core' },
    { name: 'OSINT', cat: 'core' },
    { name: 'Incident Response', cat: 'core' },
    { name: 'Digital Forensics', cat: 'core' },
    { name: 'Packet Inspection', cat: 'core' },
    { name: 'Network Security', cat: 'core' },
    { name: 'Cloud Security', cat: 'core' },
    { name: 'Vulnerability Assessment', cat: 'core' },
    { name: 'Email Security', cat: 'core' },
    { name: 'Fraud Investigation', cat: 'core' },
    { name: 'CrowdStrike Falcon', cat: 'siem' },
    { name: 'Trellix Helix', cat: 'siem' },
    { name: 'SumoLogic', cat: 'siem' },
    { name: 'ELK Stack', cat: 'siem' },
    { name: 'QRadar', cat: 'siem' },
    { name: 'OSSIM', cat: 'siem' },
    { name: 'SecureWorks Taegis', cat: 'siem' },
    { name: 'AWS', cat: 'cloud' },
    { name: 'Azure', cat: 'cloud' },
    { name: 'GCP', cat: 'cloud' },
    { name: 'AWS GuardDuty', cat: 'cloud' },
    { name: 'Azure Defender', cat: 'cloud' },
    { name: 'Wiz', cat: 'cloud' },
    { name: 'PaloAlto SaaS', cat: 'cloud' },
    { name: 'SentinelOne EDR', cat: 'edr' },
    { name: 'Cortex XDR', cat: 'edr' },
    { name: 'Trellix EDR', cat: 'edr' },
    { name: 'Trellix ePO', cat: 'edr' },
    { name: 'FireEye DoD', cat: 'edr' },
    { name: 'Swimlane', cat: 'soar' },
    { name: 'Incident.io', cat: 'soar' },
    { name: 'DFIR-IRIS', cat: 'soar' },
    { name: 'Python', cat: 'programming' },
    { name: 'C#', cat: 'programming' },
    { name: 'C++', cat: 'programming' },
    { name: 'Java', cat: 'programming' },
    { name: 'Docker', cat: 'devops' },
    { name: 'GitLab', cat: 'devops' },
    { name: 'ServiceNow', cat: 'devops' },
    { name: 'Wireshark', cat: 'tools' },
    { name: 'Nmap', cat: 'tools' },
    { name: 'Tenable/Nessus', cat: 'tools' },
    { name: 'ChatGPT', cat: 'ai' },
    { name: 'Claude', cat: 'ai' },
    { name: 'DeepSeek', cat: 'ai' },
  ];

  const CAT_COLORS = {
    core: 0x00FF41,
    siem: 0x00FF41,
    cloud: 0x00F0FF,
    edr: 0xFF1744,
    soar: 0xFF00FF,
    programming: 0xFF00FF,
    devops: 0x00F0FF,
    tools: 0xC8E6C9,
    ai: 0x00FF41,
  };

  const W = container.clientWidth;
  const H = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: document.getElementById('skills-sphere-canvas') });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  camera.position.z = 4;

  // Distribute points on sphere using Fibonacci
  const RADIUS = 1.8;
  function fibSphere(n, r) {
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const theta = golden * i;
      pts.push(new THREE.Vector3(r * rad * Math.cos(theta), r * y, r * rad * Math.sin(theta)));
    }
    return pts;
  }

  const positions = fibSphere(SKILLS.length, RADIUS);

  // Create sprite labels using canvas textures
  function makeSprite(skill) {
    const cvs = document.createElement('canvas');
    cvs.width = 256; cvs.height = 64;
    const c = cvs.getContext('2d');
    const color = '#' + CAT_COLORS[skill.cat].toString(16).padStart(6, '0');
    c.clearRect(0, 0, 256, 64);
    c.font = 'bold 22px "Share Tech Mono", monospace';
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = color;
    c.shadowBlur = 10;
    c.fillText(skill.name, 128, 32);

    const tex = new THREE.CanvasTexture(cvs);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.2, 0.3, 1);
    sprite.userData = { skill, mat, baseMat: mat, canvas: cvs, ctx: c, color };
    return sprite;
  }

  const group = new THREE.Group();
  const sprites = SKILLS.map((skill, i) => {
    const sprite = makeSprite(skill);
    sprite.position.copy(positions[i]);
    group.add(sprite);
    return sprite;
  });
  scene.add(group);

  // Drag rotation
  let isDragging = false, lastX = 0, lastY = 0;
  let velX = 0, velY = 0;
  let autoRotate = true;

  renderer.domElement.addEventListener('mousedown', e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; autoRotate = false; });
  window.addEventListener('mouseup', () => { isDragging = false; setTimeout(() => autoRotate = true, 2000); });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    velX = (e.clientX - lastX) * 0.005;
    velY = (e.clientY - lastY) * 0.005;
    group.rotation.y += velX;
    group.rotation.x += velY;
    lastX = e.clientX; lastY = e.clientY;
  });

  // Touch
  renderer.domElement.addEventListener('touchstart', e => {
    isDragging = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    autoRotate = false;
  });
  window.addEventListener('touchend', () => { isDragging = false; setTimeout(() => autoRotate = true, 2000); });
  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    velX = (e.touches[0].clientX - lastX) * 0.005;
    velY = (e.touches[0].clientY - lastY) * 0.005;
    group.rotation.y += velX;
    group.rotation.x += velY;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  });

  // Active filter
  let activeFilter = 'all';
  window.setSkillFilter = function (cat) {
    activeFilter = cat;
    sprites.forEach(s => {
      if (cat === 'all' || s.userData.skill.cat === cat) {
        s.userData.mat.opacity = 0.85;
      } else {
        s.userData.mat.opacity = 0.06;
      }
    });
  };

  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate && !isDragging) {
      group.rotation.y += 0.003;
      group.rotation.x += 0.0008;
    }
    velX *= 0.95; velY *= 0.95;

    // Billboarding — sprites always face camera
    sprites.forEach(sprite => {
      sprite.lookAt(camera.position);
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
