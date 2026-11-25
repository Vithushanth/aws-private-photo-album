/* Private album for two
   ---------------------------------------------------------------
   Settings you will want to change are in this first block. */
const API = "/api";
const SECRET_WORD = "change-me";                   // a playful extra step. Real security is the sign-in in front of the site.
const TOGETHER_SINCE = new Date(2024, 0, 1);       // 1 January 2024 (months count from 0)
const PEOPLE = { one: "Alex", two: "Sam" };        // the ids "one" and "two" must match the Lambda function
const TERMS = [                                    // shown on the lock screen; edit, add or remove lines freely
  "Be kind. This is a shared space.",
  "Caption your photos. Future you will thank you.",
  "These terms may change without notice.",
];
const FIXED_DATES = [                              // always shown on the Us page, every year
  { title: "Our anniversary", month: 1, day: 1 },
  { title: "Alex's birthday", month: 3, day: 14 },
  { title: "Sam's birthday", month: 9, day: 2 },
];

/* ---------- tiny helpers ---------- */
const $ = (id) => document.getElementById(id);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k in el && k !== "list") { try { el[k] = v; } catch { el.setAttribute(k, v); } }
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  json(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
};
const ICONS = {
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  prev: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  note: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
  grid: '<rect x="4" y="4" width="7" height="9"/><rect x="13" y="4" width="7" height="5"/><rect x="13" y="11" width="7" height="9"/><rect x="4" y="15" width="7" height="5"/>',
  cal: '<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  film: '<rect x="3" y="6" width="13" height="12"/><path d="M16 10l5-3v10l-5-3z"/>',
  us: '<circle cx="8.5" cy="9" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M3 19c.6-3 2.7-4.5 5.5-4.5S13.400 16 14 19M15 15c2.600 0 4.300 1.200 5 4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  stack: '<rect x="4" y="9" width="16" height="11"/><path d="M6.5 6h11M9 3h6"/>',
};
function icon(name) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
  s.innerHTML = ICONS[name] || "";
  return s;
}
function setIcon(el, name) { el.replaceChildren(icon(name)); }

function toast(msg, ms = 2600) {
  const t = h("div", { class: "toast", text: msg });
  $("toasts").append(t);
  requestAnimationFrame(() => t.classList.add("is-in"));
  setTimeout(() => { t.classList.remove("is-in"); setTimeout(() => t.remove(), 300); }, ms);
}

