import { iconHome, iconCompass, iconPlus, iconUser, iconBookmark } from "../icons.js";
import { navigate } from "../router.js";
import { getUser } from "../state.js";

const ITEMS = [
  { path: "/feed", label: "Feed", icon: iconHome },
  { path: "/explorar", label: "Explorar", icon: iconCompass },
];

export function renderNav() {
  const el = document.getElementById("bottom-nav");
  const hash = location.hash.replace(/^#/, "") || "/feed";
  const user = getUser();

  el.innerHTML = "";

  const homeBtn = navItem(ITEMS[0], hash.startsWith("/feed"));
  const exploreBtn = navItem(ITEMS[1], hash.startsWith("/explorar"));

  const createBtn = document.createElement("button");
  createBtn.className = "nav-create";
  createBtn.innerHTML = iconPlus();
  createBtn.addEventListener("click", () => navigate(user ? "/crear" : "/login"));

  const savedBtn = document.createElement("button");
  savedBtn.className = "nav-item";
  savedBtn.innerHTML = `${iconBookmark("#95A192", 21)}<span>Guardados</span>`;

  const profileBtn = document.createElement("button");
  profileBtn.className = `nav-item${hash.startsWith("/perfil") ? " active" : ""}`;
  profileBtn.innerHTML = `${iconUser(hash.startsWith("/perfil") ? "#C1592B" : "#95A192", 21)}<span>${user ? "Perfil" : "Ingresar"}</span>`;
  profileBtn.addEventListener("click", () => navigate(user ? "/perfil" : "/login"));

  el.append(homeBtn, exploreBtn, createBtn, savedBtn, profileBtn);
}

function navItem(item, active) {
  const btn = document.createElement("button");
  btn.className = `nav-item${active ? " active" : ""}`;
  btn.innerHTML = `${item.icon(active ? "#C1592B" : "#95A192", 21)}<span>${item.label}</span>`;
  btn.addEventListener("click", () => navigate(item.path));
  return btn;
}

document.addEventListener("route:changed", renderNav);
