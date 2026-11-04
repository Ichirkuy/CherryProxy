// CherryProxy - loads games from games.json and plays them in an iframe

const els = {
  library: document.getElementById("library"),
  grid: document.getElementById("grid"),
  categories: document.getElementById("categories"),
  empty: document.getElementById("empty"),
  search: document.getElementById("search"),
  player: document.getElementById("player"),
  frameWrap: document.getElementById("frameWrap"),
  gameTitle: document.getElementById("gameTitle"),
  backBtn: document.getElementById("backBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  homeLink: document.getElementById("homeLink"),
};

let games = [];
let activeCategory = "All";

// Saved in the browser so it survives page reloads (wrapped: storage can be blocked)
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

// Accepts either a plain URL or a full "<iframe src=...>" embed string
function getIframeSrc(iframe) {
  const value = iframe.trim();
  if (!value.startsWith("<")) return value;
  const doc = new DOMParser().parseFromString(value, "text/html");
  const frame = doc.querySelector("iframe");
  return frame ? frame.getAttribute("src") : "";
}

async function loadGames() {
  try {
    const res = await fetch("games.json");
    if (!res.ok) throw new Error(res.status);
    games = await res.json();
  } catch (err) {
    els.empty.textContent =
      "Could not load games.json. Open this site through a web server, not by double-clicking the file.";
    els.empty.classList.remove("hidden");
    console.error(err);
    return;
  }
  renderCategories();
  renderGrid();
  renderRecent();
  openFromHash();
}

function renderCategories() {
  const cats = ["All", ...new Set(games.map((g) => g.category).filter(Boolean))];
  els.categories.innerHTML = "";
  for (const cat of cats) {
    const chip = document.createElement("button");
    chip.className = "chip" + (cat === activeCategory ? " active" : "");
    chip.textContent = cat;
    chip.onclick = () => {
      activeCategory = cat;
      renderCategories();
      renderGrid();
    };
    els.categories.appendChild(chip);
  }
}

function renderGrid() {
  const q = els.search.value.toLowerCase().trim();
  const list = games.filter(
    (g) =>
      (activeCategory === "All" || g.category === activeCategory) &&
      g.title.toLowerCase().includes(q)
  );

  els.grid.innerHTML = "";
  els.empty.textContent = "No games found.";
  els.empty.classList.toggle("hidden", list.length > 0);

  for (const game of list) {
    const card = document.createElement("button");
    card.className = "card";

    const thumb = makeThumb(game, "thumb");

    const info = document.createElement("div");
    info.className = "card-info";
    const title = document.createElement("h3");
    title.textContent = game.title;
    const cat = document.createElement("span");
    cat.textContent = game.category || "";
    info.append(title, cat);

    card.append(thumb, info);
    card.onclick = () => (location.hash = game.id);
    els.grid.appendChild(card);
  }
}

// Thumbnail image if the game has one, otherwise its emoji icon
function makeThumb(game, className) {
  const thumb = document.createElement("div");
  thumb.className = className;
  if (game.thumbnail) {
    const img = document.createElement("img");
    img.src = game.thumbnail;
    img.alt = game.title;
    img.loading = "lazy";
    thumb.appendChild(img);
  } else {
    thumb.textContent = game.icon || "🎮";
  }
  return thumb;
}

function openGame(game) {
  // Remember it for the "Last played" widget (newest first, max 3)
  const recent = store.get("recentGames", []).filter((r) => r.id !== game.id);
  recent.unshift({ id: game.id, time: Date.now() });
  store.set("recentGames", recent.slice(0, 3));

  const iframe = document.createElement("iframe");
  iframe.src = getIframeSrc(game.iframe);
  iframe.title = game.title;
  iframe.allow = "fullscreen; autoplay; gamepad";
  iframe.allowFullscreen = true;

  els.frameWrap.innerHTML = "";
  els.frameWrap.appendChild(iframe);
  els.gameTitle.textContent = game.title;
  document.title = `${game.title} - CherryProxy`;
  els.library.classList.add("hidden");
  els.player.classList.remove("hidden");
  iframe.focus();
}

// Opens a website through the proxy inside the player
let webUrl = null;

async function openWeb(url) {
  els.gameTitle.textContent = "Loading...";
  els.frameWrap.innerHTML = "";
  els.library.classList.add("hidden");
  els.player.classList.remove("hidden");

  try {
    await initProxy();
  } catch (err) {
    const msg = document.createElement("p");
    msg.className = "frame-error";
    msg.textContent = "The proxy couldn't start: " + err.message;
    els.frameWrap.appendChild(msg);
    els.gameTitle.textContent = "Proxy error";
    return;
  }

  const frame = scramjet.createFrame();
  frame.frame.title = "Website";
  frame.frame.className = "web-frame";
  frame.frame.allow = "fullscreen; autoplay; gamepad";
  els.frameWrap.appendChild(frame.frame);
  frame.addEventListener("urlchange", (e) => {
    try {
      els.gameTitle.textContent = new URL(e.url).hostname;
    } catch {}
  });
  frame.go(url);
  els.gameTitle.textContent = new URL(url).hostname;
  document.title = "Browsing - CherryProxy";
}

document.getElementById("webForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("webInput");
  if (!input.value.trim()) return;
  webUrl = toUrl(input.value);
  input.value = "";
  if (location.hash === "#browse") openWeb(webUrl);
  else location.hash = "browse";
});