/* ---------- dates ---------- */
const DAY = 86400000;
function daysTogether() { return Math.max(0, Math.floor((Date.now() - TOGETHER_SINCE) / DAY)); }
function spanTogether() {
  const now = new Date();
  let y = now.getFullYear() - TOGETHER_SINCE.getFullYear();
  let m = now.getMonth() - TOGETHER_SINCE.getMonth();
  let d = now.getDate() - TOGETHER_SINCE.getDate();
  if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
}
function nextAnniversary() {
  const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), TOGETHER_SINCE.getMonth(), TOGETHER_SINCE.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, TOGETHER_SINCE.getMonth(), TOGETHER_SINCE.getDate());
  return { days: Math.round((next - today) / DAY), years: next.getFullYear() - TOGETHER_SINCE.getFullYear() };
}
function parseWhen(s) {
  if (!s) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T12:00:00" : s);
  return isNaN(d) ? null : d;
}
const pad = (n) => String(n).padStart(2, "0");
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function itemDate(it) {
  const d = parseWhen(it.takenAt) || parseWhen(it.createdAt); if (d) return d;
  const m = /(\d{4})\/(\d{2})\//.exec(it.key || "");
  return m ? new Date(+m[1], +m[2] - 1, 1) : new Date(0);
}
const fmtDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
const fmtMonth = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
function ago(iso) {
  const d = new Date(iso); if (isNaN(d)) return "";
  const s = (Date.now() - d) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) { const n = Math.floor(s / 60); return `${n} minute${n > 1 ? "s" : ""} ago`; }
  if (s < 86400) { const n = Math.floor(s / 3600); return `${n} hour${n > 1 ? "s" : ""} ago`; }
  if (s < 172800) return `yesterday at ${fmtTime.format(d)}`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} days ago`;
  return fmtDay.format(d);
}
const plural = (n, one, many) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

/* ---------- state ---------- */
const S = {
  items: [], comments: [], messages: [], presence: {}, albums: [], hearts: [], dates: [], love: [], lovePerDay: 1000,
  param: "", favView: "mine",
  social: false,                    // true once the notes/comments/last-seen routes answer
  who: store.get("album_who", ""),
  favs: store.json("album_favorites", {}),
  route: "", query: "", kind: "all", sort: "new",
  listAt: 0, cols: 0,
};
const isVideo = (it) => it.type === "video" || (it.contentType || "").startsWith("video");
const favKey = (it) => it.key || it.url || "";
const heartOf = (it, who) => S.hearts.some((x) => x.id === it.id && x.who === who);
const isFav = (it) => (S.social && it.id ? heartOf(it, S.who) : !!S.favs[favKey(it)]);
const albumName = (id) => (S.albums.find((a) => a.id === id) || {}).name || "";
const other = () => (S.who === "one" ? "two" : "one");
const BIN = { items: null, loading: false };
const commentsFor = (it) => S.comments.filter((c) => c.key === it.key);

/* ---------- API ---------- */
async function api(path, opts) {
  const res = await fetch(API + path, opts);
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.includes("json")) { const err = new Error(`${path} ${res.status}`); err.status = res.status; throw err; }
  return res.json();
}
const post = (path, body) => api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function loadList() {
  const data = await api("/list");
  S.items = (data.items || []).map((it) => ({ ...it, type: it.type || ((it.contentType || "").startsWith("video") ? "video" : "image") }));
  S.items.sort((a, b) => itemDate(b) - itemDate(a));
  S.listAt = Date.now();
}
async function loadSocial() {
  try {
    const p = S.who ? await post("/presence", { who: S.who }) : await api("/presence");
    S.presence = p.presence || {};
    const [c, m, a, hh, d, lv] = await Promise.all([api("/comments"), api("/messages"), api("/albums"), api("/hearts"), api("/dates"), api("/love").catch(() => ({ sends: [] }))]);
    S.love = lv.sends || []; S.lovePerDay = lv.perDay || 1000;
    S.comments = c.comments || []; S.messages = m.messages || [];
    S.albums = a.albums || []; S.hearts = hh.hearts || []; S.dates = d.dates || [];
    S.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    S.social = true;
    // Favourites saved on this device before hearts were shared: carry them over once.
    if (S.who && Object.keys(S.favs).length) {
      for (const it of S.items) if (S.favs[favKey(it)] && !heartOf(it, S.who)) { S.hearts.push({ id: it.id, who: S.who }); post("/hearts", { id: it.id, who: S.who, on: true }).catch(() => {}); }
      S.favs = {}; store.set("album_favorites", "{}");
    }
  } catch { S.social = false; }
  updateDots();
}
function unreadCount() {
  const seen = store.get("album_notes_seen", "");
  return S.messages.filter((m) => m.author !== S.who && (!seen || m.createdAt > seen)).length;
}
function updateDots() {
  const on = S.social && unreadCount() > 0 && S.route !== "us";
  $("navDot").hidden = !on; $("tabDot").hidden = !on;
}

/* ---------- theme and song ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]').content = t === "dark" ? "#0f1513" : "#f5f6f3";
  setIcon($("themeBtn"), t === "dark" ? "sun" : "moon");
}
function initSong() {
  const audio = $("song"), btn = $("musicBtn");
  setIcon(btn, "note");
  const set = (on) => { btn.setAttribute("aria-pressed", on); btn.setAttribute("aria-label", on ? "Pause our song" : "Play our song"); };
  btn.addEventListener("click", async () => {
    if (audio.paused) {
      try { audio.volume = 0.5; await audio.play(); set(true); store.set("album_music", "on"); }
      catch { toast("The song couldn't play. Check song.mp3 is uploaded."); }
    } else { audio.pause(); set(false); store.set("album_music", "off"); }
  });
}

/* ---------- tiles and grid ---------- */
function mediaEl(it, big) {
  if (isVideo(it)) {
    return h("video", big
      ? { src: it.url, controls: true, autoplay: true, playsInline: true }
      : { src: it.url + "#t=0.1", muted: true, playsInline: true, preload: "metadata", tabIndex: -1 });
  }
  return h("img", { src: it.url, alt: it.caption || "Photo from our album", loading: big ? "eager" : "lazy", decoding: "async" });
}
function tile(it, list) {
  const n = S.social ? commentsFor(it).length : 0;
  const fav = h("button", { class: "tile__fav" + (isFav(it) ? " is-on" : ""), "aria-label": isFav(it) ? "Remove from favourites" : "Add to favourites", "aria-pressed": String(isFav(it)),
    onclick: (e) => { e.stopPropagation(); toggleFav(it); } }, icon("heart"));
  return h("figure", { class: "tile" + (isVideo(it) ? " tile--film" : "") },
    h("button", { class: "tile__open", "aria-label": (isVideo(it) ? "Play film: " : "Open photo: ") + (it.caption || fmtDay.format(itemDate(it))), onclick: () => openViewer(it, list) },
      mediaEl(it), isVideo(it) && h("span", { class: "tile__play" }, icon("play"))),
    fav,
    (it.caption || n > 0) && h("figcaption", {},
      it.caption && h("span", { class: "tile__cap", text: it.caption }),
      n > 0 && h("span", { class: "tile__n", title: plural(n, "comment", "comments") }, icon("chat"), String(n))),
    S.social && heartOf(it, other()) && h("span", { class: "tile__theirs", title: `${PEOPLE[other()]} loves this` }, icon("heart"), PEOPLE[other()][0]));
}
function colCount() {
  const w = window.innerWidth;
  return w >= 1180 ? 4 : w >= 760 ? 3 : 2;
}
function grid(list, cols) {
  const n = cols || colCount();
  const columns = Array.from({ length: n }, () => h("div", { class: "grid__col" }));
  list.forEach((it, i) => columns[i % n].append(tile(it, list)));
  return h("div", { class: "grid", style: `--cols:${n}` }, columns);
}
function empty(title, body, action) {
  return h("div", { class: "empty" }, h("h2", { text: title }), h("p", { text: body }), action);
}
function toggleFav(it) {
  const k = favKey(it); let on;
  if (S.social && it.id) {
    on = !heartOf(it, S.who);
    S.hearts = S.hearts.filter((x) => !(x.id === it.id && x.who === S.who));
    if (on) S.hearts.push({ id: it.id, who: S.who });
    post("/hearts", { id: it.id, who: S.who, on }).catch(() => toast("That heart didn't save. Check your connection and try again."));
  } else {
    if (S.favs[k]) delete S.favs[k]; else S.favs[k] = true;
    store.set("album_favorites", JSON.stringify(S.favs)); on = !!S.favs[k];
  }
  toast(on ? "Added to favourites" : "Removed from favourites", 1600);
  render(true);
  if (!$("viewer").hidden) paintViewer();
}

/* ---------- pages ---------- */
function visible() {
  const q = S.query.trim().toLowerCase();
  let list = S.items.filter((it) => (S.kind === "all" || (S.kind === "films") === isVideo(it)) && (!q || (it.caption || "").toLowerCase().includes(q)));
  if (S.sort === "old") list = [...list].reverse();
  return list;
}
function seg(options, value, onpick, label) {
  return h("div", { class: "seg", role: "group", "aria-label": label }, options.map(([v, text]) =>
    h("button", { text, "aria-pressed": String(v === value), onclick: () => onpick(v) })));
}
function pageAlbum() {
  const wrap = h("div", {});
  const photos = S.items.filter((it) => !isVideo(it));
  const pick = [...photos.filter(isFav), ...photos.filter((p) => !isFav(p))].slice(0, 3);
  const span = spanTogether();
  const spanText = [span.y && plural(span.y, "year", "years"), span.m && plural(span.m, "month", "months"), plural(span.d, "day", "days")].filter(Boolean).join(", ");

  const cover = h("section", { class: "cover" },
    h("div", { class: "cover__text" },
      h("h1", { class: "cover__title" }, PEOPLE.one, h("span", { class: "amp", text: "&" }), PEOPLE.two),
      h("p", { class: "cover__lede", text: `${todayLine()}Together ${spanText}. ${plural(S.items.length, "memory", "memories")} kept so far.` }),
      h("div", { class: "cover__acts" },
        h("button", { class: "btn btn--solid", text: "Play slideshow", disabled: !photos.length, onclick: () => openShow(visible().filter((i) => !isVideo(i))) }),
        S.social && h("a", { class: "btn btn--line", href: "#/hearts", text: "Send hearts" }),
        h("button", { class: "btn btn--line", text: "Surprise me", disabled: !S.items.length, onclick: () => { const l = S.items; openViewer(l[Math.floor(Math.random() * l.length)], l); } })),
      coverNote()),
    h("div", { class: "cover__art cover__art--" + pick.length }, pick.map((it, i) =>
      h("button", { class: "cover__ph cover__ph--" + (i + 1), "aria-label": "Open photo", onclick: () => openViewer(it, S.items) }, mediaEl(it)))));
  wrap.append(cover);

  const list = visible();
  const search = h("input", { type: "search", class: "search", placeholder: "Search captions", value: S.query, "aria-label": "Search captions",
    oninput: (e) => { S.query = e.target.value; paintResults(); } });
  wrap.append(h("div", { class: "bar" },
    h("h2", { class: "bar__title", text: "All photos" }),
    search,
    seg([["all", "All"], ["photos", "Photos"], ["films", "Films"]], S.kind, (v) => { S.kind = v; render(true); }, "Show"),
    seg([["new", "Newest"], ["old", "Oldest"]], S.sort, (v) => { S.sort = v; render(true); }, "Order")));
  const results = h("div", { id: "results" });
  wrap.append(results);
  function paintResults() {
    const l = visible();
    results.replaceChildren(l.length ? grid(l)
      : S.items.length ? empty("Nothing matches", "No caption contains that. Try a different word.")
      : empty("The album is empty", "Add your first photos to start it.", addButton()));
  }
  paintResults();
  return wrap;
}
function coverNote() {
  if (!S.social) return null;
  const last = [...S.messages].reverse().find((m) => m.author !== S.who);
  const seen = S.presence[other()];
  if (!last && !seen) return null;
  return h("a", { class: "cover__note", href: "#/us" },
    last ? [h("span", { class: "cover__quote", text: last.text }), h("span", { class: "cover__by", text: `${PEOPLE[last.author] || "Someone"}, ${ago(last.createdAt)}` })]
         : h("span", { class: "cover__by", text: `${PEOPLE[other()]} was last here ${ago(seen)}` }));
}
function addButton() {
  return h("button", { class: "btn btn--solid", text: "Add photos", onclick: () => $("file").click() });
}
function pageTimeline() {
  const groups = new Map();
  for (const it of S.items) {
    const d = itemDate(it); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(k)) groups.set(k, { date: d, items: [] });
    groups.get(k).items.push(it);
  }
  const wrap = h("div", { class: "page" }, h("h1", { class: "page__title", text: "Timeline" }));
  if (!groups.size) { wrap.append(empty("Nothing here yet", "Months appear as you add photos.", addButton())); return wrap; }
  wrap.append(h("nav", { class: "jump", "aria-label": "Jump to month" }, [...groups].map(([k, g]) =>
    h("a", { href: "#/timeline", text: fmtMonth.format(g.date), onclick: (e) => { e.preventDefault(); $("m-" + k).scrollIntoView({ behavior: "smooth", block: "start" }); } }))));
  const cols = Math.max(2, colCount() - 1);
  for (const [k, g] of groups) {
    const films = g.items.filter(isVideo).length, photos = g.items.length - films;
    wrap.append(h("section", { class: "month", id: "m-" + k },
      h("header", { class: "month__head" },
        h("h2", { text: fmtMonth.format(g.date) }),
        h("p", { text: [photos && plural(photos, "photo", "photos"), films && plural(films, "film", "films")].filter(Boolean).join(" and ") })),
      grid(g.items, cols)));
  }
  return wrap;
}
function pageFilms() {
  const list = S.items.filter(isVideo);
  return h("div", { class: "page" }, h("h1", { class: "page__title", text: "Films" }),
    list.length ? h("div", { class: "films" }, list.map((it) => tile(it, list)))
      : empty("No films yet", "Videos you add to the album are collected here.", addButton()));
}
function pageFavourites() {
  const theirs = PEOPLE[other()];
  const list = !S.social ? S.items.filter(isFav)
    : S.items.filter((it) => S.favView === "mine" ? heartOf(it, S.who) : S.favView === "theirs" ? heartOf(it, other()) : heartOf(it, S.who) && heartOf(it, other()));
  const none = { mine: ["No favourites yet", "Tap the heart on any photo to keep it here."], theirs: [`${theirs} hasn't picked any yet`, "Photos they heart appear here."], both: ["Nothing you both picked yet", "Photos you have both hearted appear here."] }[S.social ? S.favView : "mine"];
  return h("div", { class: "page" },
    h("h1", { class: "page__title", text: "Favourites" }),
    h("p", { class: "page__lede", text: S.social ? "Hearts are shared, so you each see what the other loves." : "Favourites are saved on this device for now." }),
    h("div", { class: "page__acts" },
      S.social && seg([["mine", "Yours"], ["theirs", theirs + "'s"], ["both", "Both"]], S.favView, (v) => { S.favView = v; render(true); }, "Whose favourites"),
      h("button", { class: "btn btn--line", text: "Play as slideshow", disabled: !list.some((i) => !isVideo(i)), onclick: () => openShow(list.filter((i) => !isVideo(i))) })),
    list.length ? grid(list) : empty(none[0], none[1]));
}
function pageAlbums() {
  if (S.param) return pageAlbumOne(S.param);
  const wrap = h("div", { class: "page" }, h("h1", { class: "page__title", text: "Albums" }));
  if (!S.social) { wrap.append(h("p", { class: "muted", text: "Albums appear once the album's new back end is installed." })); return wrap; }
  const name = h("input", { type: "text", maxLength: 60, placeholder: "Name a new album", "aria-label": "New album name" });
  wrap.append(h("form", { class: "compose compose--line newalbum", onsubmit: async (e) => {
    e.preventDefault(); const v = name.value.trim(); if (!v) return;
    try { const r = await post("/albums", { name: v }); S.albums.push(r.album); toast("Album created"); location.hash = "#/albums/" + encodeURIComponent(r.album.id); }
    catch { toast("The album wasn't created. Check your connection and try again."); }
  } }, name, h("button", { class: "btn btn--solid", text: "Create album" })));
  if (!S.albums.length) { wrap.append(empty("No albums yet", "Name one above, then open any photo and choose it under Album.")); return wrap; }
  wrap.append(h("div", { class: "shelf" }, [...S.albums].reverse().map((a) => {
    const items = S.items.filter((i) => i.album === a.id), cover = items.find((i) => !isVideo(i)) || items[0];
    return h("a", { class: "shelf__item", href: "#/albums/" + encodeURIComponent(a.id) },
      h("span", { class: "shelf__cover" }, cover && mediaEl(cover)),
      h("span", { class: "shelf__name", text: a.name }),
      h("span", { class: "shelf__n", text: plural(items.length, "item", "items") }));
  })));
  return wrap;
}
function pageAlbumOne(id) {
  const a = S.albums.find((x) => x.id === id);
  if (!a) return h("div", { class: "page" }, empty("That album isn't here", "It may have been opened from an old link."), h("p", {}, h("a", { class: "link", href: "#/albums", text: "All albums" })));
  const list = S.items.filter((i) => i.album === id);
  const title = h("h1", { class: "page__title", text: a.name });
  const input = h("input", { type: "text", maxLength: 60, value: a.name, "aria-label": "Album name" });
  const form = h("form", { class: "compose compose--line newalbum", hidden: true, onsubmit: async (e) => {
    e.preventDefault(); const v = input.value.trim(); if (!v) return;
    try { await post("/albums", { id, name: v }); a.name = v; toast("Album renamed"); render(true); }
    catch { toast("The name didn't save. Check your connection and try again."); }
  } }, input, h("button", { class: "btn btn--solid", text: "Save name" }));
  return h("div", { class: "page" },
    h("p", { class: "crumb" }, h("a", { class: "link", href: "#/albums", text: "All albums" })),
    title, form,
    h("div", { class: "page__acts" },
      h("button", { class: "btn btn--line", text: "Play slideshow", disabled: !list.some((i) => !isVideo(i)), onclick: () => openShow(list.filter((i) => !isVideo(i))) }),
      h("button", { class: "btn btn--line", text: "Rename", onclick: () => { form.hidden = false; input.focus(); } })),
    list.length ? grid(list) : empty("Nothing in this album yet", "Open any photo and choose this album under Album, or pick it when you add new photos."));
}
/* ---------- dates ---------- */
/* ---------- hearts for each other ---------- */
const ukDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(d));
const num = (n) => n.toLocaleString("en-GB");
const heartsWord = (n) => `${num(n)} ${n === 1 ? "heart" : "hearts"}`;
const sentBy = (who) => S.love.filter((x) => x.from === who).reduce((n, x) => n + x.count, 0);
const leftToday = () => Math.max(0, S.lovePerDay - S.love.filter((x) => x.from === S.who && ukDay(x.createdAt) === ukDay(Date.now())).reduce((n, x) => n + x.count, 0));
function floatHearts(box, howMany) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < Math.min(howMany, 36); i++) setTimeout(() => {
    const el = h("span", { class: "floaty", style: `left:${6 + Math.random() * 88}%;font-size:${16 + Math.random() * 22}px;animation-duration:${2.2 + Math.random() * 1.8}s` }, icon("heart"));
    box.append(el); setTimeout(() => el.remove(), 4200);
  }, i * 70);
}
const L = { n: 0 };
function pageHearts() {
  const wrap = h("div", { class: "page hearts" }, h("h1", { class: "page__title", text: "Hearts" }));
  if (!S.social) { wrap.append(h("p", { class: "muted", text: "Hearts appear once the album's new back end is installed." })); return wrap; }
  const them = PEOPLE[other()], left = leftToday(); L.n = Math.min(L.n, left);
  const count = h("p", { class: "hearts__count", "aria-live": "polite" });
  const hint = h("p", { class: "muted hearts__hint" });
  const send = h("button", { class: "btn btn--solid", text: `Send to ${them}` });
  const note = h("input", { type: "text", maxLength: 200, placeholder: "Add a line to go with them (optional)", "aria-label": "Message to go with the hearts" });
  const paint = () => {
    count.textContent = heartsWord(L.n);
    hint.textContent = left === 0 ? `You've sent all ${num(S.lovePerDay)} for today. More tomorrow.` : L.n >= left ? `That's the most you can send today.` : `You can send ${num(left - L.n)} more today.`;
    send.disabled = L.n < 1;
  };
  const add = (k) => { const before = L.n; L.n = Math.min(left, L.n + k); if (L.n > before) floatHearts(pad, 1); paint(); };   // one tap, one heart
  const big = h("button", { class: "hearts__big", "aria-label": "Add a heart", disabled: left === 0, onclick: () => add(1) }, icon("heart"));
  const pad = h("div", { class: "hearts__pad" }, big, count, hint,
    h("div", { class: "hearts__quick" },
      h("button", { class: "btn btn--line", text: "Start again", onclick: () => { L.n = 0; paint(); } })),
    h("form", { class: "hearts__send", onsubmit: async (e) => {
      e.preventDefault(); if (L.n < 1) return;
      const n = L.n;
      try {
        const r = await post("/love", { from: S.who, count: n, text: note.value.trim() });
        S.love.push(r.send); L.n = 0; toast(`${heartsWord(n)} sent to ${them}`); render(true);
        floatHearts(document.querySelector(".hearts__pad") || pad, n);
      } catch (err) {
        if (err.status === 429) { toast("That's over today's limit of 1,000. Try a smaller number, or again tomorrow.", 4200); await loadSocial(); render(true); }
        else toast("The hearts didn't send. Check your connection and try again.");
      }
    } }, note, send));
  paint();
  const mine = sentBy(S.who), theirs = sentBy(other()), top = Math.max(mine, theirs, 1);
  const row = (label, n) => h("div", { class: "tally__row" }, h("span", { class: "tally__who", text: label }), h("span", { class: "tally__bar" }, h("span", { style: `width:${Math.max(n ? 2 : 0, Math.round((n / top) * 100))}%` })), h("span", { class: "tally__n", text: num(n) }));
  const verdict = mine === theirs ? (mine ? "Dead level. Somebody do something." : "Nobody has sent any yet. Be the first.")
    : `${mine > theirs ? "You are" : them + " is"} ahead by ${heartsWord(Math.abs(mine - theirs))}.`;
  const recent = [...S.love].reverse().slice(0, 8);
  wrap.append(h("div", { class: "hearts__cols" }, pad,
    h("section", { class: "tally" }, h("h2", { text: "The tally" }),
      row(`You to ${them}`, mine), row(`${them} to you`, theirs),
      h("p", { class: "tally__verdict", text: verdict }),
      recent.length ? h("h2", { text: "Lately" }) : null,
      h("ol", { class: "tally__log" }, recent.map((x) => h("li", {},
        h("span", { text: `${x.from === S.who ? "You" : PEOPLE[x.from] || "Someone"} sent ${heartsWord(x.count)}` }),
        x.text && h("span", { class: "tally__note", text: x.text }),
        h("span", { class: "muted", text: ago(x.createdAt) })))))));
  return wrap;
}
// When hearts are waiting for you, show them once, then mark them as seen for good.
function showGift() {
  if (!S.social || !S.who || !$("gift").hidden) return;
  const fresh = S.love.filter((x) => x.from !== S.who && !x.seen); if (!fresh.length) return;
  const total = fresh.reduce((n, x) => n + x.count, 0), from = PEOPLE[fresh[0].from] || "Someone";
  $("giftLine").textContent = `${from} has sent you ${heartsWord(total)}, with love`;
  $("giftNotes").replaceChildren(...fresh.filter((x) => x.text).slice(-3).map((x) => h("p", { text: x.text })));
  $("gift").hidden = false; document.body.classList.add("is-locked");
  floatHearts($("giftSky"), total); $("giftClose").focus();
  fresh.forEach((x) => { x.seen = true; });
  post("/love/seen", { who: S.who }).catch(() => {});
}
function closeGift() { $("gift").hidden = true; $("giftSky").replaceChildren(); if ($("viewer").hidden && $("show").hidden) document.body.classList.remove("is-locked"); }

