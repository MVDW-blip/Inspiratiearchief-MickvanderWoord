// Bouwt de index en de archiefpagina op basis van data.js,
// plus bewerken, slepen, lightbox en de Shuffle-knop (alles gaat zweven).

const all = window.COLLECTIONS || [];
const current = document.body.dataset.page; // "index" of "archief"
const pad = (n, l = 2) => String(n).padStart(l, "0");
const src = (c, f) => encodeURI(c.folder + "/" + f);
const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const isVideo = f => /\.(mp4|webm|mov)$/i.test(f);
// echte breedte/hoogte van een beeld of video
const natW = el => el.naturalWidth || el.videoWidth || 0;
const natH = el => el.naturalHeight || el.videoHeight || 0;
const domain = url => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/* ---------- Eigen bewerkingen (opgeslagen in deze browser) ---------- */
const EDIT_KEY = "inspiratiearchief-edits";
const edits = JSON.parse(localStorage.getItem(EDIT_KEY) || "{}");

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

// Klein grijs linkje terug naar de index, en de vierkante werkbalk met gereedschap.
// Nieuw gereedschap? Maak een knop met class "tool" en zet hem in de werkbalk.
function buildChrome(modeBtn) {
  document.body.insertAdjacentHTML("afterbegin", `<a class="corner" href="index.html">inspiratiearchief</a>`);

  editBtn = tool("Edit", "✎", () => setEditMode(!document.body.classList.contains("editing")));
  downloadBtn = tool("Save", "↓", downloadData);
  downloadBtn.title = "Download data.js met je bewerkingen";
  updateDownload();

  const bar = document.createElement("div");
  bar.className = "toolbar";
  bar.append(modeBtn, editBtn, resetBtn, downloadBtn);
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
      : `<img class="floater" src="${src(c, f)}" alt="" loading="lazy" draggable="false">`}</div>
    <figcaption>${pad(i + 1, 3)}</figcaption>`;
  makeDraggable(cell.querySelector(".floater"), () => openLightbox(items, i));
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
  // zweeft mee met Shuffle; alleen in die stand sleepbaar
  const preview = a.querySelector(".link-preview");
  makeDraggable(preview, () => {}, { floatOnly: true });
  // in de Edit-stand, of net na het slepen, opent een klik de link niet
  a.addEventListener("click", e => {
    if (document.body.classList.contains("editing") || preview.dataset.dragged) e.preventDefault();
  });
  return a;
}

/* ---------- Index: één vierkant, beelden die na elkaar opploppen ---------- */
const INTERVAL = 140; // milliseconden per beeld — lager is sneller

function buildIndex() {
  const home = document.getElementById("home");
  // het vierkant toont de archief-thema's; connectors heeft zijn eigen zwevende 3D-object
  const items = all.filter(c => (c.page || "archief") === "archief")
    .flatMap(c => c.images.map((f, i) => ({ c, f, n: i + 1 })))
    .filter(it => !isVideo(it.f)); // het vierkant toont alleen stilstaande beelden

  home.innerHTML = `
    <span class="corner">inspiratiearchief Mick van der Woord</span>
    <figure class="pop">
      <span class="pop-name">thema's</span>
      <a class="pop-frame frost" href="archief.html"><img alt="" draggable="false"></a>
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
    frame.href = (it.c.page || "archief") + ".html#" + it.c.slug;
    num.textContent = pad(it.n, 3);
    frame.classList.remove("popped");
    frame.offsetWidth; // animatie opnieuw starten
    frame.classList.add("popped");
  };
  next();
  setInterval(next, INTERVAL);
}

/* ---------- Archief: alles op één pagina ---------- */
function buildArchief() {
  const wrap = document.getElementById("archief");

  all.filter(c => (c.page || "archief") === current).forEach((c, ci) => {
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

/* ---------- Slepen (werkt in beide standen) ---------- */
let topZ = 10;

function makeDraggable(img, onClick, { floatOnly = false } = {}) {
  img.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    if (floatOnly && !img.classList.contains("floating")) return;
    e.preventDefault();
    img.setPointerCapture(e.pointerId);
    if (returning) return;
    const floating = img.classList.contains("floating");
    const body = floating ? bodies.get(img) : null;
    const startX = e.clientX, startY = e.clientY;
    const baseX = floating ? body.x : +img.dataset.x || 0;
    const baseY = floating ? body.y : +img.dataset.y || 0;
    let moved = false, lastX = startX, lastY = startY, lastT = performance.now();
    img.style.zIndex = ++topZ;
    if (body) { body.drag = true; body.intro = null; body.vx = body.vy = 0; measure(body); }

    const move = ev => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      img.classList.add("dragging");
      if (body) {
        const now = performance.now(), dt = Math.max(now - lastT, 1);
        body.vx = (ev.clientX - lastX) / dt * 16;
        body.vy = (ev.clientY - lastY) / dt * 16;
        lastX = ev.clientX; lastY = ev.clientY; lastT = now;
        body.x = baseX + dx;
        body.y = baseY + dy;
        place(body);
      } else {
        img.dataset.x = baseX + dx;
        img.dataset.y = baseY + dy;
        img.style.setProperty("--x", img.dataset.x + "px");
        img.style.setProperty("--y", img.dataset.y + "px");
        resetBtn.disabled = false;
      }
    };
    const up = () => {
      img.removeEventListener("pointermove", move);
      img.removeEventListener("pointerup", up);
      img.removeEventListener("pointercancel", up);
      img.classList.remove("dragging");
      if (body) {
        body.drag = false;
        // gooien: meegegeven snelheid, begrensd
        const sp = Math.hypot(body.vx, body.vy), max = 14;
        if (sp > max) { body.vx *= max / sp; body.vy *= max / sp; }
      }
      if (moved) {
        img.dataset.dragged = "1";
        setTimeout(() => delete img.dataset.dragged, 0);
      } else onClick();
    };
    img.addEventListener("pointermove", move);
    img.addEventListener("pointerup", up);
    img.addEventListener("pointercancel", up);
  });
}

