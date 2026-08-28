const routes = []; // { regex, keys, render }

function toRegex(pattern) {
  const keys = [];
  const regex = pattern.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
    keys.push(key);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${regex}$`), keys };
}

export function registerRoute(pattern, render) {
  const { regex, keys } = toRegex(pattern);
  routes.push({ regex, keys, render });
}

let currentCleanup = null;

async function renderCurrent() {
  const hash = location.hash.replace(/^#/, "") || "/feed";
  const container = document.getElementById("app");

  for (const r of routes) {
    const match = r.regex.exec(hash);
    if (!match) continue;
    const params = {};
    r.keys.forEach((key, i) => (params[key] = decodeURIComponent(match[i + 1])));

    if (typeof currentCleanup === "function") {
      try { currentCleanup(); } catch { /* ignore */ }
    }
    container.innerHTML = "";
    currentCleanup = await r.render(container, params);
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent("route:changed", { detail: { hash } }));
    return;
  }

  container.innerHTML = `<div class="empty-state">Página no encontrada</div>`;
}

export function navigate(path) {
  location.hash = path;
}

export function startRouter() {
  window.addEventListener("hashchange", renderCurrent);
  renderCurrent();
}