function pageBin() {
  const wrap = h("div", { class: "page" }, h("h1", { class: "page__title", text: "Bin" }),
    h("p", { class: "page__lede", text: "Deleted photos wait here for 30 days, then they are erased for good." }));
  if (!BIN.items) {
    wrap.append(h("p", { class: "muted", text: "Opening the bin" }));
    if (!BIN.loading) {
      BIN.loading = true;
      api("/bin").then((r) => { BIN.items = r.items || []; }).catch(() => { BIN.items = []; toast("The bin couldn't load. Check your connection and try again."); })
        .finally(() => { BIN.loading = false; if (S.route === "bin") render(true); });
    }
    return wrap;
  }
  if (!BIN.items.length) { wrap.append(empty("The bin is empty", "Nothing has been deleted in the last 30 days.")); return wrap; }
  wrap.append(h("div", { class: "shelf" }, BIN.items.map((it) => h("figure", { class: "shelf__item" },
    h("span", { class: "shelf__cover" }, mediaEl(it)),
    h("span", { class: "tile__cap", text: it.caption || (isVideo(it) ? "Untitled film" : "Untitled photo") }),
    h("span", { class: "shelf__n", text: `Erased in ${plural(it.daysLeft, "day", "days")}` + (PEOPLE[it.deletedBy] ? `, deleted by ${PEOPLE[it.deletedBy]}` : "") }),
    h("button", { class: "btn btn--line", text: "Restore", onclick: async () => {
      try {
        await post("/restore", { id: it.id }); BIN.items = BIN.items.filter((x) => x.id !== it.id);
        await loadList(); toast("Restored to the album"); render(true);
      } catch { toast("That wasn't restored. Check your connection and try again."); }
    } })))));
  return wrap;
}
function upcoming() {
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = (month, day) => { let d = new Date(today.getFullYear(), month - 1, day); if (d < today) d = new Date(today.getFullYear() + 1, month - 1, day); return d; };
  const out = FIXED_DATES.map((f) => ({ title: f.title, when: next(f.month, f.day) }));
  for (const d of S.dates) {
    const [y, m, dd] = d.date.split("-").map(Number);
    const when = d.yearly ? next(m, dd) : new Date(y, m - 1, dd);
    if (when >= today) out.push({ title: d.title, when, id: d.id });
  }
  return out.map((o) => ({ ...o, days: Math.round((o.when - today) / DAY) })).sort((a, b) => a.days - b.days);
}
function todayLine() {
  const t = upcoming().filter((d) => d.days === 0).map((d) => d.title);
  return t.length ? `Today: ${t.join(" and ")}. ` : "";
}
function datesBlock() {
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });
  const list = h("dl", { class: "facts" }, upcoming().map((d) => h("div", {}, h("dt", { text: fmt.format(d.when) }),
    h("dd", {}, d.title, h("span", { class: "muted", text: d.days === 0 ? "  today" : d.days === 1 ? "  tomorrow" : `  in ${d.days} days` }),
      d.id && h("button", { class: "link facts__rm", text: "Remove", onclick: async () => {
        try { await api("/dates?id=" + encodeURIComponent(d.id), { method: "DELETE" }); S.dates = S.dates.filter((x) => x.id !== d.id); render(true); }
        catch { toast("That couldn't be removed. Try again."); }
      } })))));
  if (!S.social) return [list];
  const title = h("input", { type: "text", maxLength: 80, placeholder: "What is it?", "aria-label": "Name of the date" });
  const date = h("input", { type: "date", "aria-label": "Date" });
  const yearly = h("input", { type: "checkbox", id: "yearly" });
  return [list, h("form", { class: "adddate", onsubmit: async (e) => {
    e.preventDefault(); if (!title.value.trim() || !date.value) return toast("Give the date a name and pick a day.");
    try { const r = await post("/dates", { title: title.value.trim(), date: date.value, yearly: yearly.checked }); S.dates.push(r.date); toast("Date added"); render(true); }
    catch { toast("The date wasn't added. Check your connection and try again."); }
  } }, title, date, h("label", { class: "check" }, yearly, "Every year"), h("button", { class: "btn btn--line", text: "Add date" }))];
}
function pageUs() {
  const span = spanTogether(), ann = nextAnniversary();
  const photos = S.items.filter((i) => !isVideo(i)).length, films = S.items.length - photos;
  const first = S.items.length ? itemDate(S.items[S.items.length - 1]) : null;
  const facts = h("dl", { class: "facts" },
    fact("Together", [span.y && plural(span.y, "year", "years"), span.m && plural(span.m, "month", "months"), plural(span.d, "day", "days")].filter(Boolean).join(", ")),
    fact("That is", plural(daysTogether(), "day", "days") + ", since " + fmtDay.format(TOGETHER_SINCE)),
    fact("Next anniversary", ann.days === 0 ? `Today. Happy ${ann.years} years.` : `${plural(ann.days, "day", "days")} until year ${ann.years}`),
    fact("In the album", `${plural(photos, "photo", "photos")} and ${plural(films, "film", "films")}` + (first ? `, the first from ${fmtMonth.format(first)}` : "")),
    S.social && fact("Last here", Object.keys(PEOPLE).map((p) => `${p === S.who ? "You" : PEOPLE[p]}: ${p === S.who ? "now" : S.presence[p] ? ago(S.presence[p]) : "not yet"}`).join("\n")));

  const today = new Date();
  const onDay = S.items.filter((it) => { const d = itemDate(it); return it.createdAt && d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() !== today.getFullYear(); });

  const wrap = h("div", { class: "page us" },
    h("h1", { class: "page__title", text: "Us" }),
    h("div", { class: "us__cols" },
      h("section", { class: "notes", "aria-label": "Notes" }, h("h2", { text: "Notes to each other" }), notesBlock()),
      h("aside", { class: "us__side" },
        facts,
        h("section", {}, h("h2", { text: "Dates" }), datesBlock()),
        onDay.length ? h("section", {}, h("h2", { text: "On this day" }), grid(onDay.slice(0, 4), 2)) : null,
        h("section", { class: "kept" },
          h("h2", { text: "How this is kept" }),
          h("p", { text: "A private, serverless album on AWS. The site is served through CloudFront, the photos sit in a locked S3 bucket that only CloudFront can read, new uploads go in through signed links that expire, and captions, comments and notes go through Lambda into DynamoDB, behind a real sign-in on our own domain." }),
          h("p", { class: "kept__joke", text: "Which is a long way of saying: nobody gets in without the sign-in and the secret word." })),
        h("p", { class: "muted", text: S.who ? `This device is ${PEOPLE[S.who]}'s. ` : "" },
          h("button", { class: "link", text: "Switch person", onclick: () => { $("app").hidden = true; $("who").hidden = false; } }),
          S.social && h("a", { class: "link us__bin", href: "#/bin", text: "Deleted photos" })))));
  if (S.social && S.messages.length) store.set("album_notes_seen", S.messages[S.messages.length - 1].createdAt);
  updateDots();
  return wrap;
}
function fact(term, text) { return h("div", {}, h("dt", { text: term }), h("dd", { text })); }
function notesBlock() {
  if (!S.social) return h("p", { class: "muted", text: "Notes, comments and last-seen times appear once the album's new back end is installed. Photos and uploads work as normal until then." });
  const thread = h("ol", { class: "thread" }, S.messages.map((m) => bubble(m, "/messages")));
  if (!S.messages.length) thread.append(h("li", { class: "muted", text: `No notes yet. Leave the first one for ${PEOPLE[other()]}.` }));
  const box = h("textarea", { rows: 2, maxLength: 1000, placeholder: `Leave a note for ${PEOPLE[other()]}`, "aria-label": "Your note" });
  const form = h("form", { class: "compose", onsubmit: async (e) => {
    e.preventDefault(); const text = box.value.trim(); if (!text) return;
    try { const r = await post("/messages", { author: S.who, text }); S.messages.push(r.message); box.value = ""; render(true); toast("Note left"); }
    catch { toast("The note didn't send. Check your connection and try again."); }
  } }, box, h("button", { class: "btn btn--solid", text: "Leave note" }));
  box.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) form.requestSubmit(); });
  setTimeout(() => { thread.scrollTop = thread.scrollHeight; });
  return [thread, form];
}
function bubble(m, path) {
  const mine = m.author === S.who;
  return h("li", { class: "bubble" + (mine ? " bubble--mine" : "") },
    h("p", { class: "bubble__text", text: m.text }),
    h("p", { class: "bubble__meta" }, `${mine ? "You" : PEOPLE[m.author] || "Someone"}, ${ago(m.createdAt)}`,
      mine && h("button", { class: "link", text: "Delete", onclick: async () => {
        try {
          await api(`${path}?id=${encodeURIComponent(m.id)}`, { method: "DELETE" });
          if (path === "/messages") S.messages = S.messages.filter((x) => x.id !== m.id); else S.comments = S.comments.filter((x) => x.id !== m.id);
          render(true); if (!$("viewer").hidden) paintViewer();
        } catch { toast("That couldn't be deleted. Try again."); }
      } })));
}

