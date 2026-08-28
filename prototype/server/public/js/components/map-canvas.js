// A hand-rolled "map" for tracing routes: a <canvas> painted with a
// stylized topographic background. There are no real map tiles here
// (OpenStreetMap/Mapbox both need network access this sandbox doesn't
// have) — coordinates are an abstract 400x280 virtual space, not real
// lat/lng. See schema.md for how this swaps for Leaflet + real tiles.

const VW = 400;
const VH = 280;
const HIT_RADIUS = 14;

const TYPE_COLOR = {
  REFUGIO: "#3F6B4A",
  AGUA: "#3A7CA5",
  MIRADOR: "#5B6B5A",
  PELIGRO: "#C1592B",
  CAMPAMENTO: "#5B6B5A",
  TECNICA: "#5B6B5A",
};

function contourPaths() {
  return [
    [[-10, 40], [80, 15], [150, 60], [230, 25], [300, 10], [360, 45], [410, 20]],
    [[-10, 85], [80, 55], [160, 105], [240, 65], [310, 45], [370, 85], [410, 60]],
    [[-10, 195], [90, 165], [160, 215], [240, 175], [310, 155], [370, 200], [410, 175]],
    [[-10, 235], [90, 210], [170, 255], [250, 220], [320, 195], [380, 235], [410, 215]],
  ];
}

function strokePolyline(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.stroke();
}

export function createMapCanvas({ height = 280, interactive = false } = {}) {
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  wrap.style.width = "100%";
  wrap.style.height = height + "px";
  wrap.style.borderRadius = "16px";
  wrap.style.overflow = "hidden";
  wrap.style.background = "#CFDDC3";

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.touchAction = "none";
  wrap.appendChild(canvas);

  const state = {
    geometry: [],
    waypoints: [],
    pickMode: null, // null | 'line' | 'pin'
    drag: null, // { kind: 'line'|'waypoint', index }
  };
  let onGeometryChange = null;
  let onPinPlace = null;
  let onWaypointDrag = null;

  function toVirtual(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VW,
      y: ((clientY - rect.top) / rect.height) * VH,
    };
  }

  function draw() {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform((canvas.width / VW), 0, 0, (canvas.height / VH), 0, 0);
    ctx.clearRect(0, 0, VW, VH);

    const grad = ctx.createLinearGradient(0, 0, VW, VH);
    grad.addColorStop(0, "#E3ECD9");
    grad.addColorStop(1, "#CFDDC3");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);

    ctx.strokeStyle = "#B8C9AA";
    ctx.lineWidth = 1.2;
    contourPaths().forEach((pts) => strokePolyline(ctx, pts));

    if (state.geometry.length >= 2) {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      state.geometry.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = "#C1592B";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (interactive) {
      state.geometry.forEach((p, i) => {
        const isLast = i === state.geometry.length - 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isLast ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isLast ? "#C1592B" : "#FFFFFF";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#C1592B";
        ctx.stroke();
      });
    }

    state.waypoints.forEach((w) => {
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.emphasized ? 9 : 7, 0, Math.PI * 2);
      ctx.fillStyle = TYPE_COLOR[w.type] || "#5B6B5A";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();
    });
  }

  function hitTest(v) {
    for (let i = state.waypoints.length - 1; i >= 0; i--) {
      const w = state.waypoints[i];
      if (Math.hypot(w.x - v.x, w.y - v.y) < HIT_RADIUS) return { kind: "waypoint", index: i };
    }
    for (let i = state.geometry.length - 1; i >= 0; i--) {
      const p = state.geometry[i];
      if (Math.hypot(p.x - v.x, p.y - v.y) < HIT_RADIUS) return { kind: "line", index: i };
    }
    return null;
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!interactive) return;
    canvas.setPointerCapture(e.pointerId);
    const v = toVirtual(e.clientX, e.clientY);
    const hit = hitTest(v);

    if (hit) {
      state.drag = hit;
      return;
    }

    if (state.pickMode === "line") {
      state.geometry.push({ x: v.x, y: v.y });
      draw();
      onGeometryChange && onGeometryChange([...state.geometry]);
    } else if (state.pickMode === "pin") {
      onPinPlace && onPinPlace(v.x, v.y);
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!state.drag) return;
    const v = toVirtual(e.clientX, e.clientY);
    v.x = Math.max(0, Math.min(VW, v.x));
    v.y = Math.max(0, Math.min(VH, v.y));
    if (state.drag.kind === "line") {
      state.geometry[state.drag.index] = v;
    } else {
      state.waypoints[state.drag.index] = { ...state.waypoints[state.drag.index], ...v };
    }
    draw();
  });

  canvas.addEventListener("pointerup", () => {
    if (!state.drag) return;
    const kind = state.drag.kind;
    const index = state.drag.index;
    state.drag = null;
    if (kind === "line") {
      onGeometryChange && onGeometryChange([...state.geometry]);
    } else {
      onWaypointDrag && onWaypointDrag(index, state.waypoints[index]);
    }
  });

  window.addEventListener("resize", draw);
  // Canvas may mount before layout settles; draw once more shortly after.
  requestAnimationFrame(draw);
  setTimeout(draw, 50);

  return {
    el: wrap,
    setGeometry(points) {
      state.geometry = points.map((p) => ({ x: p.x, y: p.y }));
      draw();
    },
    setWaypoints(points) {
      state.waypoints = points.map((p) => ({ ...p }));
      draw();
    },
    setPickMode(mode) {
      state.pickMode = mode;
    },
    removeLastPoint() {
      state.geometry.pop();
      draw();
      onGeometryChange && onGeometryChange([...state.geometry]);
    },
    onGeometryChange(fn) {
      onGeometryChange = fn;
    },
    onPinPlace(fn) {
      onPinPlace = fn;
    },
    onWaypointDrag(fn) {
      onWaypointDrag = fn;
    },
    redraw: draw,
  };
}

// --- GPX import (client-side, dependency-free) ---

export function parseGpxTrackPoints(gpxText) {
  const points = [];
  const re = /<trkpt[^>]*\slat="(-?\d+(?:\.\d+)?)"[^>]*\slon="(-?\d+(?:\.\d+)?)"/g;
  let match;
  while ((match = re.exec(gpxText))) {
    points.push({ lat: parseFloat(match[1]), lon: parseFloat(match[2]) });
  }
  return points;
}

export function projectToVirtual(latLonPoints, maxPoints = 40) {
  if (latLonPoints.length === 0) return [];

  let sampled = latLonPoints;
  if (latLonPoints.length > maxPoints) {
    const step = latLonPoints.length / maxPoints;
    sampled = Array.from({ length: maxPoints }, (_, i) => latLonPoints[Math.floor(i * step)]);
  }

  const lats = sampled.map((p) => p.lat);
  const lons = sampled.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const latSpan = maxLat - minLat || 1;
  const lonSpan = maxLon - minLon || 1;

  const pad = 30;
  const usableW = VW - pad * 2;
  const usableH = VH - pad * 2;

  return sampled.map((p) => ({
    x: pad + ((p.lon - minLon) / lonSpan) * usableW,
    y: pad + (1 - (p.lat - minLat) / latSpan) * usableH, // invert: north = up
  }));
}

export { VW, VH, TYPE_COLOR };
