// Bouwt de index en de archiefpagina op basis van data.js,
// plus bewerken, slepen, lightbox en de Shuffle-knop (alles gaat zweven).

const all = window.COLLECTIONS || [];
const current = document.body.dataset.page; // "index", "themas", "connectors", "24days", "presearch" of "alles"
const pad = (n, l = 2) => String(n).padStart(l, "0");
const src = (c, f) => encodeURI(c.folder + "/" + f);
const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
// pdf en illustrator (.ai, pdf-compatibel): bladeren door de pagina's
const isPdf = f => /\.(pdf|ai)$/i.test(f);
// pdf's: elke pagina staat als beeld in de map "pages" (naam-1.jpg, naam-2.jpg, ...); het aantal staat in data.js bij "pages"
const pageCount = (c, f) => (c.pages && c.pages[f]) || 1;
const pageSrc = (c, f, n) => encodeURI(c.folder + "/pages/" + f.replace(/\.(pdf|ai)$/i, "") + "-" + n + ".jpg");
// wat er in het raster te zien is: bij een pdf de eerste pagina
const view = (c, f) => isPdf(f) ? pageSrc(c, f, 1) : src(c, f);
const pdfLink = (c, f) => /\.pdf$/i.test(f) ? ` <a class="pdf-link" href="${src(c, f)}" target="_blank" rel="noopener">pdf ↗</a>` : "";
const isVideo = f => /\.(mp4|webm|mov)$/i.test(f);
// echte breedte/hoogte van een beeld of video
const natW = el => el.naturalWidth || el.videoWidth || 0;
const natH = el => el.naturalHeight || el.videoHeight || 0;
const domain = url => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/* ---------- Eigen bewerkingen (opgeslagen in deze browser) ---------- */
const EDIT_KEY = "inspiratiearchief-edits";
// De Edit-knop is van de site gehaald: oude bewerkingen uit de browser worden niet meer toegepast,
// zodat iedereen precies de teksten uit data.js ziet.
const edits = {};

// Pas opgeslagen bewerkingen toe op de data. Sleutels: "slug.title", "slug.text", "slug.link.0"
all.forEach(c => {
  if (edits[c.slug + ".title"] != null) c.title = edits[c.slug + ".title"];
  if (edits[c.slug + ".text"] != null) c.text = edits[c.slug + ".text"];
  if (edits[c.slug + ".question"] != null) c.question = edits[c.slug + ".question"];
  (c.links || []).forEach((l, i) => {
    if (edits[`${c.slug}.link.${i}`] != null) l.title = edits[`${c.slug}.link.${i}`];
  });
});

function saveEdit(key, value, apply) {
  edits[key] = value;
  localStorage.setItem(EDIT_KEY, JSON.stringify(edits));
  apply(value);
  updateDownload();
}

// Maakt een element bewerkbaar zodra de Edit-stand aan staat
function editable(el, key, apply) {
  el.dataset.edit = key;
  el.addEventListener("blur", () => {
    const v = el.textContent.trim();
    saveEdit(key, v, apply);
  });
  el.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.blur(); }
  });
}

function setEditMode(on) {
  document.body.classList.toggle("editing", on);
  document.querySelectorAll("[data-edit]").forEach(el => (el.contentEditable = on ? "plaintext-only" : "false"));
  editBtn.querySelector("span").textContent = on ? "Klaar" : "Edit";
  editBtn.setAttribute("aria-pressed", on);
  updateDownload();
}

function updateDownload() {
  if (!downloadBtn) return;
  downloadBtn.disabled = !Object.keys(edits).length;
}

