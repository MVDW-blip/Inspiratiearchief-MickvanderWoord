// De zwevende 3D-objecten op de index, in metaal.
// Ze drijven vrij over de pagina, om het vierkant met beelden heen, botsen op elkaar,
// en een klik erop opent hun eigen pagina.
// Nieuw object? Voeg een regel toe aan OBJECTS onderaan (stl of obj).

// Gewoon script (geen module), zodat het ook werkt als je index.html direct vanuit de map opent.
(async () => {
const THREE = await import("three");
const { STLLoader } = await import("three/addons/loaders/STLLoader.js");
const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");

const SIZE = 220;    // grootte van een object op het scherm (px)
const SPEED = 1.6;   // drijfsnelheid (px per frame)

const OBJECTS = [
  { model: "images/connectors/connectors.stl", fallback: "images/connectors/connectors.stl.js",
    link: "connectors.html", label: "overige connecties", start: [0.12, 0.65] },
  { model: "images/24days/Asset 1.obj",
    link: "24days.html", label: "24 days challenge", start: [0.78, 0.7] },
];

// Model laden. Stl: online via het bestand, direct vanuit de map via de kopie in .stl.js
async function loadBuffer(o) {
  try {
    const res = await fetch(encodeURI(o.model));
    if (!res.ok) throw new Error(res.status);
    return await res.arrayBuffer();
  } catch (err) {
    if (!o.fallback) throw err;
    await new Promise((ok, fail) => {
      const tag = document.createElement("script");
      tag.src = o.fallback;
      tag.onload = ok;
      tag.onerror = fail;
      document.head.appendChild(tag);
    });
    return Uint8Array.from(atob(window.CONNECTOR_STL), ch => ch.charCodeAt(0)).buffer;
  }
}

// Van bestand naar een metalen object, gecentreerd en passend in beeld
async function loadModel(o, metal) {
  const buf = await loadBuffer(o);
  let obj;
  if (/\.obj$/i.test(o.model)) {
    obj = new OBJLoader().parse(new TextDecoder().decode(buf));
    obj.traverse(m => {
      if (!m.isMesh) return;
      if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals();
      m.material = metal; // eigen materialen (.mtl) worden genegeerd: alles in hetzelfde metaal
    });
  } else {
    obj = new THREE.Mesh(new STLLoader().parse(buf), metal);
  }
  const bb = new THREE.Box3().setFromObject(obj);
  const center = bb.getCenter(new THREE.Vector3());
  const size = bb.getSize(new THREE.Vector3());
  obj.position.sub(center);
  const holder = new THREE.Group();
  holder.add(obj);
  holder.scale.setScalar(1.6 / Math.max(size.x, size.y, size.z));
  return holder;
}

function makeFloater(o, i) {
  /* ---------- Element ---------- */
  const box = document.createElement("a");
  box.className = "object3d";
  box.href = o.link;
  box.setAttribute("aria-label", o.label);
  box.innerHTML = `<span class="object3d-label">${o.label}</span>`;
  document.body.appendChild(box);

  /* ---------- Scene ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(SIZE, SIZE);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMappingExposure = 0.85;
  box.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  // omgeving voor de reflecties: daar komt de metaalglans vandaan
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(0, 0, 3.2);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe6ff, 1.2); // koele rand van achteren
  rim.position.set(-3, -1, -2);
  scene.add(rim);

  const metal = new THREE.MeshPhysicalMaterial({
    color: 0xb4b9c2,     // koel zilver
    metalness: 1,
    roughness: 0.14,
    envMapIntensity: 1.3,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    side: THREE.DoubleSide
  });

  const pivot = new THREE.Group();
  scene.add(pivot);
  loadModel(o, metal).then(m => {
    pivot.add(m);
    box.classList.add("ready");
  }).catch(err => console.warn("3D-object niet geladen:", o.model, err));

  const f = {
    box, renderer, scene, camera, pivot, hover: false,
    x: innerWidth * o.start[0], y: innerHeight * o.start[1],
    vx: i % 2 ? -SPEED : SPEED, vy: -SPEED * 0.7,
  };
  box.addEventListener("pointerenter", () => (f.hover = true));
  box.addEventListener("pointerleave", () => (f.hover = false));
  return f;
}

const floaters = OBJECTS.map(makeFloater);

/* ---------- Beweging ---------- */
const square = () => document.querySelector(".pop")?.getBoundingClientRect();

function move(f, dt) {
  if (!f.hover) {
    // een beetje dwalen, zodat de baan nooit hetzelfde is
    f.vx += (Math.random() - 0.5) * 0.08 * dt;
    f.vy += (Math.random() - 0.5) * 0.08 * dt;
    const sp = Math.hypot(f.vx, f.vy) || 1;
    f.vx = (f.vx / sp) * SPEED;
    f.vy = (f.vy / sp) * SPEED;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
  }

  // binnen het scherm blijven
  const W = document.documentElement.clientWidth, H = innerHeight;
  if (f.x < 0) { f.x = 0; f.vx = Math.abs(f.vx); }
  if (f.y < 0) { f.y = 0; f.vy = Math.abs(f.vy); }
  if (f.x > W - SIZE) { f.x = W - SIZE; f.vx = -Math.abs(f.vx); }
  if (f.y > H - SIZE) { f.y = H - SIZE; f.vy = -Math.abs(f.vy); }

  // om het vierkant heen: wordt weggeduwd zodra hij het raakt
  const r = square();
  if (r) {
    const m = 16;
    const cx = f.x + SIZE / 2, cy = f.y + SIZE / 2;
    const overlapX = Math.min(f.x + SIZE, r.right + m) - Math.max(f.x, r.left - m);
    const overlapY = Math.min(f.y + SIZE, r.bottom + m) - Math.max(f.y, r.top - m);
    if (overlapX > 0 && overlapY > 0) {
      const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      if (overlapX < overlapY) { f.x += cx < sx ? -overlapX : overlapX; f.vx = cx < sx ? -Math.abs(f.vx) : Math.abs(f.vx); }
      else { f.y += cy < sy ? -overlapY : overlapY; f.vy = cy < sy ? -Math.abs(f.vy) : Math.abs(f.vy); }
    }
  }
}

// twee objecten die elkaar raken, botsen van elkaar af
function bump(a, b) {
  const dx = (b.x - a.x), dy = (b.y - a.y);
  const d = Math.hypot(dx, dy) || 0.01, min = SIZE * 0.7;
  if (d >= min) return;
  const nx = dx / d, ny = dy / d, push = (min - d) / 2;
  if (!a.hover) { a.x -= nx * push; a.y -= ny * push; }
  if (!b.hover) { b.x += nx * push; b.y += ny * push; }
  const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny;
  if (va - vb > 0) { // naar elkaar toe: snelheden langs de botsing ruilen
    a.vx += (vb - va) * nx; a.vy += (vb - va) * ny;
    b.vx += (va - vb) * nx; b.vy += (va - vb) * ny;
  }
}

let last = performance.now();
function frame() {
  const now = performance.now();
  const dt = Math.min((now - last) / 16.67, 3);
  last = now;

  floaters.forEach(f => move(f, dt));
  for (let i = 0; i < floaters.length; i++)
    for (let j = i + 1; j < floaters.length; j++) bump(floaters[i], floaters[j]);

  floaters.forEach(f => {
    f.box.style.transform = `translate(${f.x}px, ${f.y}px)`;
    // draaien: rustig, sneller als je erover beweegt
    const spin = (f.hover ? 0.035 : 0.008) * dt;
    f.pivot.rotation.y += spin;
    f.pivot.rotation.x += spin * 0.45;
    f.renderer.render(f.scene, f.camera);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