/* ---------- Shuffle: alles gaat zweven ---------- */
const bodies = new Map();
let rafId = null, lastFrame = 0;
const rand = (a, b) => a + Math.random() * (b - a);

const shuffleBtn = tool("Shuffle", "⁂", () => { if (!returning) setChaos(!document.body.classList.contains("chaos")); });

const resetBtn = tool("Reset", "↺", () => {
  if (document.body.classList.contains("chaos")) return setChaos(false);
  if (document.body.classList.contains("glued")) return setGlue(false);
  document.querySelectorAll(".floater").forEach(img => {
    img.style.removeProperty("--x");
    img.style.removeProperty("--y");
    img.dataset.x = img.dataset.y = 0;
  });
  resetBtn.disabled = true;
});
resetBtn.disabled = true;

function place(b) {
  b.el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.r}deg)`;
}

function measure(b) {
  b.w = b.el.offsetWidth;
  b.h = b.el.offsetHeight || b.w;
}

function setChaos(on) {
  document.body.classList.toggle("chaos", on);
  shuffleBtn.querySelector("span").textContent = on ? "Order" : "Shuffle";
  shuffleBtn.setAttribute("aria-pressed", on);
  resetBtn.disabled = on || !document.querySelector('.floater[style*="--x"]');
  on ? startChaos() : stopChaos();
}

const viewW = () => document.documentElement.clientWidth;
const ease = t => 1 - Math.pow(1 - t, 3);

function startChaos() {
  const W = viewW(), H = innerHeight;
  const imgs = [...document.querySelectorAll(".floater")];
  const now = performance.now();

  imgs.forEach(img => {
    // vertrek precies vanaf de eigen plek in het raster (ook als die buiten beeld ligt)
    let r = img.getBoundingClientRect();
    if (!r.width) r = img.parentElement.getBoundingClientRect();
    const aspect = natW(img) ? natH(img) / natW(img) : r.height / r.width || 1;
    img.loading = "eager";
    img.classList.add("floating");
    img.style.width = r.width + "px";
    img.style.zIndex = ++topZ;

    const toW = rand(110, Math.min(300, W * 0.35));
    const b = {
      el: img,
      x: r.left, y: r.top, w: r.width, h: r.width * aspect, aspect,
      vx: rand(-3, 3), vy: rand(-3, 3),
      r: 0, vr: rand(-0.25, 0.25),
      drag: false,
      // eerst vliegt elk beeld van zijn plek naar een willekeurige plek, daarna gaat het zweven
      intro: {
        t0: now + rand(0, 250), dur: rand(900, 1500),
        x0: r.left, y0: r.top, w0: r.width,
        x1: rand(0, Math.max(0, W - toW)), y1: rand(0, Math.max(0, H - toW * aspect)), w1: toW
      }
    };
    if (img.tagName === "IMG" && !img.complete) img.addEventListener("load", () => {
      b.aspect = natH(img) / natW(img) || b.aspect;
      measure(b);
    }, { once: true });
    if (img.tagName === "VIDEO" && !img.videoWidth) img.addEventListener("loadedmetadata", () => {
      b.aspect = natH(img) / natW(img) || b.aspect;
      measure(b);
    }, { once: true });
    bodies.set(img, b);
    place(b);
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
    if (b.drag) return;

    if (b.intro) {
      const it = b.intro;
      const t = Math.min(Math.max((now - it.t0) / it.dur, 0), 1), e = ease(t);
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
    if (sp > 2.2) { b.vx *= 0.985; b.vy *= 0.985; } // na een worp weer rustig
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

// De plek (en maat) die een beeld in het raster inneemt, in schermcoördinaten
function homeRect(img) {
  const p = img.parentElement.getBoundingClientRect();
  if (img.tagName !== "IMG" && img.tagName !== "VIDEO") return { x: p.left, y: p.top, w: p.width }; // linkblok vult zijn vak
  const nw = natW(img) || p.width, nh = natH(img) || p.height;
  const k = Math.min(p.width / nw, p.height / nh, 1);
  const w = nw * k, h = nh * k;
  return { x: p.left + (p.width - w) / 2, y: p.top + (p.height - h) / 2, w };
}

let returning = false;

function stopChaos() {
  cancelAnimationFrame(rafId);
  returning = true;
  const start = performance.now();

  bodies.forEach(b => {
    b.drag = false;
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
      img.style.width = img.style.transform = "";
      img.style.removeProperty("--x");
      img.style.removeProperty("--y");
      img.dataset.x = img.dataset.y = 0;
    });
    document.body.offsetWidth; // eerst de nieuwe plek vastleggen
    bodies.forEach(b => (b.el.style.transition = ""));
    bodies.clear();
    returning = false;
    resetBtn.disabled = true;
  };
  const maxEnd = Math.max(...[...bodies.values()].map(b => b.back.t0 + b.back.dur)) - start;
  setTimeout(finish, maxEnd + 100); // vangnet, ook als de animatie hapert

  const step = () => {
    const now = performance.now();
    let busy = false;
    bodies.forEach(b => {
      const bk = b.back;
      const t = Math.min(Math.max((now - bk.t0) / bk.dur, 0), 1), e = ease(t);
      const home = homeRect(b.el); // elke frame opnieuw, zodat scrollen niet uitmaakt
      b.x = bk.x0 + (home.x - bk.x0) * e;
      b.y = bk.y0 + (home.y - bk.y0) * e;
      b.w = bk.w0 + (home.w - bk.w0) * e;
      // terug rechtop via de kortste draai
      const r0 = ((bk.r0 % 360) + 540) % 360 - 180;
      b.r = r0 * (1 - e);
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
let lb, lbImg, lbVid, lbCount, lbCap, lbItems, lbIndex;

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
      <div class="lb-foot"><span class="lb-cap"></span><span class="lb-count"></span></div>`;
    document.body.appendChild(lb);
    lbImg = lb.querySelector("img");
    lbVid = lb.querySelector("video");
    lbCount = lb.querySelector(".lb-count");
    lbCap = lb.querySelector(".lb-cap");
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
  else { lbVid.pause(); lbVid.removeAttribute("src"); lbImg.src = src(it.c, it.f); }
  lbCap.textContent = it.c.title;
  lbCount.textContent = `${pad(lbIndex + 1, 3)} / ${pad(lbItems.length, 3)}`;
}

