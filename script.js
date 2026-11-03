// Laadt data/items.json en bouwt de galerij + filters.
// Nieuw item toevoegen? Zet de afbeelding in /images en voeg een regel toe in data/items.json.
// Item met een "link" veld wordt klikbaar/hoverbaar naar die pagina.

const grid = document.getElementById("grid");
const filtersEl = document.getElementById("filters");
const emptyMsg = document.getElementById("empty-msg");

let items = [];
let activeTag = null;

function render() {
  const visible = activeTag
    ? items.filter(it => (it.tags || []).includes(activeTag))
    : items;

  grid.innerHTML = "";
  emptyMsg.hidden = visible.length > 0;

  visible.forEach(it => {
    const card = document.createElement(it.link ? "a" : "div");
    card.className = "card";
    if (it.link) card.href = it.link;

    const img = document.createElement("img");
    img.src = "images/" + it.image;
    img.alt = it.title || "";
    img.loading = "lazy";
    card.appendChild(img);

    if (it.link) {
      const overlay = document.createElement("div");
      overlay.className = "card-overlay";
      overlay.textContent = "Bekijk →";
      card.appendChild(overlay);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    if (it.title) {
      const t = document.createElement("p");
      t.className = "card-title";
      t.textContent = it.title;
      body.appendChild(t);
    }

    if (it.note) {
      const n = document.createElement("p");
      n.className = "card-note";
      n.textContent = it.note;
      body.appendChild(n);
    }

    if (it.tags && it.tags.length) {
      const tagsEl = document.createElement("div");
      tagsEl.className = "card-tags";
      it.tags.forEach(tag => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = tag;
        tagsEl.appendChild(span);
      });
      body.appendChild(tagsEl);
    }

    card.appendChild(body);
    grid.appendChild(card);
  });
}

function renderFilters() {
  const allTags = [...new Set(items.flatMap(it => it.tags || []))].sort();
  filtersEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "filter-btn" + (activeTag === null ? " active" : "");
  allBtn.textContent = "Alles";
  allBtn.onclick = () => { activeTag = null; renderFilters(); render(); };
  filtersEl.appendChild(allBtn);

  allTags.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (activeTag === tag ? " active" : "");
    btn.textContent = tag;
    btn.onclick = () => { activeTag = tag; renderFilters(); render(); };
    filtersEl.appendChild(btn);
  });
}

fetch("data/items.json")
  .then(r => r.json())
  .then(data => {
    items = data.sort((a, b) => (b.added || "").localeCompare(a.added || ""));
    renderFilters();
    render();
  })
  .catch(() => {
    emptyMsg.hidden = false;
  });
