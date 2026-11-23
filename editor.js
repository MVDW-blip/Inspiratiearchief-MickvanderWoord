// Bewerken op de site: teksten en beelden aanpassen en met één klik opslaan op GitHub.
//
// - De Edit-knop verschijnt alleen in een browser waarin een GitHub-sleutel (token) staat.
//   Sleutel instellen: zet #edit achter het adres van een pagina, bijv. .../24days.html#edit
// - In de Edit-stand: klik op een titel, vraag of tekst om hem te veranderen; bij elk beeld staan
//   ← → (verschuiven) en ✕ (van de pagina halen); onderaan elk raster "+ Add images" (of sleep ze erop).
// - "Save" maakt één commit op main (data.js + nieuwe beelden). GitHub Pages zet het binnen 1–3 minuten online.
//   Alleen wat je zelf hebt aangeraakt wordt overschreven; wat er intussen op GitHub is veranderd blijft staan.
// - Een beeld dat je weghaalt verdwijnt alleen van de pagina; het bestand blijft in de map staan.
//
// Dit bestand moet vóór app.js geladen worden (het zet zo nodig de net opgeslagen versie klaar).

(() => {
  const REPO = "MVDW-blip/Inspiratiearchief-MickvanderWoord";
  const API = "https://api.github.com/repos/" + REPO;
  const TOKEN_KEY = "ia-github-token";
  const PENDING_KEY = "ia-pending-save";
  const PENDING_MS = 15 * 60 * 1000; // zo lang laat deze browser de net opgeslagen versie zien
  const MAX_SIDE = 2400;             // grotere foto's worden bij het toevoegen verkleind
  const MAX_BYTES = 50e6;

  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
    del: k => { try { localStorage.removeItem(k); } catch {} },
  };
  const token = () => store.get(TOKEN_KEY);
  const encodePath = p => p.split("/").map(encodeURIComponent).join("/");

  /* ---------- 1. Net opgeslagen? Laat die versie alvast zien ---------- */
  // GitHub Pages bewaart data.js een paar minuten; zonder dit zou je na het opslaan en herladen
  // nog even de oude versie zien. Alleen in deze browser, alleen met sleutel, maximaal 15 minuten.
  window.IA_PENDING = {};
  try {
    const p = JSON.parse(store.get(PENDING_KEY) || "null");
    if (p && token() && Date.now() - p.at < PENDING_MS &&
        JSON.stringify(window.COLLECTIONS) !== JSON.stringify(p.data)) {
      window.COLLECTIONS = p.data;
      p.files.forEach(path => (window.IA_PENDING[path] = `https://raw.githubusercontent.com/${REPO}/${p.sha}/${encodePath(path)}`));
    } else if (p) store.del(PENDING_KEY);
  } catch { store.del(PENDING_KEY); }

  /* ---------- 2. Bewerken (na het opbouwen van de pagina) ---------- */
  const dirty = new Set();       // "slug.title", "slug.question", "slug.text", "slug.link.<url>", "slug.images"
  const uploads = new Map();     // pad in de repo → Blob (nog niet opgeslagen)
  const removed = new Map();     // slug → Set van weggehaalde bestanden
  let editing = false, busy = false, editBtn, bar;

  document.addEventListener("DOMContentLoaded", () => {
    const IA = window.IA;
    if (!IA || !IA.editable) return;
    if (location.hash === "#edit") {
      history.replaceState(null, "", location.pathname + location.search);
      openSetup();
    }
    if (token()) addEditButton();
  });

  const coll = slug => window.IA.all.find(c => c.slug === slug);
  const sections = () => window.IA.all.filter(c => (c.page || "themas") === window.IA.current);
  const changes = () => dirty.size + uploads.size;

  function addEditButton() {
    if (editBtn) return;
    editBtn = tool("Edit", "✎", () => setEditing(!editing));
    editBtn.classList.add("tool-edit");
    editBtn.setAttribute("aria-pressed", false);
    document.querySelector(".toolbar")?.prepend(editBtn);
    bar = document.createElement("div");
    bar.className = "ed-bar";
    bar.innerHTML = `
      <span class="ed-status"></span>
      <button class="ed-discard" type="button">Discard</button>
      <button class="ed-save" type="button">Save</button>
      <button class="ed-key" type="button" title="GitHub-sleutel">Key</button>`;
    bar.querySelector(".ed-save").onclick = () => save();
    bar.querySelector(".ed-discard").onclick = () => {
      if (!changes() || confirm("Discard all changes that are not saved yet?")) { dirty.clear(); uploads.clear(); location.reload(); }
    };
    bar.querySelector(".ed-key").onclick = openSetup;
    document.body.append(bar);
    sections().forEach(c => decorate(document.getElementById(c.slug), c));
    updateBar();
    addEventListener("beforeunload", e => { if (changes() && !busy) { e.preventDefault(); e.returnValue = ""; } });
  }

  function setEditing(on) {
    if (on) window.IA.reset(); // alles terug in het raster, Transparent en Invert uit
    editing = on;
    document.body.classList.toggle("editing", on);
    document.querySelectorAll("[data-edit]").forEach(el => (el.contentEditable = on ? "plaintext-only" : "false"));
    editBtn.querySelector("span").textContent = on ? "Done" : "Edit";
    editBtn.setAttribute("aria-pressed", on);
    updateBar();
  }

  function setStatus(text, kind = "") {
    const s = bar.querySelector(".ed-status");
    s.textContent = text;
    s.dataset.kind = kind;
  }

  function updateBar(msg) {
    if (!bar) return;
    const n = changes();
    bar.classList.toggle("show", editing || n > 0 || !!msg || busy);
    bar.querySelector(".ed-save").disabled = !n || busy;
    bar.querySelector(".ed-discard").disabled = !n || busy;
    if (msg) return setStatus(msg.text, msg.kind);
    if (busy) return;
    setStatus(n ? `${n} change${n > 1 ? "s" : ""} not saved yet` : "Click a text to change it · ← → ✕ on images · + Add images");
  }

  // een stuk opnieuw opbouwen na een wijziging in de beelden
  function rebuild(c) {
    const old = document.getElementById(c.slug);
    const sec = window.IA.buildSection(c);
    old.replaceWith(sec);
    decorate(sec, c);
    if (editing) sec.querySelectorAll("[data-edit]").forEach(el => (el.contentEditable = "plaintext-only"));
  }

  /* ---------- Teksten ---------- */
  function wireText(el, c) {
    const key = el.dataset.edit;
    const multi = /\.(question|text)$/.test(key); // in vraag en tekst maakt Enter een nieuwe regel
    let dirtyKey = key;
    const link = key.match(/\.link\.(\d+)$/);
    if (link) dirtyKey = `${c.slug}.link.${(c.links || [])[+link[1]]?.url}`;
    el.addEventListener("input", () => {
      const v = el.innerText.replace(/ /g, " ").replace(/\n{3,}/g, "\n\n").trim();
      el._apply(v);
      dirty.add(dirtyKey);
      updateBar();
    });
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" && (!multi || e.metaKey || e.ctrlKey)) { e.preventDefault(); el.blur(); }
      if (e.key === "Escape") el.blur();
    });
  }

  /* ---------- Beelden: verschuiven, weghalen, toevoegen ---------- */
  function decorate(sec, c) {
    if (!sec) return;
    sec.querySelectorAll("[data-edit]").forEach(el => wireText(el, c));
    const grid = sec.querySelector(".gallery:not(.link-gallery)");
    if (!grid) return;
    grid.querySelectorAll(":scope > .cell").forEach(cell => {
      const i = +cell.dataset.order, f = c.images[i];
      if (uploads.has(c.folder + "/" + f)) cell.classList.add("ed-new");
      const ctl = document.createElement("div");
      ctl.className = "ed-cell";
      ctl.innerHTML = `
        <button type="button" data-a="-1" title="Move left" ${i === 0 ? "disabled" : ""}>←</button>
        <button type="button" data-a="1" title="Move right" ${i === c.images.length - 1 ? "disabled" : ""}>→</button>
        <button type="button" data-a="x" title="Remove from page">✕</button>`;
      ctl.addEventListener("click", e => {
        const a = e.target.closest("button")?.dataset.a;
        if (!a) return;
        e.stopPropagation();
        if (a === "x") removeImage(c, i);
        else moveImage(c, i, +a);
      });
      cell.append(ctl);
    });
    const add = document.createElement("label");
    add.className = "ed-add";
    add.innerHTML = `<input type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime,.heic,.heif" hidden>
      <span>+ Add images</span><small>or drop them here</small>`;
    add.querySelector("input").addEventListener("change", e => { addFiles(c, [...e.target.files]); e.target.value = ""; });
    grid.append(add);
    // bestanden erop slepen (op het hele raster)
    grid.addEventListener("dragover", e => { if (!editing) return; e.preventDefault(); add.classList.add("drag"); });
    grid.addEventListener("dragleave", e => { if (!grid.contains(e.relatedTarget)) add.classList.remove("drag"); });
    grid.addEventListener("drop", e => {
      if (!editing) return;
      e.preventDefault();
      add.classList.remove("drag");
      addFiles(c, [...e.dataTransfer.files]);
    });
  }

  function moveImage(c, i, d) {
    const j = i + d;
    if (j < 0 || j >= c.images.length) return;
    [c.images[i], c.images[j]] = [c.images[j], c.images[i]];
    dirty.add(c.slug + ".images");
    rebuild(c);
    updateBar();
  }

  function removeImage(c, i) {
    const [f] = c.images.splice(i, 1);
    const path = c.folder + "/" + f;
    if (uploads.has(path)) { uploads.delete(path); URL.revokeObjectURL(window.IA_PENDING[path]); delete window.IA_PENDING[path]; }
    else { if (!removed.has(c.slug)) removed.set(c.slug, new Set()); removed.get(c.slug).add(f); }
    dirty.add(c.slug + ".images");
    rebuild(c);
    updateBar();
  }

  // de submap waar de beelden van dit stuk al staan (bij de 24 days: dag12/ enz.)
  function dirFor(c) {
    const dirs = new Set(c.images.map(f => (f.includes("/") ? f.slice(0, f.lastIndexOf("/") + 1) : "")));
    if (dirs.size === 1) return [...dirs][0];
    if (!c.images.length && c.folder === "images/24days") return c.slug + "/";
    return "";
  }

  const cleanName = n => n.normalize("NFC").replace(/­/g, "").replace(/[\/\\#?%"<>|:*]/g, "-").replace(/\s+/g, " ").trim() || "beeld";

  function uniquePath(c, rel, taken) {
    const dot = rel.lastIndexOf(".");
    const base = dot > 0 ? rel.slice(0, dot) : rel, ext = dot > 0 ? rel.slice(dot) : "";
    let k = 1, r = rel;
    while (taken(c.folder + "/" + r)) r = `${base}-${++k}${ext}`;
    return r;
  }
  const inData = path => window.IA.all.some(o => o.images.some(f => o.folder + "/" + f === path)) || uploads.has(path);

  async function addFiles(c, files) {
    if (!files.length) return;
    const skipped = [];
    updateBar({ text: `Adding ${files.length} file${files.length > 1 ? "s" : ""}…` });
    for (const file of files) {
      let blob = file, name = cleanName(file.name);
      const type = (file.type || "").toLowerCase();
      if (/hei[cf]/.test(type) || /\.hei[cf]$/i.test(name)) {
        blob = await reencode(file, "image/jpeg");
        if (!blob) { skipped.push(`${name} (HEIC: export it as JPG first, or use Safari)`); continue; }
        name = name.replace(/\.hei[cf]$/i, ".jpg");
      } else if (/^image\/(jpeg|png|webp)$/.test(type)) {
        blob = (await shrink(file, type)) || file;
      } else if (!/^image\/(gif|svg\+xml|avif)$|^video\/(mp4|webm|quicktime)$/.test(type)) {
        skipped.push(`${name} (not an image or video)`); continue;
      }
      if (blob.size > MAX_BYTES) { skipped.push(`${name} (larger than 50 MB)`); continue; }
      const rel = uniquePath(c, dirFor(c) + name, inData);
      const path = c.folder + "/" + rel;
      uploads.set(path, blob);
      window.IA_PENDING[path] = URL.createObjectURL(blob);
      c.images.push(rel);
    }
    dirty.add(c.slug + ".images");
    rebuild(c);
    updateBar(skipped.length ? { text: "Skipped: " + skipped.join(" · "), kind: "error" } : undefined);
  }

  // grote foto's verkleinen (langste kant MAX_SIDE), zelfde bestandstype
  async function shrink(file, type) {
    try {
      const bmp = await createImageBitmap(file);
      const k = MAX_SIDE / Math.max(bmp.width, bmp.height);
      if (k >= 1) { bmp.close(); return null; }
      return await draw(bmp, k, type);
    } catch { return null; }
  }
  async function reencode(file, type) {
    try { return await draw(await createImageBitmap(file), 1, type); } catch { return null; }
  }
  function draw(bmp, k, type) {
    const s = Math.min(k, MAX_SIDE / Math.max(bmp.width, bmp.height), 1);
    const cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
    cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    bmp.close();
    return new Promise(res => cv.toBlob(res, type, 0.88));
  }

  /* ---------- Opslaan op GitHub ---------- */
  async function gh(path, opt = {}) {
    const res = await fetch(API + path, {
      method: opt.method || "GET",
      cache: "no-store",
      headers: {
        Authorization: "Bearer " + token(),
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opt.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opt.body ? JSON.stringify(opt.body) : undefined,
    });
    if (!res.ok) {
      let msg = "";
      try { msg = (await res.json()).message; } catch {}
      const err = new Error(`${res.status} ${msg}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  const toBase64 = blob => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  const fromBase64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), ch => ch.charCodeAt(0)));

  function parseData(text) {
    const i = text.indexOf("window.COLLECTIONS");
    if (i < 0) throw new Error("data.js on GitHub could not be read");
    const body = text.slice(i).replace(/^window\.COLLECTIONS\s*=\s*/, "").trim().replace(/;$/, "");
    return { head: text.slice(0, i), data: JSON.parse(body) };
  }

  // Zet alleen wat in deze browser is veranderd over op de nieuwste versie van GitHub
  function merge(remote) {
    for (const key of dirty) {
      const slug = key.split(".")[0], c = coll(slug);
      let r = remote.find(o => o.slug === slug);
      if (!c) continue;
      if (!r) { remote.push(JSON.parse(JSON.stringify(c))); continue; } // helemaal nieuw
      const field = key.slice(slug.length + 1);
      if (field === "title" || field === "question" || field === "text") r[field] = c[field];
      else if (field.startsWith("link.")) {
        const url = field.slice(5), l = (c.links || []).find(x => x.url === url), rl = (r.links || []).find(x => x.url === url);
        if (l && rl) rl.title = l.title;
      } else if (field === "images") {
        const gone = removed.get(slug) || new Set();
        const mine = c.images;
        const theirs = r.images.filter(f => !mine.includes(f) && !gone.has(f)); // intussen op GitHub toegevoegd
        r.images = [...mine, ...theirs];
      }
    }
    return remote;
  }

  async function save(retry = true) {
    if (busy || !changes()) return;
    busy = true;
    updateBar({ text: "Saving…" });
    try {
      const ref = await gh("/git/ref/heads/main");
      const head = ref.object.sha;
      const commit = await gh(`/git/commits/${head}`);
      const tree = await gh(`/git/trees/${commit.tree.sha}?recursive=1`);
      const exists = new Set(tree.tree.map(t => t.path));

      // bestaat een nieuwe bestandsnaam al in de repo? dan krijgt hij -2, -3 …
      for (const [path, blob] of [...uploads]) {
        if (!exists.has(path)) continue;
        const c = window.IA.all.find(o => o.images.some(f => o.folder + "/" + f === path));
        const old = path.slice(c.folder.length + 1);
        const rel = uniquePath(c, old, p => exists.has(p) || (p !== path && inData(p)));
        const np = c.folder + "/" + rel;
        c.images[c.images.indexOf(old)] = rel;
        uploads.delete(path); uploads.set(np, blob);
        window.IA_PENDING[np] = window.IA_PENDING[path]; delete window.IA_PENDING[path];
      }

      const file = await gh(`/contents/data.js?ref=${head}`);
      const { head: header, data } = parseData(fromBase64(file.content));
      const merged = merge(data);

      const entries = [];
      let n = 0;
      for (const [path, blob] of uploads) {
        updateBar({ text: `Uploading ${++n} / ${uploads.size}…` });
        const b = await gh("/git/blobs", { method: "POST", body: { content: await toBase64(blob), encoding: "base64" } });
        entries.push({ path, mode: "100644", type: "blob", sha: b.sha });
      }
      updateBar({ text: "Saving…" });
      const text = header + "window.COLLECTIONS = " + JSON.stringify(merged, null, 2) + ";\n";
      entries.push({ path: "data.js", mode: "100644", type: "blob", content: text });

      const names = [...new Set([...dirty].map(k => coll(k.split(".")[0])?.title || k.split(".")[0]))];
      const newTree = await gh("/git/trees", { method: "POST", body: { base_tree: commit.tree.sha, tree: entries } });
      const newCommit = await gh("/git/commits", { method: "POST", body: {
        message: `Bewerkt op de site: ${names.join(", ")}` + (uploads.size ? ` (${uploads.size} nieuw${uploads.size > 1 ? "e beelden" : " beeld"})` : ""),
        tree: newTree.sha, parents: [head],
      } });
      try {
        await gh("/git/refs/heads/main", { method: "PATCH", body: { sha: newCommit.sha, force: false } });
      } catch (e) {
        // intussen is er iets anders op main gezet: nog één keer, bovenop die nieuwe versie
        if (retry && (e.status === 422 || e.status === 409)) { busy = false; return save(false); }
        throw e;
      }
      // de branch presentatie gaat mee als hij gelijk liep met main
      try {
        const pr = await gh("/git/ref/heads/presentatie");
        if (pr.object.sha === head) await gh("/git/refs/heads/presentatie", { method: "PATCH", body: { sha: newCommit.sha, force: false } });
      } catch {}

      store.set(PENDING_KEY, JSON.stringify({ at: Date.now(), sha: newCommit.sha, data: merged, files: [...uploads.keys()] }));
      dirty.clear(); uploads.clear(); removed.clear();
      busy = false;
      sections().forEach(c => rebuild(c)); // "new"-labels weg
      updateBar({ text: "Saved ✓ — live on the site in 1–3 minutes", kind: "ok" });
    } catch (e) {
      busy = false;
      if (e.status === 401) {
        updateBar({ text: "The GitHub key doesn't work (anymore). Set a new one via Key.", kind: "error" });
      } else if (e.status === 403 || e.status === 404) {
        updateBar({ text: "This key can't write to the site. On GitHub, give it Contents: Read and write.", kind: "error" });
      } else {
        updateBar({ text: "Not saved: " + e.message + " — try again", kind: "error" });
      }
    }
  }

  /* ---------- Sleutel instellen ---------- */
  function openSetup() {
    document.querySelector(".ed-setup")?.remove();
    const has = !!token();
    const d = document.createElement("div");
    d.className = "ed-setup";
    d.innerHTML = `
      <div class="ed-panel" role="dialog" aria-label="Edit the site">
        <h3>Edit the site</h3>
        ${has ? `<p>This browser has a GitHub key. The <b>Edit</b> button is in the toolbar.</p>
          <p><button type="button" class="ed-forget">Remove the key from this browser</button></p>` : `
        <p>Saving goes straight to GitHub, so this browser needs a key once.</p>
        <ol>
          <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → new fine-grained token ↗</a></li>
          <li>Repository access: <b>Only select repositories</b> → <b>Inspiratiearchief-MickvanderWoord</b></li>
          <li>Permissions → Repository permissions → <b>Contents: Read and write</b></li>
          <li>Generate, copy the key and paste it here:</li>
        </ol>
        <p><input type="password" class="ed-token" placeholder="github_pat_…" autocomplete="off" spellcheck="false"></p>
        <p class="ed-msg"></p>
        <p><button type="button" class="ed-connect">Connect</button></p>
        <p class="ed-small">The key is only stored in this browser. Anyone with the key can change the site — don't share it.</p>`}
        <button type="button" class="ed-close" aria-label="Close">Close ×</button>
      </div>`;
    document.body.append(d);
    const close = () => d.remove();
    d.querySelector(".ed-close").onclick = close;
    d.addEventListener("click", e => { if (e.target === d) close(); });
    d.querySelector(".ed-forget")?.addEventListener("click", () => {
      store.del(TOKEN_KEY); store.del(PENDING_KEY);
      location.reload();
    });
    const btn = d.querySelector(".ed-connect");
    if (!btn) return;
    const input = d.querySelector(".ed-token"), msg = d.querySelector(".ed-msg");
    input.focus();
    input.addEventListener("keydown", e => { if (e.key === "Enter") btn.click(); });
    btn.onclick = async () => {
      const t = input.value.trim();
      if (!t) return;
      msg.textContent = "Checking…";
      try {
        const res = await fetch(API, { headers: { Authorization: "Bearer " + t, Accept: "application/vnd.github+json" }, cache: "no-store" });
        if (!res.ok) throw new Error(res.status === 401 ? "This key isn't valid." : "This key has no access to Inspiratiearchief-MickvanderWoord.");
        store.set(TOKEN_KEY, t);
        close();
        addEditButton();
        setEditing(true);
      } catch (e) {
        msg.textContent = e.message || "Could not reach GitHub.";
      }
    };
  }

  // om te testen
  window.IA_EDITOR = { addFiles: (slug, files) => addFiles(coll(slug), files), save, setEditing, merge, parseData };
})();
