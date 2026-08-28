import { api } from "../api.js";
import { getUser } from "../state.js";
import { navigate } from "../router.js";
import {
  iconMountainOutline, iconMountainFilled, iconSearch, iconBookmark,
  DIFFICULTY_COLOR, DIFFICULTY_LABEL,
} from "../icons.js";

const COVER_VARIANTS = [
  { sky: ["#F6C89A", "#E88A4E"], far: "#5C6B57", near: "#2E3B2C" },
  { sky: ["#BFD9EA", "#8FB9CE"], far: "#6B7A6A", near: "#2E3B2C" },
  { sky: ["#D8C6E0", "#9B85AC"], far: "#57506A", near: "#2A2438" },
  { sky: ["#F3DCC9", "#E0A671"], far: "#6B5A4A", near: "#3B2E26" },
];

function coverArt(seed) {
  const v = COVER_VARIANTS[seed % COVER_VARIANTS.length];
  const gid = `sky-${seed}-${Math.random().toString(36).slice(2, 7)}`;
  return `
  <svg viewBox="0 0 400 220" width="100%" height="180" preserveAspectRatio="xMidYMid slice" style="display:block">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${v.sky[0]}"/><stop offset="100%" stop-color="${v.sky[1]}"/>
    </linearGradient></defs>
    <rect width="400" height="220" fill="url(#${gid})"/>
    <polygon points="0,160 90,70 150,130 220,50 290,140 400,90 400,220 0,220" fill="${v.far}" opacity="0.55"/>
    <polygon points="0,190 120,110 200,160 320,90 400,150 400,220 0,220" fill="${v.near}"/>
  </svg>`;
}

function routeCard(route, index) {
  const el = document.createElement("div");
  el.className = "card";
  const badge = route.type === "MULTI_DIA" ? `${route.stageCount} días · ${route.waypointCount} paradas` : null;
  el.innerHTML = `
    <div style="position:relative;">
      ${coverArt(index)}
      ${badge ? `<div style="position:absolute; top:12px; left:12px; background:rgba(30,42,31,0.72); color:#FAF7F1; font-size:11.5px; font-weight:700; padding:5px 10px; border-radius:999px;">${badge}</div>` : ""}
    </div>
    <div style="padding:14px 16px 16px 16px;">
      <div style="font-family:var(--font-display); font-weight:700; font-size:17px; line-height:1.25;">${escapeHtml(route.title)}</div>
      <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
        <div style="width:22px;height:22px;border-radius:999px;background:var(--pine-soft);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--pine);">${initials(route.author?.name)}</div>
        <div style="font-size:12.5px; color:var(--ink-faint);">por ${escapeHtml(route.author?.name || "alguien")}</div>
      </div>
      <div class="stat-grid" style="margin-top:14px;">
        <div class="stat"><div class="stat-val">${route.distanceKm} km</div><div class="stat-label">Distancia</div></div>
        <div class="stat"><div class="stat-val">+${route.elevationGainM} m</div><div class="stat-label">Desnivel</div></div>
        <div class="stat"><div class="stat-val">${route.type === "MULTI_DIA" ? route.stageCount + " días" : "1 día"}</div><div class="stat-label">Duración</div></div>
        <div class="stat" style="flex-direction:row; align-items:center; gap:5px;"><div style="width:8px;height:8px;border-radius:999px;background:${DIFFICULTY_COLOR[route.difficulty]};"></div><div class="stat-val">${DIFFICULTY_LABEL[route.difficulty]}</div></div>
      </div>
      <div style="height:1px; background:var(--border); margin:14px 0;"></div>
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <button class="react-btn" data-id="${route.id}" style="display:flex; align-items:center; gap:6px; background:none; border:none; padding:4px;">
          ${route.reactedByMe ? iconMountainFilled("#C1592B", 19) : iconMountainOutline("var(--ink-soft)", 19)}
          <span class="react-count" style="font-size:13.5px; font-weight:600; color:var(--ink-soft);">${route.reactionCount}</span>
        </button>
        ${iconBookmark("var(--ink-soft)", 17)}
      </div>
    </div>
  `;
  el.addEventListener("click", (e) => {
    if (e.target.closest(".react-btn")) return;
    navigate(`/rutas/${route.id}`);
  });
  const reactBtn = el.querySelector(".react-btn");
  reactBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!getUser()) return navigate("/login");
    reactBtn.disabled = true;
    try {
      const { reacted, count } = await api.react(route.id);
      route.reactedByMe = reacted;
      route.reactionCount = count;
      reactBtn.innerHTML = `${reacted ? iconMountainFilled("#C1592B", 19) : iconMountainOutline("var(--ink-soft)", 19)}<span class="react-count" style="font-size:13.5px; font-weight:600; color:var(--ink-soft);">${count}</span>`;
    } finally {
      reactBtn.disabled = false;
    }
  });
  return el;
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s ?? "";
  return div.innerHTML;
}

const FILTERS = [
  { key: "all", label: "Todos", params: {} },
  { key: "multi", label: "Multi-día", params: { type: "MULTI_DIA" } },
  { key: "un_dia", label: "1 día", params: { type: "UN_DIA" } },
  { key: "facil", label: "Fácil", params: { difficulty: "FACIL" } },
  { key: "dificil", label: "Difícil", params: { difficulty: "DIFICIL" } },
];

export function renderFeed(container) {
  let activeFilter = "all";

  container.innerHTML = `
    <div class="topbar">
      <div class="brand">${iconMountainOutline("#C1592B", 24)} Cumbre</div>
      <button class="icon-btn">${iconSearch()}</button>
    </div>
    <div class="filter-chips" id="filter-chips"></div>
    <div class="feed-list" id="feed-list"><div class="loading">Cargando rutas…</div></div>
  `;

  const chipsEl = container.querySelector("#filter-chips");
  const listEl = container.querySelector("#feed-list");

  function renderChips() {
    chipsEl.innerHTML = "";
    FILTERS.forEach((f) => {
      const chip = document.createElement("div");
      chip.className = `pill filter-chip ${f.key === activeFilter ? "dark" : "outline"}`;
      chip.textContent = f.label;
      chip.style.cursor = "pointer";
      chip.addEventListener("click", () => {
        activeFilter = f.key;
        renderChips();
        loadRoutes();
      });
      chipsEl.appendChild(chip);
    });
  }

  async function loadRoutes() {
    listEl.innerHTML = `<div class="loading">Cargando rutas…</div>`;
    const filter = FILTERS.find((f) => f.key === activeFilter);
    try {
      const { routes } = await api.getRoutes(filter.params);
      if (routes.length === 0) {
        listEl.innerHTML = `<div class="empty-state">Todavía no hay rutas acá.<br/>¡Sé el primero en trazar una!</div>`;
        return;
      }
      listEl.innerHTML = "";
      routes.forEach((r, i) => listEl.appendChild(routeCard(r, i)));
    } catch (err) {
      listEl.innerHTML = `<div class="error-banner">${err.message}</div>`;
    }
  }

  renderChips();
  loadRoutes();
}