function downloadData() {
  const head = `// Alle inhoud van het archief.
// - title / text / links[].title kun je hier aanpassen, of op de site via de knop "Edit"
//   (daarna "Save" en vervang dit bestand door de download).
// - Nieuwe afbeelding? Zet hem in de map ("folder") en voeg de bestandsnaam toe aan "images".
// - Nieuwe link? Voeg { title, url, image } toe aan "links" (image mag leeg blijven).

window.COLLECTIONS = `;
  const blob = new Blob([head + JSON.stringify(all, null, 2) + ";\n"], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.js";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- Hoek + werkbalk ---------- */
let editBtn, downloadBtn;

// Klein grijs linkje terug naar de index, en de vierkante werkbalk met Glue, Replace en Shuffle.
// Nieuw gereedschap? Maak een knop met class "tool" en zet hem in de werkbalk.
function buildChrome() {
  document.body.insertAdjacentHTML("afterbegin", `<a class="corner" href="index.html">inspiratiearchief Mick van der Woord</a>`);
  const bar = document.createElement("div");
  bar.className = "toolbar";
  bar.append(glueBtn, replaceBtn, shuffleBtn);
  document.body.append(bar);
}

function tool(label, icon, onclick) {
  const b = document.createElement("button");
  b.className = "tool";
  b.innerHTML = `<i>${icon}</i><span>${label}</span>`;
  b.onclick = onclick;
  return b;
}

/* ---------- Blokken (zoals op Are.na) ---------- */
function makeImageBlock(c, f, i, items) {
  const cell = document.createElement("figure");
  cell.className = "cell";
  cell.innerHTML = `
    <div class="cell-img">${isVideo(f)
      ? `<video class="floater" src="${src(c, f)}" autoplay muted loop playsinline preload="metadata" draggable="false"></video>`
      : `<img class="floater" src="${view(c, f)}" alt="" loading="lazy" draggable="false">`}</div>
    <figcaption>${pad(i + 1, 3)}${pdfLink(c, f)}</figcaption>`;
  cell.querySelector(".floater").addEventListener("click", () => openLightbox(items, i));
  return cell;
}

function makeLinkBlock(c, link, i) {
  const a = document.createElement("a");
  a.className = "cell link-block";
  a.href = link.url;
  a.target = "_blank";
  a.rel = "noopener";
  a.innerHTML = `
    <div class="link-slot">
      <div class="link-preview floater">
        ${link.image ? `<img src="${encodeURI(link.image)}" alt="" loading="lazy" draggable="false">` : `<span class="link-empty">${esc(domain(link.url))}</span>`}
        <span class="link-tag">Link ↗</span>
      </div>
    </div>
    <div class="link-meta">
      <span class="link-title">${esc(link.title)}</span>
      <span class="link-url">${esc(domain(link.url))}</span>
    </div>`;
  const title = a.querySelector(".link-title");
  editable(title, `${c.slug}.link.${i}`, v => (link.title = v));
  // het voorbeeld doet mee met Glue, Replace en Shuffle; in de Edit-stand opent een klik de link niet
  a.addEventListener("click", e => {
    if (document.body.classList.contains("editing")) e.preventDefault();
  });
  return a;
}

/* ---------- Index: één vierkant, beelden die na elkaar opploppen ---------- */
const INTERVAL = 140; // milliseconden per beeld — lager is sneller

function buildIndex() {
  const home = document.getElementById("home");
  // het vierkant toont de archief-thema's; connectors heeft zijn eigen zwevende 3D-object
  const items = all.filter(c => (c.page || "themas") === "themas")
    .flatMap(c => c.images.map((f, i) => ({ c, f, n: i + 1 })))
    .filter(it => !isVideo(it.f)); // het vierkant toont alleen stilstaande beelden

  home.innerHTML = `
    <span class="corner">inspiratiearchief Mick van der Woord</span>
    <figure class="pop">
      <span class="pop-name">thema's</span>
      <a class="pop-frame frost" href="themas.html"><img alt="" draggable="false"></a>
      <figcaption><span class="pop-num"></span></figcaption>
    </figure>`;

  const frame = home.querySelector(".pop-frame");
  const img = frame.querySelector("img");
  const num = home.querySelector(".pop-num");

  // alles vooraf laden, zodat elk beeld meteen verschijnt
  items.forEach(it => { new Image().src = src(it.c, it.f); });

  // willekeurige volgorde, elk beeld één keer per ronde
  let bag = [];
  let last = null;
  const next = () => {
    if (!bag.length) bag = items.slice().sort(() => Math.random() - 0.5);
    let it = bag.pop();
    if (it === last && bag.length) { bag.unshift(it); it = bag.pop(); }
    last = it;
    img.src = src(it.c, it.f);
    frame.href = (it.c.page || "themas") + ".html#" + it.c.slug;
    num.textContent = pad(it.n, 3);
    frame.classList.remove("popped");
    frame.offsetWidth; // animatie opnieuw starten
    frame.classList.add("popped");
  };
  next();
  setInterval(next, INTERVAL);

  // zwevende tekstlinks naar losse pagina's
  // presearch (1 en 2): een wazig stoplicht, rood; groen zodra je erover gaat
  drift("presearch", "presearch.html", 0.9, true);
}

/* ---------- Zwevende tekstlink op de index (drijft om het vierkant heen) ---------- */
function drift(label, href, speed = 0.9, dot = false) {
  const a = document.createElement("a");
  a.className = "drift" + (dot ? " drift-dot" : "");
  a.href = href;
  if (dot) {
    a.setAttribute("aria-label", label);
    a.innerHTML = `<span class="light"></span><span class="drift-label">${esc(label)}</span>`;
  } else a.textContent = label;
  document.body.appendChild(a);

  let x = innerWidth * (0.55 + Math.random() * 0.3), y = innerHeight * (0.1 + Math.random() * 0.2);
  let ang = Math.random() * Math.PI * 2, vx = Math.cos(ang) * speed, vy = Math.sin(ang) * speed;
  let hover = false, last = performance.now();
  a.addEventListener("pointerenter", () => (hover = true));
  a.addEventListener("pointerleave", () => (hover = false));

  const step = () => {
    const now = performance.now(), dt = Math.min((now - last) / 16.67, 3);
    last = now;
    const w = a.offsetWidth, h = a.offsetHeight;
    if (!hover) {
      vx += (Math.random() - 0.5) * 0.06 * dt;
      vy += (Math.random() - 0.5) * 0.06 * dt;
      const sp = Math.hypot(vx, vy) || 1;
      vx = vx / sp * speed; vy = vy / sp * speed;
      x += vx * dt; y += vy * dt;
    }
    const W = document.documentElement.clientWidth, H = innerHeight;
    if (x < 0) { x = 0; vx = Math.abs(vx); }
    if (y < 0) { y = 0; vy = Math.abs(vy); }
    if (x > W - w) { x = W - w; vx = -Math.abs(vx); }
    if (y > H - h) { y = H - h; vy = -Math.abs(vy); }
    // om het vierkant heen
    const r = document.querySelector(".pop")?.getBoundingClientRect();
    if (r) {
      const m = 12;
      const ox = Math.min(x + w, r.right + m) - Math.max(x, r.left - m);
      const oy = Math.min(y + h, r.bottom + m) - Math.max(y, r.top - m);
      if (ox > 0 && oy > 0) {
        const left = x + w / 2 < r.left + r.width / 2, above = y + h / 2 < r.top + r.height / 2;
        if (ox < oy) { x += left ? -ox : ox; vx = left ? -Math.abs(vx) : Math.abs(vx); }
        else { y += above ? -oy : oy; vy = above ? -Math.abs(vy) : Math.abs(vy); }
      }
    }
    a.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Archief: alles op één pagina ---------- */
function buildArchief() {
  const wrap = document.getElementById("archief");

  all.filter(c => (c.page || "themas") === current).forEach((c, ci) => {
    const items = c.images.map(f => ({ c, f }));
    const links = c.links || [];

    const sec = document.createElement("section");
    sec.className = "theme";
    sec.id = c.slug;
    sec.innerHTML = `
      <h2 class="theme-title"></h2>
      <p class="theme-q"></p>
      <p class="theme-text"></p>
      <div class="gallery"></div>`;
    const h = sec.querySelector(".theme-title");
    const p = sec.querySelector(".theme-text");
    h.textContent = c.title;
    p.textContent = c.text || "";
    const q = sec.querySelector(".theme-q");
    q.textContent = c.question || "";
    editable(q, c.slug + ".question", v => (c.question = v));
    editable(h, c.slug + ".title", v => (c.title = v));
    editable(p, c.slug + ".text", v => (c.text = v));

    const grid = sec.querySelector(".gallery");
    items.forEach((it, i) => grid.appendChild(makeImageBlock(c, it.f, i, items)));
    // eigen html-werk (bijv. een test-out): draait gewoon in de pagina, na de beelden.
    // Geen tekst eronder, alleen "open ↗"; de titel is er alleen voor schermlezers.
    if (c.embeds && c.embeds.length) {
      const eg = document.createElement("div");
      eg.className = "embed-gallery";
      c.embeds.forEach(e => {
        const fig = document.createElement("figure");
        fig.className = "embed";
        fig.innerHTML = `
          <div class="embed-frame"><iframe src="${encodeURI(e.url)}" title="${esc(e.title)}" loading="lazy" allowfullscreen></iframe></div>
          <figcaption><a href="${encodeURI(e.url)}" target="_blank" rel="noopener" aria-label="${esc(e.title)} – open los">open ↗</a></figcaption>`;
        eg.appendChild(fig);
      });
      sec.appendChild(eg);
    }
    // websites onderaan het thema, in een eigen rij
    if (links.length) {
      const linkGrid = document.createElement("div");
      linkGrid.className = "gallery link-gallery";
      links.forEach((l, i) => linkGrid.appendChild(makeLinkBlock(c, l, i)));
      sec.appendChild(linkGrid);
    }
    wrap.appendChild(sec);
  });
}

/* ---------- Glue, Replace en Shuffle ---------- */
// Slepen kan niet meer. Op elke archiefpagina staan drie knoppen:
//   Glue    – alle beelden plakken aan de cursor (nog eens drukken: terug in het raster)
//   Replace – alle beelden springen naar een nieuwe, willekeurige plek; elke klik weer een andere
//   Shuffle – alle beelden gaan zweven (nog eens drukken: terug in het raster)
// Van de ene stand kun je meteen naar de andere; Esc zet alles altijd terug in het raster.
const bodies = new Map();
let rafId = null, lastFrame = 0, mode = null, returning = false, topZ = 10;
const rand = (a, b) => a + Math.random() * (b - a);
const viewW = () => document.documentElement.clientWidth;
const ease = t => 1 - Math.pow(1 - t, 3);
const clamp01 = t => Math.min(Math.max(t, 0), 1);
const upright = r => ((r % 360) + 540) % 360 - 180; // kortste draai terug naar rechtop

const glueBtn = tool("Glue", "✣", () => setMode(mode === "glue" ? null : "glue"));
const replaceBtn = tool("Replace", "⤨", () => setMode("replace"));
const shuffleBtn = tool("Shuffle", "⁂", () => setMode(mode === "shuffle" ? null : "shuffle"));

function setMode(m) {
  if (returning) return;
  if (!m) {
    if (!mode) return;
    mode = null;
    updateButtons();
    return stopChaos();
  }
  cancelAnimationFrame(rafId);
  mode = m;
  updateButtons();
  lift();
  if (m === "shuffle") startChaos();
  else if (m === "glue") startGlue();
  else startReplace();
}

function updateButtons() {
  glueBtn.querySelector("span").textContent = mode === "glue" ? "Unglue" : "Glue";
  shuffleBtn.querySelector("span").textContent = mode === "shuffle" ? "Order" : "Shuffle";
  glueBtn.setAttribute("aria-pressed", mode === "glue");
  replaceBtn.setAttribute("aria-pressed", mode === "replace");
  shuffleBtn.setAttribute("aria-pressed", mode === "shuffle");
  document.body.classList.toggle("glued", mode === "glue");
  document.body.classList.toggle("replaced", mode === "replace");
  document.body.classList.toggle("chaos", mode === "shuffle");
}

// (capture: dit loopt vóór de lightbox, zodat Esc eerst alleen de lightbox sluit)
addEventListener("keydown", e => {
  if (e.key === "Escape" && mode && !(lb && lb.classList.contains("show"))) setMode(null);
}, true);

function place(b) {
  b.el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.r}deg)`;
}

function measure(b) {
  b.w = b.el.offsetWidth;
  b.h = b.el.offsetHeight || b.w;
}

// Haal elk beeld uit het raster, precies vanaf zijn eigen plek, zodat het vrij kan bewegen.
// Zweeft het al (je komt uit een andere stand), dan gaat het gewoon verder vanaf waar het is.
function lift() {
  document.querySelectorAll(".floater").forEach(img => {
    if (bodies.has(img)) return;
    let r = img.getBoundingClientRect();
    if (!r.width) r = img.parentElement.getBoundingClientRect();
    const aspect = natW(img) ? natH(img) / natW(img) : r.height / r.width || 1;
    if (img.tagName === "IMG") img.loading = "eager";
    img.classList.add("floating");
    img.style.width = r.width + "px";
    img.style.zIndex = ++topZ;
    const b = { el: img, x: r.left, y: r.top, w: r.width, h: r.width * aspect, aspect, r: 0 };
    const fix = () => { b.aspect = natH(img) / natW(img) || b.aspect; b.h = b.w * b.aspect; };
    if (img.tagName === "IMG" && !img.complete) img.addEventListener("load", fix, { once: true });
    if (img.tagName === "VIDEO" && !img.videoWidth) img.addEventListener("loadedmetadata", fix, { once: true });
    bodies.set(img, b);
    place(b);
  });
}

/* Shuffle: alles gaat zweven */
function startChaos() {
  const W = viewW(), H = innerHeight, now = performance.now();
  bodies.forEach(b => {
    const toW = rand(110, Math.min(300, W * 0.35));
    b.vx = rand(-3, 3); b.vy = rand(-3, 3); b.vr = rand(-0.25, 0.25);
    // eerst vliegt elk beeld naar een willekeurige plek, daarna gaat het zweven
    b.intro = {
      t0: now + rand(0, 250), dur: rand(900, 1500),
      x0: b.x, y0: b.y, w0: b.w,
      x1: rand(0, Math.max(0, W - toW)), y1: rand(0, Math.max(0, H - toW * b.aspect)), w1: toW
    };
  });
  lastFrame = now;
  rafId = requestAnimationFrame(tick);
}

function tick() {
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 16.67, 3); // 1 = één frame op 60fps
  lastFrame = now;
  const W = viewW(), H = innerHeight;

  bodies.forEach(b => {
    if (b.intro) {
      const it = b.intro;
      const t = clamp01((now - it.t0) / it.dur), e = ease(t);
      b.x = it.x0 + (it.x1 - it.x0) * e;
      b.y = it.y0 + (it.y1 - it.y0) * e;
      b.w = it.w0 + (it.w1 - it.w0) * e;
      b.h = b.w * b.aspect;
      b.r += b.vr * dt * e;
      b.el.style.width = b.w + "px";
      if (t >= 1) { b.intro = null; measure(b); }
      place(b);
      return;
    }

    // een beetje dwalen, zodat niets ooit stil ligt of rechtdoor gaat
    b.vx += rand(-0.06, 0.06) * dt;
    b.vy += rand(-0.06, 0.06) * dt;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 2.2) { b.vx *= 0.985; b.vy *= 0.985; }
    if (sp < 0.4) { b.vx *= 1.05; b.vy *= 1.05; }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.r += b.vr * dt;

    if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx); }
    if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy); }
    if (b.x > W - b.w) { b.x = Math.max(0, W - b.w); b.vx = -Math.abs(b.vx); }
    if (b.y > H - b.h) { b.y = Math.max(0, H - b.h); b.vy = -Math.abs(b.vy); }
    place(b);
  });
  rafId = requestAnimationFrame(tick);
}

/* Replace: elk beeld krijgt een nieuwe, willekeurige plek en blijft daar liggen */
function startReplace() {
  const W = viewW(), H = innerHeight, now = performance.now();
  // ook de stapelvolgorde opnieuw husselen (vanaf onderen, zodat de knoppen er altijd boven blijven)
  topZ = 10;
  [...bodies.values()].sort(() => Math.random() - 0.5).forEach(b => (b.el.style.zIndex = ++topZ));
  bodies.forEach(b => {
    const w1 = rand(90, Math.min(260, W * 0.3));
    b.go = {
      t0: now + rand(0, 200), dur: rand(700, 1100),
      x0: b.x, y0: b.y, w0: b.w, r0: upright(b.r),
      x1: rand(0, Math.max(0, W - w1)), y1: rand(0, Math.max(0, H - w1 * b.aspect)), w1
    };
  });
  rafId = requestAnimationFrame(replaceTick);
}

function replaceTick() {
  const now = performance.now();
  let busy = false;
  bodies.forEach(b => {
    const g = b.go;
    const t = clamp01((now - g.t0) / g.dur), e = ease(t);
    b.x = g.x0 + (g.x1 - g.x0) * e;
    b.y = g.y0 + (g.y1 - g.y0) * e;
    b.w = g.w0 + (g.w1 - g.w0) * e;
    b.h = b.w * b.aspect;
    b.r = g.r0 * (1 - e);
    b.el.style.width = b.w + "px";
    place(b);
    if (t < 1) busy = true;
  });
  rafId = busy ? requestAnimationFrame(replaceTick) : null;
}

/* Glue: alle beelden plakken aan de cursor */
const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });

function startGlue() {
  // hoe meer beelden, hoe groter de tros rond de cursor
  const spread = Math.min(280, 60 + bodies.size * 7);
  bodies.forEach(b => {
    const angle = rand(0, Math.PI * 2), dist = Math.sqrt(Math.random()) * spread;
    b.ox = Math.cos(angle) * dist; b.oy = Math.sin(angle) * dist; // vaste plek in de tros
    b.w1 = rand(70, 150);                                       // maat aan de cursor
    b.k = rand(0.05, 0.22);                                     // hoe strak hij volgt
    b.tilt = rand(-12, 12);
  });
  lastFrame = performance.now();
  rafId = requestAnimationFrame(glueTick);
}

function glueTick() {
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 16.67, 3);
  lastFrame = now;

  bodies.forEach(b => {
    const f = 1 - Math.pow(1 - b.k, dt); // zelfde gevoel bij elke framerate
    b.w += (b.w1 - b.w) * (1 - Math.pow(0.88, dt));
    b.h = b.w * b.aspect;
    b.el.style.width = b.w + "px";
    const tx = mouse.x + b.ox - b.w / 2, ty = mouse.y + b.oy - b.h / 2;
    const dx = (tx - b.x) * f;
    b.x += dx;
    b.y += (ty - b.y) * f;
    // kantelt mee met de beweging, als iets dat aan een touwtje hangt
    b.r += (b.tilt + Math.max(-25, Math.min(25, dx * 0.6)) - b.r) * 0.15;
    place(b);
  });
  rafId = requestAnimationFrame(glueTick);
}

// De plek (en maat) die een beeld in het raster inneemt, in schermcoördinaten
function homeRect(img) {
  const p = img.parentElement.getBoundingClientRect();
  if (img.tagName !== "IMG" && img.tagName !== "VIDEO") return { x: p.left, y: p.top, w: p.width }; // linkblok vult zijn vak
  const nw = natW(img) || p.width, nh = natH(img) || p.height;
  const k = Math.min(p.width / nw, p.height / nh, 1);
  const w = nw * k, h = nh * k;
  return { x: p.left + (p.width - w) / 2, y: p.top + (p.height - h) / 2, w };
}

// Terug in het raster (vanuit welke stand dan ook)
function stopChaos() {
  cancelAnimationFrame(rafId);
  returning = true;
  const start = performance.now();

  bodies.forEach(b => {
    b.intro = null;
    b.back = { t0: start + rand(0, 200), dur: rand(800, 1100), x0: b.x, y0: b.y, w0: b.w, r0: b.r };
  });

  // aangekomen: terug in het gewone raster
  const finish = () => {
    if (!returning) return;
    cancelAnimationFrame(rafId);
    bodies.forEach(b => {
      const img = b.el;
      img.style.transition = "none"; // geen sprong door de hover-animatie bij het omschakelen
      img.classList.remove("floating");
      img.style.width = img.style.transform = img.style.zIndex = "";
    });
    document.body.offsetWidth; // eerst de nieuwe plek vastleggen
    bodies.forEach(b => (b.el.style.transition = ""));
    bodies.clear();
    returning = false;
  };
  const ends = [...bodies.values()].map(b => b.back.t0 + b.back.dur - start);
  setTimeout(finish, (ends.length ? Math.max(...ends) : 0) + 100); // vangnet, ook als de animatie hapert

  const step = () => {
    const now = performance.now();
    let busy = false;
    bodies.forEach(b => {
      const bk = b.back;
      const t = clamp01((now - bk.t0) / bk.dur), e = ease(t);
      const home = homeRect(b.el); // elke frame opnieuw, zodat scrollen niet uitmaakt
      b.x = bk.x0 + (home.x - bk.x0) * e;
      b.y = bk.y0 + (home.y - bk.y0) * e;
      b.w = bk.w0 + (home.w - bk.w0) * e;
      b.r = upright(bk.r0) * (1 - e);
      b.el.style.width = b.w + "px";
      place(b);
      if (t < 1) busy = true;
    });
    if (busy) rafId = requestAnimationFrame(step);
    else finish();
  };
  rafId = requestAnimationFrame(step);
}

addEventListener("resize", () => bodies.forEach(measure));

/* ---------- Lightbox ---------- */
let lb, lbImg, lbVid, lbCount, lbCap, lbPage, lbItems, lbIndex, lbP = 1;

function openLightbox(items, i) {
  if (!lb) {
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML = `
      <button class="lb-close">Close ×</button>
      <button class="lb-prev" aria-label="Previous">←</button>
      <img alt="">
      <video controls loop playsinline hidden></video>
      <button class="lb-next" aria-label="Next">→</button>
      <div class="lb-foot"><span class="lb-cap"></span><span class="lb-page"></span><span class="lb-count"></span></div>`;
    document.body.appendChild(lb);
    lbImg = lb.querySelector("img");
    lbVid = lb.querySelector("video");
    lbCount = lb.querySelector(".lb-count");
    lbCap = lb.querySelector(".lb-cap");
    lbPage = lb.querySelector(".lb-page");
    // klik op een pdf-pagina: volgende pagina
    lbImg.addEventListener("click", () => { if (isPdf(lbItems[lbIndex].f)) step(1); });
    lb.querySelector(".lb-close").onclick = closeLightbox;
    lb.querySelector(".lb-prev").onclick = () => step(-1);
    lb.querySelector(".lb-next").onclick = () => step(1);
    lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("show")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }
  lbItems = items;
  lbIndex = i;
  lbP = 1;
  showLightbox();
  lb.classList.add("show");
  document.body.style.overflow = "hidden";
}

function showLightbox() {
  const it = lbItems[lbIndex];
  const vid = isVideo(it.f);
  lbImg.hidden = vid;
  lbVid.hidden = !vid;
  if (vid) { lbVid.src = src(it.c, it.f); lbVid.play().catch(() => {}); }
  else { lbVid.pause(); lbVid.removeAttribute("src"); lbImg.src = isPdf(it.f) ? pageSrc(it.c, it.f, lbP) : src(it.c, it.f); }
  const pages = isPdf(it.f) ? pageCount(it.c, it.f) : 0;
  lbPage.textContent = pages ? `pagina ${lbP} / ${pages}` : "";
  lbImg.classList.toggle("lb-pdf", pages > 1);
  // volgende pagina alvast laden
  if (pages && lbP < pages) new Image().src = pageSrc(it.c, it.f, lbP + 1);
  lbCap.innerHTML = esc(it.c.title) + pdfLink(it.c, it.f);
  lbCount.textContent = `${pad(lbIndex + 1, 3)} / ${pad(lbItems.length, 3)}`;
}

// pijltjes: eerst door de pagina's van een pdf, daarna naar het volgende item
function step(d) {
  const it = lbItems[lbIndex];
  const pages = isPdf(it.f) ? pageCount(it.c, it.f) : 1;
  if (lbP + d >= 1 && lbP + d <= pages) { lbP += d; return showLightbox(); }
  const n = lbItems.length;
  lbIndex = (lbIndex + d + n) % n;
  const nx = lbItems[lbIndex];
  lbP = d < 0 && isPdf(nx.f) ? pageCount(nx.c, nx.f) : 1;
  showLightbox();
}

function closeLightbox() {
  lb.classList.remove("show");
  lbVid.pause();
  document.body.style.overflow = "";
}

/* ---------- Alle beelden van de hele site op één pagina ---------- */
function buildAlles() {
  const wrap = document.getElementById("archief");
  const items = all.flatMap(c => c.images.map(f => ({ c, f })));
  const sec = document.createElement("section");
  sec.className = "theme";
  sec.id = "alles";
  sec.innerHTML = `
    <h2 class="theme-title">alle beelden</h2>
    <p class="theme-text">${items.length} beelden uit het hele archief</p>
    <div class="gallery"></div>`;
  const grid = sec.querySelector(".gallery");
  items.forEach((it, i) => grid.appendChild(makeImageBlock(it.c, it.f, i, items)));
  wrap.appendChild(sec);
}

/* ---------- Start ---------- */
if (current === "index") buildIndex();
if (["themas", "connectors", "24days", "presearch"].includes(current)) {
  buildArchief();
  buildChrome();
}
if (current === "alles") {
  buildAlles();
  buildChrome();
}
