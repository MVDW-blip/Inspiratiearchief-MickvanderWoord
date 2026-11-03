// Bouwt het menu, de homepagina en de beeldpagina's op basis van data.js.

const pages = window.ARCHIVE || [];
const current = document.body.dataset.page; // "home" of een slug uit data.js
const pad = n => String(n).padStart(2, "0");
const src = (p, file) => encodeURI(p.folder + "/" + file);

/* ---------- Menu (zwevende balk bovenaan) ---------- */
function buildMenu() {
  const menu = document.createElement("div");
  menu.className = "menu";
  menu.innerHTML = `
    <div class="menu-bar">
      <a class="menu-home" href="index.html">Inspiratiearchief</a>
      <button class="menu-toggle" aria-expanded="false">
        <span class="menu-count">${pad(pages.length)}</span>
        <span>Menu</span>
        <span class="dots"><i></i><i></i></span>
      </button>
    </div>
    <div class="menu-panel">
      <p class="menu-intro">An archive of images, objects and ideas — collected by Mick van der Woord.</p>
      <nav class="menu-links">
        ${pages.map((p, i) => `
          <a href="${p.page}" class="${p.slug === current ? "active" : ""}">
            <span>${pad(i + 1)} ${p.title}</span><span>${p.images.length}</span>
          </a>`).join("")}
      </nav>
    </div>`;
  document.body.prepend(menu);

  const toggle = menu.querySelector(".menu-toggle");
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  document.addEventListener("click", e => {
    if (!menu.contains(e.target)) menu.classList.remove("open");
  });
}

/* ---------- Homepagina ---------- */
function buildHome() {
  const list = document.getElementById("index-list");
  const preview = document.getElementById("hover-preview");
  const previewImg = preview.querySelector("img");

  pages.forEach((p, i) => {
    const row = document.createElement("a");
    row.className = "index-row";
    row.href = p.page;
    row.innerHTML = `
      <span class="index-num">${pad(i + 1)}</span>
      <span class="index-title">${p.title}</span>
      <span class="index-sub">${p.subtitle}</span>
      <span class="index-thumbs">
        ${p.images.slice(0, 4).map(f => `<span class="thumb"><img src="${src(p, f)}" alt="" loading="lazy"></span>`).join("")}
      </span>
      <span class="index-count">${p.images.length} img</span>
      <span class="index-arrow">→</span>`;

    row.addEventListener("mouseenter", () => {
      previewImg.src = src(p, p.images[0]);
      preview.classList.add("show");
    });
    row.addEventListener("mouseleave", () => preview.classList.remove("show"));
    row.addEventListener("mousemove", e => {
      preview.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 120}px)`;
    });
    list.appendChild(row);
  });

  // Hero: één beeld per pagina
  const hero = document.getElementById("hero-covers");
  pages.forEach(p => {
    const a = document.createElement("a");
    a.href = p.page;
    a.className = "hero-cover";
    a.innerHTML = `<img src="${src(p, p.images[0])}" alt=""><span>${p.title}</span>`;
    hero.appendChild(a);
  });
}

/* ---------- Beeldpagina ---------- */
function buildGallery(p) {
  const idx = pages.indexOf(p);
  document.title = `${p.title} — Inspiratiearchief`;
  document.getElementById("page-num").textContent = pad(idx + 1);
  document.getElementById("page-title").textContent = p.title;
  document.getElementById("page-sub").textContent = p.subtitle;
  document.getElementById("page-count").textContent = `${p.images.length} images`;

  const grid = document.getElementById("gallery");
  const reset = document.createElement("button");
  reset.className = "reset-layout";
  reset.textContent = "Reset layout";
  reset.hidden = true;
  document.getElementById("page-count").appendChild(reset);

  p.images.forEach((f, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.innerHTML = `
      <span class="cell-img"><img src="${src(p, f)}" alt="" loading="lazy" draggable="false"></span>
      <span class="cell-label"><span>${pad(i + 1)}</span><span>${p.title}</span></span>`;
    makeDraggable(cell.querySelector("img"), () => openLightbox(p, i), () => (reset.hidden = false));
    grid.appendChild(cell);
  });

  reset.addEventListener("click", () => {
    grid.querySelectorAll(".cell-img img").forEach(img => {
      img.style.setProperty("--x", "0px");
      img.style.setProperty("--y", "0px");
      img.dataset.x = img.dataset.y = 0;
    });
    reset.hidden = true;
  });

  const next = pages[(idx + 1) % pages.length];
  const nextLink = document.getElementById("next-page");
  nextLink.href = next.page;
  nextLink.querySelector(".next-title").textContent = next.title;
}

/* ---------- Slepen ---------- */
// Sleep een afbeelding vrij over de pagina. Een klik zonder te slepen opent de lightbox.
let topZ = 10;

function makeDraggable(img, onClick, onMove) {
  img.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    e.preventDefault();
    img.setPointerCapture(e.pointerId);
    const startX = e.clientX, startY = e.clientY;
    const baseX = +img.dataset.x || 0, baseY = +img.dataset.y || 0;
    let moved = false;
    img.style.zIndex = ++topZ;

    const move = ev => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      img.classList.add("dragging");
      img.dataset.x = baseX + dx;
      img.dataset.y = baseY + dy;
      img.style.setProperty("--x", img.dataset.x + "px");
      img.style.setProperty("--y", img.dataset.y + "px");
    };
    const up = () => {
      img.removeEventListener("pointermove", move);
      img.removeEventListener("pointerup", up);
      img.removeEventListener("pointercancel", up);
      img.classList.remove("dragging");
      if (moved) onMove();
      else onClick();
    };
    img.addEventListener("pointermove", move);
    img.addEventListener("pointerup", up);
    img.addEventListener("pointercancel", up);
  });
}

/* ---------- Lightbox ---------- */
let lb, lbImg, lbCount, lbPage, lbIndex;

function openLightbox(p, i) {
  if (!lb) {
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML = `
      <button class="lb-close">Close ×</button>
      <button class="lb-prev">←</button>
      <img alt="">
      <button class="lb-next">→</button>
      <span class="lb-count"></span>`;
    document.body.appendChild(lb);
    lbImg = lb.querySelector("img");
    lbCount = lb.querySelector(".lb-count");
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
  lbPage = p;
  lbIndex = i;
  showLightbox();
  lb.classList.add("show");
  document.body.style.overflow = "hidden";
}

function showLightbox() {
  lbImg.src = src(lbPage, lbPage.images[lbIndex]);
  lbCount.textContent = `${pad(lbIndex + 1)} / ${pad(lbPage.images.length)}`;
}

function step(d) {
  const n = lbPage.images.length;
  lbIndex = (lbIndex + d + n) % n;
  showLightbox();
}

function closeLightbox() {
  lb.classList.remove("show");
  document.body.style.overflow = "";
}

/* ---------- Start ---------- */
buildMenu();
if (current === "home") {
  buildHome();
} else {
  const p = pages.find(x => x.slug === current);
  if (p) buildGallery(p);
}
document.querySelectorAll(".to-top").forEach(b =>
  b.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }))
);
