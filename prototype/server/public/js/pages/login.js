import { api } from "../api.js";
import { setSession } from "../state.js";
import { navigate } from "../router.js";
import { iconMountainOutline } from "../icons.js";

export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-wrap">
      <div class="brand">${iconMountainOutline("#C1592B", 26)} Cumbre</div>
      <div class="auth-sub">Ingresá para trazar y compartir tus rutas</div>
      <div id="error-slot"></div>
      <form id="login-form">
        <div class="field">
          <label class="field-label">Email</label>
          <input type="email" name="email" required autocomplete="email" />
        </div>
        <div class="field">
          <label class="field-label">Contraseña</label>
          <input type="password" name="password" required autocomplete="current-password" />
        </div>
        <button class="btn btn-accent" type="submit">Ingresar</button>
      </form>
      <div class="auth-switch">¿No tenés cuenta? <a href="#/registro">Creá una</a></div>
    </div>
  `;

  const form = container.querySelector("#login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorSlot = container.querySelector("#error-slot");
    errorSlot.innerHTML = "";
    const fd = new FormData(form);
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      const { token, user } = await api.login(fd.get("email"), fd.get("password"));
      setSession(token, user);
      navigate("/feed");
    } catch (err) {
      errorSlot.innerHTML = `<div class="error-banner">${err.message}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
}
