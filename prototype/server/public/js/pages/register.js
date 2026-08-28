import { api } from "../api.js";
import { setSession } from "../state.js";
import { navigate } from "../router.js";
import { iconMountainOutline } from "../icons.js";

export function renderRegister(container) {
  container.innerHTML = `
    <div class="auth-wrap">
      <div class="brand">${iconMountainOutline("#C1592B", 26)} Cumbre</div>
      <div class="auth-sub">Creá tu cuenta para empezar a trazar rutas</div>
      <div id="error-slot"></div>
      <form id="register-form">
        <div class="field">
          <label class="field-label">Nombre</label>
          <input type="text" name="name" required autocomplete="name" />
        </div>
        <div class="field">
          <label class="field-label">Email</label>
          <input type="email" name="email" required autocomplete="email" />
        </div>
        <div class="field">
          <label class="field-label">Contraseña</label>
          <input type="password" name="password" required minlength="6" autocomplete="new-password" />
        </div>
        <button class="btn btn-accent" type="submit">Crear cuenta</button>
      </form>
      <div class="auth-switch">¿Ya tenés cuenta? <a href="#/login">Ingresá</a></div>
    </div>
  `;

  const form = container.querySelector("#register-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorSlot = container.querySelector("#error-slot");
    errorSlot.innerHTML = "";
    const fd = new FormData(form);
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      const { token, user } = await api.register(fd.get("email"), fd.get("password"), fd.get("name"));
      setSession(token, user);
      navigate("/feed");
    } catch (err) {
      errorSlot.innerHTML = `<div class="error-banner">${err.message}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
}