function step(d) {
  const n = lbItems.length;
  lbIndex = (lbIndex + d + n) % n;
  showLightbox();
}

function closeLightbox() {
  lb.classList.remove("show");
  lbVid.pause();
  document.body.style.overflow = "";
}

/* ---------- Glue: alle beelden plakken aan de cursor ---------- */
const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });

const glueBtn = tool("Glue", "✣", () => { if (!returning) setGlue(!document.body.classList.contains("glued")); });

function setGlue(on) {
  document.body.classList.toggle("glued", on);
  glueBtn.querySelector("span").textContent = on ? "Unglue" : "Glue";
  glueBtn.setAttribute("aria-pressed", on);
  resetBtn.disabled = on || !document.querySelector('.floater[style*="--x"]');
  on ? startGlue() : stopChaos(); // terug naar het raster gaat net als bij Shuffle
}

function startGlue() {
  const imgs = [...document.querySelectorAll(".floater")];
  // hoe meer beelden, hoe groter de tros rond de cursor
  const spread = Math.min(280, 60 + imgs.length * 7);

  imgs.forEach(img => {
    // vertrekt vanaf de eigen plek in het raster
    let r = img.getBoundingClientRect();
    if (!r.width) r = img.parentElement.getBoundingClientRect();
    const aspect = natW(img) ? natH(img) / natW(img) : r.height / r.width || 1;
    img.loading = "eager";
    img.classList.add("floating");
    img.style.width = r.width + "px";
    img.style.zIndex = ++topZ;

    const angle = rand(0, Math.PI * 2), dist = Math.sqrt(Math.random()) * spread;
    const b = {
      el: img,
      x: r.left, y: r.top, w: r.width, h: r.width * aspect, aspect, r: 0,
      ox: Math.cos(angle) * dist, oy: Math.sin(angle) * dist, // vaste plek in de tros
      w1: rand(70, 150),                                       // maat aan de cursor
      k: rand(0.05, 0.22),                                     // hoe strak hij volgt
      tilt: rand(-12, 12)
    };
    if (img.tagName === "IMG" && !img.complete) img.addEventListener("load", () => {
      b.aspect = natH(img) / natW(img) || b.aspect;
    }, { once: true });
    if (img.tagName === "VIDEO" && !img.videoWidth) img.addEventListener("loadedmetadata", () => {
      b.aspect = natH(img) / natW(img) || b.aspect;
    }, { once: true });
    bodies.set(img, b);
    place(b);
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

/* ---------- Start ---------- */
if (current === "index") buildIndex();
if (current === "archief") {
  buildArchief();
  buildChrome(shuffleBtn);
}
if (current === "connectors") {
  buildArchief();
  buildChrome(glueBtn);
}
