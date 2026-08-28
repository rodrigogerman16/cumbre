import { api } from "../api.js";
import { getUser } from "../state.js";
import { navigate } from "../router.js";
import { createMapCanvas, parseGpxTrackPoints, projectToVirtual } from "../components/map-canvas.js";
import {
  iconBack, iconUndo, iconPin, iconFile, iconClose, iconUpload, iconInfo, WAYPOINT_TYPES,
} from "../icons.js";

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s ?? "";
  return div.innerHTML;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function renderCreateRoute(container) {
  if (!getUser()) {
    navigate("/login");
    return;
  }

  const formState = {
    source: "manual", // 'manual' | 'gpx'
    geometry: [],
    waypoints: [], // { tempId, x, y, type, title, description, isStageEnd, media: [{dataUrl, mimeType}] }
    routeType: "UN_DIA",
    difficulty: "MEDIA",
    routeMedia: [], // { dataUrl, mimeType } general gallery photos
  };
  let pickMode = "line";

  container.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="back-btn">${iconBack()}</button>
      <div style="font-family:var(--font-display); font-weight:700; font-size:16px;">Nueva ruta</div>
      <button class="btn-accent" id="publish-btn" style="border:none; border-radius:999px; padding:8px 16px; font-weight:700; font-size:13px;">Publicar</button>
    </div>

    <div style="padding:0 20px 16px 20px;">
      <div class="segmented" id="source-toggle">
        <div class="seg-opt active" data-source="manual">Dibujar en el mapa</div>
        <div class="seg-opt" data-source="gpx">Importar GPX</div>
      </div>
    </div>

    <div style="margin:0 20px;" id="map-mount"></div>

    <div id="gpx-panel" style="display:none; margin:14px 20px 0 20px;">
      <label class="btn btn-outline" style="display:flex; cursor:pointer;">
        ${iconFile("#1E2A1F", 17)} Elegir archivo .gpx
        <input type="file" accept=".gpx" id="gpx-input" style="display:none;" />
      </label>
      <div id="gpx-status" style="font-size:12px; color:var(--ink-faint); margin-top:8px;"></div>
    </div>

    <div style="padding:24px 20px 28px 20px;">
      <div class="field">
        <label class="field-label">Título de la ruta</label>
        <input type="text" id="f-title" placeholder="Ej: Travesía Frey a Jakob" />
      </div>

      <div class="field">
        <label class="field-label">Tipo de recorrido</label>
        <div class="segmented" id="type-toggle">
          <div class="seg-opt active" data-type="UN_DIA">1 día</div>
          <div class="seg-opt" data-type="MULTI_DIA">Multi-día (refugios)</div>
        </div>
      </div>

      <div class="field">
        <label class="field-label">Dificultad</label>
        <div class="segmented" id="difficulty-toggle">
          <div class="seg-opt" data-difficulty="FACIL">Fácil</div>
          <div class="seg-opt active" data-difficulty="MEDIA">Media</div>
          <div class="seg-opt" data-difficulty="DIFICIL">Difícil</div>
        </div>
      </div>

      <div style="display:flex; gap:12px;">
        <div class="field" style="flex:1;">
          <label class="field-label">Distancia (km)</label>
          <input type="number" id="f-distance" min="0" step="0.1" placeholder="42" />
        </div>
        <div class="field" style="flex:1;">
          <label class="field-label">Desnivel (m)</label>
          <input type="number" id="f-elevation" min="0" step="10" placeholder="2100" />
        </div>
      </div>

      <div class="field">
        <label class="field-label">Descripción</label>
        <textarea id="f-description" placeholder="Contales a otros trekkers qué encontrarán en el camino..."></textarea>
      </div>

      <div class="field">
        <label class="field-label">Fotos generales de la ruta</label>
        <div class="upload-row" id="route-media-row">
          <button class="upload-add" id="route-media-add">${iconUpload()}</button>
          <input type="file" accept="image/*,video/*" id="route-media-input" style="display:none;" multiple />
        </div>
      </div>

      <div id="waypoint-summary"></div>

      <div id="error-slot" style="margin-top:10px;"></div>
    </div>
  `;

  container.querySelector("#back-btn").addEventListener("click", () => history.back());

  // --- Map setup ---
  const mapMount = container.querySelector("#map-mount");
  const map = createMapCanvas({ height: 340, interactive: true });
  mapMount.appendChild(map.el);
  map.setPickMode("line");

  const toolbar = document.createElement("div");
  toolbar.className = "map-toolbar";
  toolbar.innerHTML = `
    <button class="map-tool-btn" id="undo-btn">${iconUndo()}</button>
    <button class="map-tool-btn active" id="line-mode-btn" style="background:var(--accent);">${iconPin("#fff")}</button>
  `;
  map.el.appendChild(toolbar);

  const hint = document.createElement("div");
  hint.className = "map-hint";
  hint.textContent = "Tocá el mapa para agregar puntos · mantené presionado un punto para moverlo";
  map.el.appendChild(hint);

  const undoBtn = toolbar.querySelector("#undo-btn");
  const lineModeBtn = toolbar.querySelector("#line-mode-btn");
  undoBtn.addEventListener("click", () => map.removeLastPoint());

  let addingWaypoint = false;
  lineModeBtn.addEventListener("click", () => {
    addingWaypoint = !addingWaypoint;
    pickMode = addingWaypoint ? "pin" : "line";
    map.setPickMode(pickMode);
    lineModeBtn.style.background = addingWaypoint ? "var(--ink)" : "var(--accent)";
    lineModeBtn.innerHTML = iconPin("#fff");
    hint.textContent = addingWaypoint
      ? "Tocá el mapa donde querés agregar una parada"
      : "Tocá el mapa para agregar puntos · mantené presionado un punto para moverlo";
  });

  map.onGeometryChange((geo) => {
    formState.geometry = geo;
  });

  map.onPinPlace((x, y) => openWaypointSheet({ x, y }));

  map.onWaypointDrag((index, pos) => {
    const wp = formState.waypoints[index];
    if (wp) {
      wp.x = pos.x;
      wp.y = pos.y;
    }
  });

  function syncMapWaypoints() {
    map.setWaypoints(formState.waypoints.map((w) => ({ x: w.x, y: w.y, type: w.type })));
  }

  function renderWaypointSummary() {
    const el = container.querySelector("#waypoint-summary");
    if (formState.waypoints.length === 0) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = `<div class="field-label" style="margin-top:4px;">Paradas agregadas (${formState.waypoints.length})</div>`;
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.gap = "8px";
    formState.waypoints.forEach((w) => {
      const t = WAYPOINT_TYPES[w.type];
      const item = document.createElement("div");
      item.style.cssText = "display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--surface); border:1px solid var(--border); border-radius:12px;";
      item.innerHTML = `
        <div class="chip-icon" style="width:32px;height:32px;background:${t.soft};">${t.icon(t.ink, 15)}</div>
        <div style="flex:1; font-size:13px; font-weight:600;">${escapeHtml(w.title)}${w.isStageEnd ? " · fin de etapa" : ""}</div>
      `;
      row.appendChild(item);
    });
    el.appendChild(row);
  }

  // --- Source toggle (manual / gpx) ---
  const sourceToggle = container.querySelector("#source-toggle");
  const gpxPanel = container.querySelector("#gpx-panel");
  sourceToggle.querySelectorAll(".seg-opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      sourceToggle.querySelectorAll(".seg-opt").forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      formState.source = opt.dataset.source;
      gpxPanel.style.display = formState.source === "gpx" ? "block" : "none";
    });
  });

  const gpxInput = container.querySelector("#gpx-input");
  const gpxStatus = container.querySelector("#gpx-status");
  gpxInput.addEventListener("change", async () => {
    const file = gpxInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const points = parseGpxTrackPoints(text);
      if (points.length < 2) {
        gpxStatus.textContent = "No se encontraron puntos de trazado (trkpt) en ese archivo.";
        return;
      }
      const projected = projectToVirtual(points);
      formState.geometry = projected;
      map.setGeometry(projected);
      gpxStatus.textContent = `Importado: ${points.length} puntos del GPX (simplificado a ${projected.length} para editar). Podés ajustar los puntos tocando el mapa.`;
    } catch (err) {
      gpxStatus.textContent = "No se pudo leer el archivo GPX.";
    }
  });

  // --- Type / difficulty toggles ---
  container.querySelector("#type-toggle").querySelectorAll(".seg-opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      container.querySelectorAll("#type-toggle .seg-opt").forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      formState.routeType = opt.dataset.type;
    });
  });
  container.querySelector("#difficulty-toggle").querySelectorAll(".seg-opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      container.querySelectorAll("#difficulty-toggle .seg-opt").forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      formState.difficulty = opt.dataset.difficulty;
    });
  });

  // --- Route-level media ---
  const routeMediaRow = container.querySelector("#route-media-row");
  const routeMediaInput = container.querySelector("#route-media-input");
  container.querySelector("#route-media-add").addEventListener("click", () => routeMediaInput.click());
  routeMediaInput.addEventListener("change", async () => {
    for (const file of routeMediaInput.files) {
      const dataUrl = await fileToDataUrl(file);
      formState.routeMedia.push({ dataUrl, mimeType: file.type });
      const thumb = file.type.startsWith("video")
        ? document.createElement("div")
        : document.createElement("img");
      if (thumb.tagName === "IMG") {
        thumb.src = dataUrl;
        thumb.className = "upload-thumb";
      } else {
        thumb.className = "upload-thumb";
        thumb.style.cssText += "background:var(--ink); display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; font-weight:700;";
        thumb.textContent = "VIDEO";
      }
      routeMediaRow.insertBefore(thumb, container.querySelector("#route-media-add"));
    }
    routeMediaInput.value = "";
  });

  // --- Waypoint sheet ---
  function openWaypointSheet(prefill) {
    const draft = { x: prefill.x, y: prefill.y, type: "REFUGIO", title: "", description: "", isStageEnd: false, media: [] };

    const overlay = document.createElement("div");
    overlay.className = "sheet-overlay";
    overlay.innerHTML = `
      <div class="sheet">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <div style="font-family:var(--font-display); font-weight:700; font-size:18px;">Agregar parada</div>
          <button class="icon-btn" id="sheet-close">${iconClose()}</button>
        </div>

        <div class="field">
          <label class="field-label">Tipo de parada</label>
          <div class="type-opt-row" id="type-opt-row"></div>
        </div>

        <div class="field">
          <label class="field-label">Título</label>
          <input type="text" id="w-title" placeholder="Ej: Refugio Jakob" />
        </div>

        <div class="field">
          <label class="field-label">Descripción</label>
          <textarea id="w-description" placeholder="Lo que otros trekkers necesitan saber de este punto..."></textarea>
        </div>

        <div class="toggle-row">
          <div style="padding-right:12px;">
            <div style="font-size:13.5px; font-weight:700;">Marcar como fin de etapa</div>
            <div style="font-size:11.5px; color:var(--ink-faint); margin-top:2px;">Divide la ruta en días a partir de este punto</div>
          </div>
          <button class="toggle-track off" id="w-stage-toggle"><div class="toggle-thumb" style="left:3px;"></div></button>
        </div>

        <div class="field" style="margin-top:18px;">
          <label class="field-label">Fotos y videos</label>
          <div class="upload-row" id="w-media-row">
            <button class="upload-add" id="w-media-add">${iconUpload()}</button>
            <input type="file" accept="image/*,video/*" id="w-media-input" style="display:none;" multiple />
          </div>
          <div class="moderation-note">${iconInfo()} Las imágenes se revisan automáticamente antes de publicarse. No se permite contenido sexual.</div>
        </div>

        <button class="btn btn-primary" id="w-save" style="margin-top:6px;">Guardar parada</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const typeRow = overlay.querySelector("#type-opt-row");
    Object.entries(WAYPOINT_TYPES).forEach(([key, t]) => {
      const opt = document.createElement("button");
      opt.className = "type-opt";
      opt.innerHTML = `
        <div class="type-icon" style="background:${t.soft}; ${key === draft.type ? `box-shadow:0 0 0 2px ${t.ink} inset;` : ""}">${t.icon(t.ink, 18)}</div>
        <div class="type-name ${key === draft.type ? "active" : ""}">${t.label}</div>
      `;
      opt.addEventListener("click", () => {
        draft.type = key;
        typeRow.querySelectorAll(".type-icon").forEach((el) => (el.style.boxShadow = "none"));
        typeRow.querySelectorAll(".type-name").forEach((el) => el.classList.remove("active"));
        opt.querySelector(".type-icon").style.boxShadow = `0 0 0 2px ${t.ink} inset`;
        opt.querySelector(".type-name").classList.add("active");
      });
      typeRow.appendChild(opt);
    });

    const stageToggle = overlay.querySelector("#w-stage-toggle");
    stageToggle.addEventListener("click", () => {
      draft.isStageEnd = !draft.isStageEnd;
      stageToggle.className = `toggle-track ${draft.isStageEnd ? "on" : "off"}`;
      stageToggle.querySelector(".toggle-thumb").style.left = draft.isStageEnd ? "21px" : "3px";
    });

    const wMediaRow = overlay.querySelector("#w-media-row");
    const wMediaInput = overlay.querySelector("#w-media-input");
    overlay.querySelector("#w-media-add").addEventListener("click", () => wMediaInput.click());
    wMediaInput.addEventListener("change", async () => {
      for (const file of wMediaInput.files) {
        const dataUrl = await fileToDataUrl(file);
        draft.media.push({ dataUrl, mimeType: file.type });
        const thumb = document.createElement(file.type.startsWith("video") ? "div" : "img");
        thumb.className = "upload-thumb";
        if (thumb.tagName === "IMG") thumb.src = dataUrl;
        else {
          thumb.style.cssText += "background:var(--ink); display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; font-weight:700;";
          thumb.textContent = "VIDEO";
        }
        wMediaRow.insertBefore(thumb, overlay.querySelector("#w-media-add"));
      }
      wMediaInput.value = "";
    });

    function close() {
      overlay.remove();
    }
    overlay.querySelector("#sheet-close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector("#w-save").addEventListener("click", () => {
      const title = overlay.querySelector("#w-title").value.trim();
      if (!title) {
        overlay.querySelector("#w-title").style.borderColor = "var(--danger)";
        return;
      }
      draft.title = title;
      draft.description = overlay.querySelector("#w-description").value.trim();
      draft.tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      formState.waypoints.push(draft);
      syncMapWaypoints();
      renderWaypointSummary();
      close();
    });
  }

  // --- Publish ---
  container.querySelector("#publish-btn").addEventListener("click", async () => {
    const errorSlot = container.querySelector("#error-slot");
    errorSlot.innerHTML = "";

    const title = container.querySelector("#f-title").value.trim();
    const description = container.querySelector("#f-description").value.trim();
    const distanceKm = parseFloat(container.querySelector("#f-distance").value) || 0;
    const elevationGainM = parseInt(container.querySelector("#f-elevation").value, 10) || 0;

    if (!title) {
      errorSlot.innerHTML = `<div class="error-banner">Ponele un título a la ruta</div>`;
      return;
    }
    if (formState.geometry.length < 2) {
      errorSlot.innerHTML = `<div class="error-banner">Trazá al menos 2 puntos en el mapa (o importá un GPX)</div>`;
      return;
    }

    const publishBtn = container.querySelector("#publish-btn");
    publishBtn.disabled = true;
    publishBtn.textContent = "Publicando…";

    try {
      const { route } = await api.createRoute({
        title,
        description,
        type: formState.routeType,
        difficulty: formState.difficulty,
        distanceKm,
        elevationGainM,
        geometry: formState.geometry,
        source: formState.source,
      });

      for (const w of formState.waypoints) {
        const { waypoint } = await api.addWaypoint(route.id, {
          order: formState.waypoints.indexOf(w),
          x: w.x,
          y: w.y,
          type: w.type,
          title: w.title,
          description: w.description,
          isStageEnd: w.isStageEnd,
        });
        for (const m of w.media) {
          await api.uploadMedia(route.id, { dataUrl: m.dataUrl, waypointId: waypoint.id });
        }
      }

      for (const m of formState.routeMedia) {
        await api.uploadMedia(route.id, { dataUrl: m.dataUrl });
      }

      navigate(`/rutas/${route.id}`);
    } catch (err) {
      errorSlot.innerHTML = `<div class="error-banner">${err.message}</div>`;
      publishBtn.disabled = false;
      publishBtn.textContent = "Publicar";
    }
  });
}
