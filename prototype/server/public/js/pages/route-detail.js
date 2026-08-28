import { api } from "../api.js";
import { getUser } from "../state.js";
import { navigate } from "../router.js";
import { createMapCanvas } from "../components/map-canvas.js";
import {
  iconBack, iconBookmark, iconShare, iconMountainOutline, iconMountainFilled,
  iconPlay, WAYPOINT_TYPES, DIFFICULTY_COLOR, DIFFICULTY_LABEL,
} from "../icons.js";

function computeDayBadges(waypoints) {
  const stageEnds = waypoints.filter((w) => w.isStageEnd);
  const dayCount = stageEnds.length + 1;
  const badges = ["Día 1"];
  for (let i = 1; i < dayCount; i++) badges.push(`Día ${i + 1} · ${stageEnds[i - 1].title}`);
  return badges;
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s ?? "";
  return div.innerHTML;
}

export async function renderRouteDetail(container, params) {
  container.innerHTML = `<div class="loading">Cargando ruta…</div>`;

  let route;
  try {
    ({ route } = await api.getRoute(params.id));
  } catch (err) {
    container.innerHTML = `<div class="error-banner">${err.message}</div>`;
    return;
  }

  const dayBadges = route.type === "MULTI_DIA" ? computeDayBadges(route.waypoints) : null;
  const routeMedia = route.media.filter((m) => !m.waypointId);

  container.innerHTML = `
    <div class="hero-map" id="hero-map"></div>
    <div style="padding:18px 20px 0 20px;">
      ${dayBadges ? `<div style="display:flex; gap:8px; margin-bottom:14px; overflow-x:auto;">${dayBadges.map((d, i) => `<div class="pill ${i === 0 ? "dark" : "outline"}" style="flex-shrink:0;">${escapeHtml(d)}</div>`).join("")}</div>` : ""}

      <div style="font-family:var(--font-display); font-weight:800; font-size:23px; line-height:1.2;">${escapeHtml(route.title)}</div>

      <div style="display:flex; align-items:center; gap:8px; margin-top:10px;">
        <div style="width:24px;height:24px;border-radius:999px;background:var(--pine-soft);display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;color:var(--pine);">${(route.author?.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</div>
        <div style="font-size:13px; color:var(--ink-faint);">por ${escapeHtml(route.author?.name || "alguien")}</div>
      </div>

      <div class="stat-grid" style="margin-top:20px; padding:16px; background:var(--surface-alt); border-radius:14px;">
        <div class="stat"><div class="stat-val">${route.distanceKm} km</div><div class="stat-label">Distancia</div></div>
        <div class="stat"><div class="stat-val">+${route.elevationGainM} m</div><div class="stat-label">Desnivel</div></div>
        <div class="stat"><div class="stat-val">${route.type === "MULTI_DIA" ? (dayBadges?.length || 1) + " días" : "1 día"}</div><div class="stat-label">Duración</div></div>
        <div class="stat"><div class="stat-val" style="color:${DIFFICULTY_COLOR[route.difficulty]};">${DIFFICULTY_LABEL[route.difficulty]}</div><div class="stat-label">Dificultad</div></div>
      </div>

      ${route.description ? `
      <div class="section-title" style="margin-top:24px;">Sobre esta ruta</div>
      <div style="font-size:14px; line-height:1.55; color:#3E4A3D;">${escapeHtml(route.description)}</div>` : ""}

      <div class="section-title" style="margin-top:26px;">Paradas del recorrido (${route.waypoints.length})</div>
      <div class="chip-row" id="waypoint-chips"></div>
      <div id="waypoint-detail" style="margin-top:14px;"></div>

      ${routeMedia.length ? `
      <div class="section-title" style="margin-top:26px;">Galería</div>
      <div class="media-grid">${routeMedia.map((m) => mediaCell(m)).join("")}</div>` : ""}
    </div>

    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:26px; padding:16px 20px; background:var(--surface); border-top:1px solid var(--border);">
      <button id="react-btn" style="display:flex; align-items:center; gap:8px; padding:10px 16px; background:${route.reactedByMe ? "var(--accent-soft)" : "var(--surface-alt)"}; border-radius:999px; border:none;">
        ${route.reactedByMe ? iconMountainFilled("#C1592B", 19) : iconMountainOutline("var(--ink-soft)", 19)}
        <span id="react-count" style="font-size:14px; font-weight:700; color:${route.reactedByMe ? "var(--accent-soft-ink)" : "var(--ink-soft)"};">${route.reactionCount}</span>
      </button>
      <div style="display:flex; align-items:center; gap:18px;">
        ${iconBookmark("var(--ink-soft)", 20)}
        ${iconShare("var(--ink-soft)", 20)}
      </div>
    </div>
  `;

  // Back button + bookmark overlay on the hero
  const heroWrap = container.querySelector("#hero-map");
  const map = createMapCanvas({ height: 280, interactive: false });
  map.setGeometry(route.geometry);
  map.setWaypoints(route.waypoints.map((w) => ({ x: w.x, y: w.y, type: w.type })));
  heroWrap.appendChild(map.el);

  const overlayBack = document.createElement("button");
  overlayBack.className = "icon-btn on-image";
  overlayBack.style.position = "absolute";
  overlayBack.style.top = "16px";
  overlayBack.style.left = "16px";
  overlayBack.innerHTML = iconBack();
  overlayBack.addEventListener("click", () => history.back());
  heroWrap.appendChild(overlayBack);

  const overlaySave = document.createElement("button");
  overlaySave.className = "icon-btn on-image";
  overlaySave.style.position = "absolute";
  overlaySave.style.top = "16px";
  overlaySave.style.right = "16px";
  overlaySave.innerHTML = iconBookmark("#1E2A1F", 16);
  heroWrap.appendChild(overlaySave);

  // Waypoint chips
  const chipsEl = container.querySelector("#waypoint-chips");
  const detailEl = container.querySelector("#waypoint-detail");
  route.waypoints.forEach((w) => {
    const t = WAYPOINT_TYPES[w.type];
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.style.cursor = "pointer";
    chip.innerHTML = `
      <div class="chip-icon" style="background:${t.soft};">${t.icon(t.ink, 18)}</div>
      <div class="chip-label">${escapeHtml(w.title)}${w.kmMark != null ? ` · km ${w.kmMark}` : ""}</div>
    `;
    chip.addEventListener("click", () => renderWaypointDetail(w));
    chipsEl.appendChild(chip);
  });

  function renderWaypointDetail(w) {
    const t = WAYPOINT_TYPES[w.type];
    const media = route.media.filter((m) => m.waypointId === w.id);
    detailEl.innerHTML = `
      <div class="card" style="display:flex; gap:12px; padding:12px;">
        ${media[0] ? `<img src="${media[0].url}" style="width:76px;height:76px;object-fit:cover;border-radius:10px;flex-shrink:0;" />` : `<div style="width:76px;height:76px;border-radius:10px;background:${t.soft};flex-shrink:0; display:flex; align-items:center; justify-content:center;">${t.icon(t.ink, 26)}</div>`}
        <div style="flex:1;">
          <span class="pill soft" style="padding:3px 9px; font-size:10.5px;">${t.label}${w.isStageEnd ? " · fin de etapa" : ""}</span>
          <div style="font-weight:700; font-size:14px; margin-top:5px;">${escapeHtml(w.title)}</div>
          ${w.description ? `<div style="font-size:12.5px; color:var(--ink-soft); line-height:1.4; margin-top:3px;">${escapeHtml(w.description)}</div>` : ""}
        </div>
      </div>
    `;
  }
  if (route.waypoints.length) renderWaypointDetail(route.waypoints[0]);

  // Reaction toggle
  const reactBtn = container.querySelector("#react-btn");
  reactBtn.addEventListener("click", async () => {
    if (!getUser()) return navigate("/login");
    reactBtn.disabled = true;
    try {
      const { reacted, count } = await api.react(route.id);
      route.reactedByMe = reacted;
      route.reactionCount = count;
      reactBtn.style.background = reacted ? "var(--accent-soft)" : "var(--surface-alt)";
      reactBtn.innerHTML = `${reacted ? iconMountainFilled("#C1592B", 19) : iconMountainOutline("var(--ink-soft)", 19)}<span id="react-count" style="font-size:14px; font-weight:700; color:${reacted ? "var(--accent-soft-ink)" : "var(--ink-soft)"};">${count}</span>`;
    } finally {
      reactBtn.disabled = false;
    }
  });
}

function mediaCell(m) {
  if (m.type === "VIDEO") {
    return `<div style="position:relative; border-radius:8px; overflow:hidden;"><video src="${m.url}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block;"></video><div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.15);">${iconPlay("#fff", 22)}</div></div>`;
  }
  return `<img src="${m.url}" />`;
}
