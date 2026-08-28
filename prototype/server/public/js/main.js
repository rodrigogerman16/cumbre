import { registerRoute, startRouter, navigate } from "./router.js";
import { renderNav } from "./components/nav.js";
import { renderLogin } from "./pages/login.js";
import { renderRegister } from "./pages/register.js";
import { renderFeed } from "./pages/feed.js";
import { renderRouteDetail } from "./pages/route-detail.js";
import { renderCreateRoute } from "./pages/create-route.js";
import { getUser, onSessionChange, clearSession } from "./state.js";
import { iconMountainOutline, iconUser } from "./icons.js";

registerRoute("/login", renderLogin);
registerRoute("/registro", renderRegister);
registerRoute("/feed", renderFeed);
registerRoute("/rutas/:id", renderRouteDetail);
registerRoute("/crear", renderCreateRoute);

registerRoute("/explorar", (container) => {
  container.innerHTML = `
    <div class="topbar"><div class="brand">${iconMountainOutline("#C1592B", 24)} Explorar</div></div>
    <div class="empty-state">Vista de mapa general — próximamente.<br/>Por ahora, mirá las rutas en el Feed.</div>
  `;
});

registerRoute("/perfil", (container) => {
  const user = getUser();
  if (!user) return navigate("/login");
  container.innerHTML = `
    <div class="topbar"><div class="brand">${iconUser("#1E2A1F", 22)} Perfil</div></div>
    <div style="padding:20px;">
      <div class="card" style="padding:18px; display:flex; align-items:center; gap:14px;">
        <div style="width:48px;height:48px;border-radius:999px;background:var(--pine-soft);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--pine);">${user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</div>
        <div>
          <div style="font-weight:700; font-size:15px;">${user.name}</div>
          <div style="font-size:12.5px; color:var(--ink-faint);">${user.email}</div>
        </div>
      </div>
      <button class="btn btn-outline" id="logout-btn" style="margin-top:20px;">Cerrar sesión</button>
    </div>
  `;
  container.querySelector("#logout-btn").addEventListener("click", () => {
    clearSession();
    navigate("/feed");
  });
});

onSessionChange(renderNav);
startRouter();