const PAGES = { "": pageAlbum, hearts: pageHearts, bin: pageBin, albums: pageAlbums, timeline: pageTimeline, films: pageFilms, favourites: pageFavourites, us: pageUs };
function render(keepScroll) {
  const y = window.scrollY;
  const focusSearch = document.activeElement && document.activeElement.classList.contains("search");
  S.cols = colCount();
  $("view").replaceChildren((PAGES[S.route] || pageAlbum)());
  document.querySelectorAll("[data-route]").forEach((a) => a.toggleAttribute("aria-current", a.dataset.route === S.route));
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  if (focusSearch) document.querySelector(".search")?.focus();
  updateDots();
}
function route() {
  const [r, ...rest] = location.hash.replace(/^#\/?/, "").split("/");
  S.route = r in PAGES ? r : ""; S.param = rest.length ? decodeURIComponent(rest.join("/")) : "";
  if (S.route !== "bin") BIN.items = null;
  render(false);
}

/* ---------- viewer ---------- */
const V = { list: [], i: 0 };
function openViewer(it, list) {
  V.list = list; V.i = Math.max(0, list.indexOf(it));
  $("viewer").hidden = false; document.body.classList.add("is-locked");
  paintViewer(true);
  $("vClose").focus();
}
function closeViewer() { $("viewer").hidden = true; $("vMedia").replaceChildren(); document.body.classList.remove("is-locked"); }
function stepViewer(d) { if (V.list.length < 2) return; V.i = (V.i + d + V.list.length) % V.list.length; paintViewer(true); }
function paintViewer(media) {
  const it = V.list[V.i]; if (!it) return closeViewer();
  if (media) $("vMedia").replaceChildren(mediaEl(it, true));
  $("vCount").textContent = `${V.i + 1} of ${V.list.length}`;
  $("vCaption").textContent = it.caption || (isVideo(it) ? "Untitled film" : "Untitled photo");
  $("vCaption").classList.toggle("is-blank", !it.caption);
  const by = it.uploadedBy && PEOPLE[it.uploadedBy] ? `, added by ${PEOPLE[it.uploadedBy]}` : "";
  $("vDate").textContent = (it.createdAt ? fmtDay.format(itemDate(it)) : fmtMonth.format(itemDate(it))) + by;
  $("vFav").textContent = isFav(it) ? "Remove favourite" : "Add to favourites";
  $("vFav").classList.toggle("is-on", isFav(it));
  $("vEdit").hidden = !(S.social && it.id); $("vEditForm").hidden = true; $("vCaption").hidden = false;
  $("vDel").hidden = !(S.social && it.id);
  const loves = S.social && heartOf(it, other());
  $("vLoves").hidden = !loves; $("vLoves").textContent = loves ? `${PEOPLE[other()]} loves this one.` : "";
  $("vAlbumRow").hidden = !(S.social && it.id && S.albums.length);
  $("vAlbum").replaceChildren(h("option", { value: "", text: "None" }), ...S.albums.map((a) => h("option", { value: a.id, text: a.name })));
  $("vAlbum").value = albumName(it.album) ? it.album : "";
  const box = $("vComments"); box.replaceChildren();
  if (!S.social) return;
  const list = commentsFor(it).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const input = h("input", { type: "text", maxLength: 500, placeholder: "Add a comment", "aria-label": "Add a comment" });
  box.append(h("h3", { text: list.length ? plural(list.length, "comment", "comments") : "Comments" }),
    h("ol", { class: "thread thread--tight" }, list.map((c) => bubble(c, "/comments"))),
    h("form", { class: "compose compose--line", onsubmit: async (e) => {
      e.preventDefault(); const text = input.value.trim(); if (!text) return;
      try { const r = await post("/comments", { key: it.key, author: S.who, text }); S.comments.push(r.comment); paintViewer(); render(true); }
      catch { toast("The comment didn't post. Check your connection and try again."); }
    } }, input, h("button", { class: "btn btn--solid", text: "Post" })));
}
async function download() {
  const it = V.list[V.i]; if (!it) return;
  try {
    const blob = await (await fetch(it.url)).blob();
    const ext = (/\.([a-z0-9]{2,5})(?:$|\?)/i.exec(it.key || it.url) || [])[1] || (blob.type.split("/")[1] || "jpg");
    const base = (it.caption || "").replace(/[^\w\s-]/g, "").trim().slice(0, 40) || `album-${fmtDay.format(itemDate(it)).replace(/\s/g, "-")}`;
    const a = h("a", { href: URL.createObjectURL(blob), download: `${base}.${ext.toLowerCase()}` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch { toast("The download failed. Check your connection and try again."); }
}

/* ---------- slideshow ---------- */
const W = { list: [], i: 0, timer: 0, playing: true, front: "showA" };
function openShow(list) {
  if (!list.length) return toast("There are no photos to show yet.");
  W.list = list; W.i = 0; W.playing = true;
  $("show").hidden = false; document.body.classList.add("is-locked");
  paintShow(); tick();
  $("showClose").focus();
}
function closeShow() { clearTimeout(W.timer); $("show").hidden = true; $("showA").replaceChildren(); $("showB").replaceChildren(); document.body.classList.remove("is-locked"); }
function tick() { clearTimeout(W.timer); if (W.playing) W.timer = setTimeout(() => stepShow(1), 5000); }
function stepShow(d) { W.i = (W.i + d + W.list.length) % W.list.length; paintShow(); tick(); }
function paintShow() {
  const it = W.list[W.i];
  const back = W.front === "showA" ? "showB" : "showA";
  $(back).replaceChildren(h("img", { src: it.url, alt: it.caption || "" }));
  $(back).classList.add("is-front"); $(W.front).classList.remove("is-front"); W.front = back;
  $("showCap").textContent = [it.caption, it.createdAt ? fmtDay.format(itemDate(it)) : ""].filter(Boolean).join("  /  ");
  setIcon($("showPlay"), W.playing ? "pause" : "play");
  $("showPlay").setAttribute("aria-label", W.playing ? "Pause" : "Play");
}

/* ---------- upload ---------- */
const U = { files: [], taken: [], prints: [], sent: [], i: 0 };

/* ---------- spotting the same photo or film twice ----------
   Photos get a 64-bit "what it looks like" fingerprint (survives resizing and re-saving),
   plus the picture's shape. Films are matched exactly, by size and the first megabyte. */
const BITS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
function lookPrint(img) {
  const w = img.naturalWidth || img.videoWidth, ht = img.naturalHeight || img.videoHeight; if (!w || !ht) return "";
  const c = h("canvas", { width: 9, height: 8 }), ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, 9, 8);
  const d = ctx.getImageData(0, 0, 9, 8).data, g = [];
  for (let i = 0; i < 72; i++) g.push(d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114);
  let hex = "";
  for (let y = 0; y < 8; y++) { let byte = 0; for (let x = 0; x < 8; x++) byte = (byte << 1) | (g[y * 9 + x] > g[y * 9 + x + 1] ? 1 : 0); hex += byte.toString(16).padStart(2, "0"); }
  return `i:${hex}:${Math.round((w / ht) * 100)}`;
}
function loadImage(src) {
  return new Promise((ok, fail) => { const img = new Image(); img.onload = () => ok(img); img.onerror = fail; img.src = src; });
}
async function bytesPrint(buf, size) {
  const hash = await crypto.subtle.digest("SHA-256", buf.slice(0, 1048576));
  return `v:${[...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("")}:${size}`;
}
async function filePrint(file) {
  try {
    if (file.type.startsWith("image/")) { const url = URL.createObjectURL(file); try { return lookPrint(await loadImage(url)); } finally { URL.revokeObjectURL(url); } }
    return await bytesPrint(await file.slice(0, 1048576).arrayBuffer(), file.size);
  } catch { return ""; }
}
function samePrint(a, b) {
  if (!a || !b || a[0] !== b[0]) return false;
  if (a[0] === "v") return a === b;
  const [, ha, ra] = a.split(":"), [, hb, rb] = b.split(":");
  if (Math.abs(ra - rb) > 2) return false;
  let diff = 0; for (let i = 0; i < 16; i++) diff += BITS[parseInt(ha[i], 16) ^ parseInt(hb[i], 16)];
  return diff <= 4;
}
const twinOf = (print) => print ? [...S.items, ...U.sent].find((it) => samePrint(it.print, print)) : null;
// Fingerprint what is already in the album, quietly, a few at a time. Runs until every item has one.
let printing = false;
async function printExisting() {
  if (printing || !S.social) return; printing = true;
  try {
    for (const it of S.items.filter((x) => !x.print && x.id)) {
      let print = "";
      try {
        if (isVideo(it)) {
          const res = await fetch(it.url, { headers: { Range: "bytes=0-1048575" } });
          const total = Number((res.headers.get("content-range") || "").split("/")[1]) || 0;
          const buf = await res.arrayBuffer(); print = await bytesPrint(buf, total || buf.byteLength);
        } else print = lookPrint(await loadImage(it.url));
      } catch {}
      if (print) { it.print = print; await post("/details", { id: it.id, print }).catch(() => {}); }
      await new Promise((r) => setTimeout(r, 150));
    }
  } finally { printing = false; }
}
// Date a photo was taken, read from the file itself (EXIF) before it is resized.
function exifDate(v) {
  if (v.byteLength < 12 || v.getUint16(0) !== 0xffd8) return "";
  let o = 2;
  while (o + 10 < v.byteLength) {
    const marker = v.getUint16(o), len = v.getUint16(o + 2);
    if ((marker & 0xff00) !== 0xff00) break;
    if (marker === 0xffe1 && v.getUint32(o + 4) === 0x45786966) {
      const t = o + 10, le = v.getUint16(t) === 0x4949;
      const u16 = (p) => v.getUint16(p, le), u32 = (p) => v.getUint32(p, le);
      const find = (ifd, tag) => { const n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === tag) return e; } return 0; };
      const str = (e) => { const c = u32(e + 4), p = t + u32(e + 8); let out = ""; for (let i = 0; i < c - 1; i++) out += String.fromCharCode(v.getUint8(p + i)); return out; };
      const ifd0 = t + u32(t + 4); let raw = "";
      const sub = find(ifd0, 0x8769);
      if (sub) { const ex = t + u32(sub + 8), d = find(ex, 0x9003) || find(ex, 0x9004); if (d) raw = str(d); }
      if (!raw) { const d = find(ifd0, 0x0132); if (d) raw = str(d); }
      const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(raw);
      return m && m[1] !== "0000" ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : "";
    }
    o += 2 + len;
  }
  return "";
}
async function takenAt(file) {
  try { if (file.type === "image/jpeg") { const d = exifDate(new DataView(await file.slice(0, 262144).arrayBuffer())); if (d) return d; } } catch {}
  if (!file.lastModified || Date.now() - file.lastModified < 120000) return "";   // no real date in the file
  const d = new Date(file.lastModified);
  return `${localDay(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function resize(file, max = 1920) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return Promise.resolve(file);
  return new Promise((done) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: ht } = img;
      if (w <= max && ht <= max) return done(file);
      const r = Math.min(max / w, max / ht), c = h("canvas", { width: Math.round(w * r), height: Math.round(ht * r) });
      const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => done(b ? new File([b], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file), "image/jpeg", 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); done(file); };
    img.src = url;
  });
}
async function takeFiles(fileList) {
  const picked = [...(fileList || [])].filter((f) => /^(image|video)\//.test(f.type));
  if (!picked.length) return;
  U.taken = await Promise.all(picked.map(takenAt));
  U.files = await Promise.all(picked.map((f) => resize(f))); U.i = 0; U.sent = [];
  U.prints = await Promise.all(U.files.map(filePrint));
  $("sheetAlbumRow").hidden = !(S.social && S.albums.length);
  $("sheetAlbum").replaceChildren(h("option", { value: "", text: "None" }), ...S.albums.map((a) => h("option", { value: a.id, text: a.name })));
  $("sheetAlbum").value = S.route === "albums" && albumName(S.param) ? S.param : "";
  askCaption();
}
function askCaption() {
  if (U.i >= U.files.length) { $("sheet").hidden = true; refresh(); return; }
  const f = U.files[U.i];
  $("sheetStep").textContent = U.files.length > 1 ? `${U.i + 1} of ${U.files.length}` : "Add to album";
  const url = URL.createObjectURL(f);
  $("sheetPrev").replaceChildren(f.type.startsWith("video/") ? h("video", { src: url, muted: true, controls: true, playsInline: true }) : h("img", { src: url, alt: "" }));
  const twin = twinOf(U.prints[U.i]);
  $("sheetDup").hidden = !twin; $("sheetSkip").hidden = !twin;
  $("sheetAdd").textContent = twin ? "Add anyway" : "Add to album"; $("sheetAdd").className = twin ? "btn btn--line" : "btn btn--solid";
  if (twin) {
    $("sheetDupThumb").replaceChildren(twin.url ? mediaEl(twin) : "");
    $("sheetDupWhen").textContent = twin.url ? `Added ${fmtDay.format(parseWhen(twin.createdAt) || itemDate(twin))}${twin.caption ? `, "${twin.caption}"` : ""}.` : "It is in this batch.";
  }
  $("cap").value = ""; $("sheet").hidden = false; (twin ? $("sheetSkip") : $("cap")).focus();
}
function putFile(url, file) {
  return new Promise((ok, fail) => {
    const x = new XMLHttpRequest(); x.open("PUT", url, true);
    if (file.type) x.setRequestHeader("Content-Type", file.type);
    x.upload.onprogress = (e) => { if (e.lengthComputable) $("progressFill").style.width = Math.round((e.loaded / e.total) * 100) + "%"; };
    x.onload = () => (x.status >= 200 && x.status < 300 ? ok() : fail(new Error("upload " + x.status)));
    x.onerror = () => fail(new Error("network")); x.send(file);
  });
}
async function sendCurrent() {
  const f = U.files[U.i], caption = $("cap").value.trim();
  $("sheet").hidden = true; $("progress").hidden = false; $("progressName").textContent = "Adding " + f.name; $("progressFill").style.width = "0%";
  try {
    const { uploadUrl } = await post("/upload", { fileName: f.name, contentType: f.type || "application/octet-stream", caption, uploadedBy: S.who, takenAt: U.taken[U.i] || "", album: $("sheetAlbum").value || "", print: U.prints[U.i] || "" });
    await putFile(uploadUrl, f);
    U.sent.push({ print: U.prints[U.i], caption });
    toast("Added to album");
  } catch { toast(`${f.name} wasn't added. Check your connection and try again.`, 4200); }
  $("progress").hidden = true; U.i++; askCaption();
}

/* ---------- on-screen keyboard ----------
   Phones handle the keyboard in two different ways:
   - iPhone (Safari), and some Android browsers: the keyboard covers the bottom of the screen
     and the page stays the same height, so a full-screen panel keeps its bottom underneath it.
   - Android Chrome and Firefox: the page itself is made shorter.
   Either way, the part of the screen you can actually see gets shorter. This tracks that
   visible part, sizes the photo viewer and the upload box to it, and brings the field being
   typed in to the middle of it. "Keyboard open" is judged against the tallest the visible
   area has been in this orientation, so it works whichever way the phone behaves. */
function followKeyboard() {
  const vv = window.visualViewport; if (!vv) return;
  const root = document.documentElement;
  let tallest = 0, width = 0;
  const fit = () => {
    if (vv.scale && vv.scale > 1.01) return;                            // pinch-zoomed: leave things alone
    if (Math.abs(vv.width - width) > 1) { width = vv.width; tallest = 0; } // rotated: measure again
    tallest = Math.max(tallest, vv.height);
    root.style.setProperty("--vvh", vv.height + "px");
    root.style.setProperty("--vvt", vv.offsetTop + "px");
    const open = tallest - vv.height > 120;
    document.body.classList.toggle("kb-open", open);
    const el = document.activeElement;
    if (open && el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.closest(".viewer, .sheet")) {
      requestAnimationFrame(() => el.scrollIntoView({ block: "center" }));
    }
  };
  vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit);
  window.addEventListener("resize", fit);
  document.addEventListener("focusin", () => setTimeout(fit, 350));
  fit();
}