function closeGame() {
  els.frameWrap.innerHTML = ""; // stops the game
  document.title = "CherryProxy";
  els.player.classList.add("hidden");
  els.library.classList.remove("hidden");
  renderRecent();
}

// ---- Widgets ----

function timeAgo(time) {
  const mins = Math.floor((Date.now() - time) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function renderRecent() {
  const box = document.getElementById("recent");
  const recent = store
    .get("recentGames", [])
    .map((r) => ({ ...r, game: games.find((g) => g.id === r.id) }))
    .filter((r) => r.game);

  box.innerHTML = "";
  if (recent.length === 0) {
    const p = document.createElement("p");
    p.className = "widget-empty";
    p.textContent = "No games played yet. Pick one below!";
    box.appendChild(p);
    return;
  }

  for (const { game, time } of recent) {
    const item = document.createElement("button");
    item.className = "recent-item";
    item.onclick = () => (location.hash = game.id);

    const text = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = game.title;
    const when = document.createElement("span");
    when.textContent = timeAgo(time);
    text.append(title, when);

    item.append(makeThumb(game, "recent-thumb"), text);
    box.appendChild(item);
  }
}

function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  document.getElementById("clockDate").textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function updateGreeting() {
  const name = store.get("userName", "");
  const hour = new Date().getHours();
  const part = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  document.getElementById("greeting").textContent = name ? `${part}, ${name}! Welcome back to` : "Welcome to";

  document.getElementById("nameForm").classList.toggle("hidden", !!name);
  document.getElementById("nameShow").classList.toggle("hidden", !name);
  document.getElementById("nameText").textContent = name;
}

document.getElementById("nameForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return;
  store.set("userName", name);
  updateGreeting();
});

// Show the form again with the current name filled in; it's only replaced on Save
document.getElementById("nameChange").onclick = () => {
  const input = document.getElementById("nameInput");
  input.value = store.get("userName", "");
  document.getElementById("nameForm").classList.remove("hidden");
  document.getElementById("nameShow").classList.add("hidden");
  input.focus();
  input.select();
};

// Each title letter gets its index so the CSS wave can stagger them
document.querySelectorAll(".hero-title span").forEach((s, i) => s.style.setProperty("--i", i));

updateClock();
updateGreeting();
setInterval(updateClock, 1000);
setInterval(() => {
  if (els.player.classList.contains("hidden")) {
    renderRecent(); // keeps "x min ago" fresh
    updateGreeting(); // morning -> afternoon, etc.
  }
}, 30000);

// URL hash (#game-id) decides what's showing, so games are linkable
function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id === "browse" && webUrl) return openWeb(webUrl);
  const game = games.find((g) => g.id === id);
  if (game) openGame(game);
  else closeGame();
}

els.search.addEventListener("input", () => {
  if (location.hash) location.hash = "";
  renderGrid();
});
els.backBtn.onclick = () => (location.hash = "");
els.homeLink.onclick = (e) => {
  e.preventDefault();
  location.hash = "";
};
document.getElementById("browseBtn").onclick = (e) => {
  e.preventDefault();
  document.getElementById("gamesTitle").scrollIntoView({ behavior: "smooth" });
};
els.fullscreenBtn.onclick = () => els.frameWrap.requestFullscreen?.();
window.addEventListener("hashchange", openFromHash);

loadGames();
