// Het zwevende 3D-object op de index: connectors.stl in metaal.
// Het drijft vrij over de pagina, om het vierkant met beelden heen,
// en een klik erop opent de connectors-pagina.

// Gewoon script (geen module), zodat het ook werkt als je index.html direct vanuit de map opent.
(async () => {
const THREE = await import("three");
const { STLLoader } = await import("three/addons/loaders/STLLoader.js");
const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");

const MODEL = "images/connectors/connectors.stl";
const LINK = "connectors.html";
const SIZE = 220;    // grootte van het object op het scherm (px)
const SPEED = 1.6;   // drijfsnelheid (px per frame)

/* ---------- Element ---------- */
const box = document.createElement("a");
box.className = "object3d";
box.href = LINK;
box.setAttribute("aria-label", "connectors");
box.innerHTML = `<span class="object3d-label">connectors</span>`;
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
  clearcoatRoughness: 0.15
});

const pivot = new THREE.Group();
scene.add(pivot);

// Model laden: online via het bestand, direct vanuit de map via de kopie in connectors.stl.js
async function loadModel() {
  try {
    const res = await fetch(MODEL);
    if (!res.ok) throw new Error(res.status);
    return await res.arrayBuffer();
  } catch {
    await new Promise((ok, fail) => {
      const tag = document.createElement("script");
      tag.src = MODEL + ".js";
      tag.onload = ok;
      tag.onerror = fail;
      document.head.appendChild(tag);
    });
    return Uint8Array.from(atob(window.CONNECTOR_STL), ch => ch.charCodeAt(0)).buffer;
  }
}

loadModel().then(buf => {
  const geo = new STLLoader().parse(buf);
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const center = bb.getCenter(new THREE.Vector3());
  const size = bb.getSize(new THREE.Vector3());
  geo.translate(-center.x, -center.y, -center.z);
  const mesh = new THREE.Mesh(geo, metal);
  mesh.scale.setScalar(1.6 / Math.max(size.x, size.y, size.z)); // past in beeld
  pivot.add(mesh);
  box.classList.add("ready");
});

/* ---------- Beweging ---------- */
let x = innerWidth * 0.12, y = innerHeight * 0.65;
let vx = SPEED, vy = -SPEED * 0.7;
let hover = false;
box.addEventListener("pointerenter", () => (hover = true));
box.addEventListener("pointerleave", () => (hover = false));

const square = () => document.querySelector(".pop")?.getBoundingClientRect();

let last = performance.now();
function frame() {
  const now = performance.now();
  const dt = Math.min((now - last) / 16.67, 3);
  last = now;

  if (!hover) {
    // een beetje dwalen, zodat de baan nooit hetzelfde is
    vx += (Math.random() - 0.5) * 0.08 * dt;
    vy += (Math.random() - 0.5) * 0.08 * dt;
    const sp = Math.hypot(vx, vy) || 1;
    vx = (vx / sp) * SPEED;
    vy = (vy / sp) * SPEED;
    x += vx * dt;
    y += vy * dt;
  }

  // binnen het scherm blijven
  const W = document.documentElement.clientWidth, H = innerHeight;
  if (x < 0) { x = 0; vx = Math.abs(vx); }
  if (y < 0) { y = 0; vy = Math.abs(vy); }
  if (x > W - SIZE) { x = W - SIZE; vx = -Math.abs(vx); }
  if (y > H - SIZE) { y = H - SIZE; vy = -Math.abs(vy); }

  // om het vierkant heen: wordt weggeduwd zodra hij het raakt
  const r = square();
  if (r) {
    const m = 16;
    const cx = x + SIZE / 2, cy = y + SIZE / 2;
    const overlapX = Math.min(x + SIZE, r.right + m) - Math.max(x, r.left - m);
    const overlapY = Math.min(y + SIZE, r.bottom + m) - Math.max(y, r.top - m);
    if (overlapX > 0 && overlapY > 0) {
      const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      if (overlapX < overlapY) { x += cx < sx ? -overlapX : overlapX; vx = cx < sx ? -Math.abs(vx) : Math.abs(vx); }
      else { y += cy < sy ? -overlapY : overlapY; vy = cy < sy ? -Math.abs(vy) : Math.abs(vy); }
    }
  }

  box.style.transform = `translate(${x}px, ${y}px)`;

  // draaien: rustig, sneller als je erover beweegt
  const spin = (hover ? 0.035 : 0.008) * dt;
  pivot.rotation.y += spin;
  pivot.rotation.x += spin * 0.45;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