/* ---------- start ---------- */
async function refresh() {
  try { await loadList(); } catch { toast("The album couldn't load. Check your connection, then reload the page.", 5000); }
  await loadSocial();
  render(true);
  showGift();
  setTimeout(printExisting, 3000);
}
async function start() {
  $("lock").hidden = true; $("who").hidden = true; $("app").hidden = false;
  $("footWho").textContent = S.who ? `Here as ${PEOPLE[S.who]}` : "";
  $("view").replaceChildren(h("p", { class: "loading", text: "Opening the album" }));
  await refresh(); route();
}
function unlocked() {
  try { sessionStorage.setItem("album_open", "1"); } catch {}
  if (!S.who) { $("lock").hidden = true; $("who").hidden = false; } else start();
}
function boot() {
  applyTheme(store.get("album_theme", "light"));
  $("lockDays").textContent = daysTogether().toLocaleString("en-GB");
  $("termsList").replaceChildren(...TERMS.map((t) => h("li", { text: t })));
  $("agree").addEventListener("change", () => { if ($("agree").checked) $("lockErr").hidden = true; });
  initSong();
  followKeyboard();
  document.querySelectorAll("[data-ic]").forEach((i) => setIcon(i, i.dataset.ic));
  setIcon($("vClose"), "close"); setIcon($("vPrev"), "prev"); setIcon($("vNext"), "next");
  setIcon($("showPrev"), "prev"); setIcon($("showNext"), "next"); setIcon($("showClose"), "close");

  $("lockForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("lockErr");
    if (!$("agree").checked) { err.textContent = "Tick the box first. No agreement, no entry."; err.hidden = false; $("agree").focus(); return; }
    if ($("pw").value.trim().toLowerCase() !== SECRET_WORD) { err.textContent = "Not quite. Try once more."; err.hidden = false; $("pw").select(); return; }
    unlocked();
  });
  document.querySelectorAll(".who__btn").forEach((b) => b.addEventListener("click", () => { S.who = b.dataset.who; store.set("album_who", S.who); start(); }));
  $("themeBtn").addEventListener("click", () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; applyTheme(t); store.set("album_theme", t); });
  $("file").addEventListener("change", (e) => { takeFiles(e.target.files); e.target.value = ""; });
  $("sheetAdd").addEventListener("click", sendCurrent);
  $("sheetSkip").addEventListener("click", () => { toast("Skipped, it's already in the album", 1800); U.i++; askCaption(); });
  $("sheetCancel").addEventListener("click", () => { U.files = []; $("sheet").hidden = true; refresh(); });
  $("cap").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendCurrent(); });

  $("vClose").addEventListener("click", closeViewer);
  $("vPrev").addEventListener("click", () => stepViewer(-1));
  $("vNext").addEventListener("click", () => stepViewer(1));
  $("vFav").addEventListener("click", () => toggleFav(V.list[V.i]));
  $("vDown").addEventListener("click", download);
  $("vEdit").addEventListener("click", () => {
    const it = V.list[V.i]; $("vEditInput").value = it.caption || ""; $("vEditDate").value = localDay(itemDate(it));
    $("vCaption").hidden = true; $("vEditForm").hidden = false; $("vEdit").hidden = true; $("vEditInput").focus();
  });
  $("vEditCancel").addEventListener("click", () => paintViewer());
  $("vEditForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const it = V.list[V.i], caption = $("vEditInput").value.trim(), day = $("vEditDate").value;
    const body = { id: it.id, caption };
    if (day && day !== localDay(itemDate(it))) body.takenAt = day;
    try {
      await post("/details", body); it.caption = caption; if (body.takenAt) it.takenAt = body.takenAt;
      S.items.sort((a, b) => itemDate(b) - itemDate(a)); toast("Details saved"); render(true);
    } catch { toast("The details didn't save. Check your connection and try again."); }
    paintViewer();
  });
  $("vDel").addEventListener("click", async () => {
    const it = V.list[V.i]; $("vDel").disabled = true;
    try {
      await post("/delete", { id: it.id, who: S.who });
      S.items = S.items.filter((x) => x.id !== it.id); V.list = V.list.filter((x) => x.id !== it.id);
      toast("Moved to the bin. Restore it within 30 days from Deleted photos on the Us page.", 4200);
      if (V.list.length) { V.i = Math.min(V.i, V.list.length - 1); paintViewer(true); } else closeViewer();
      render(true);
    } catch { toast("That wasn't deleted. Check your connection and try again."); }
    $("vDel").disabled = false;
  });
  $("vAlbum").addEventListener("change", async () => {
    const it = V.list[V.i], album = $("vAlbum").value;
    try { await post("/details", { id: it.id, album }); it.album = album; toast(album ? `Moved to ${albumName(album)}` : "Removed from its album"); render(true); }
    catch { toast("The album didn't save. Check your connection and try again."); paintViewer(); }
  });
  $("giftClose").addEventListener("click", closeGift);
  $("giftBack").addEventListener("click", () => { closeGift(); location.hash = "#/hearts"; });
  $("showClose").addEventListener("click", closeShow);
  $("showPrev").addEventListener("click", () => stepShow(-1));
  $("showNext").addEventListener("click", () => stepShow(1));
  $("showPlay").addEventListener("click", () => { W.playing = !W.playing; paintShow(); tick(); });

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || "");
    if (!$("gift").hidden) { if (e.key === "Escape") closeGift(); return; }
    if (!$("show").hidden) {
      if (e.key === "Escape") closeShow(); else if (e.key === "ArrowLeft") stepShow(-1); else if (e.key === "ArrowRight") stepShow(1);
      else if (e.key === " ") { e.preventDefault(); $("showPlay").click(); }
    } else if (!$("viewer").hidden) {
      if (e.key === "Escape") closeViewer(); else if (typing) return;
      else if (e.key === "ArrowLeft") stepViewer(-1); else if (e.key === "ArrowRight") stepViewer(1);
    } else if (!$("sheet").hidden && e.key === "Escape") $("sheetCancel").click();
  });
  let tx = null;
  $("vMedia").addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  $("vMedia").addEventListener("touchend", (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) stepViewer(dx > 0 ? -1 : 1); tx = null; });

  let depth = 0;
  document.addEventListener("dragenter", (e) => { if ($("app").hidden || !e.dataTransfer?.types.includes("Files")) return; depth++; $("drop").hidden = false; });
  document.addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) $("drop").hidden = true; });
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => { e.preventDefault(); depth = 0; $("drop").hidden = true; if (!$("app").hidden) takeFiles(e.dataTransfer.files); });

  window.addEventListener("hashchange", route);
  window.addEventListener("resize", () => { if (!$("app").hidden && colCount() !== S.cols) render(true); });
  // Signed photo links expire, so fetch fresh ones when the album has been left open a while.
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("app").hidden && Date.now() - S.listAt > 10 * 60000) refresh(); });

  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

  let open = false; try { open = sessionStorage.getItem("album_open") === "1"; } catch {}
  if (open) unlocked(); else $("pw").focus();
}
boot();
