/**
 * Estado compartido de la misión (ajuste de mundo): escena, ronda, Objetivos, Amenazas y quién ha actuado.
 * Solo un GM escribe ajustes de mundo: los jugadores piden las operaciones por socket y las ejecuta el GM activo.
 */
import { olvidarTodo } from "./memoria.mjs";
import { ApplicationV2 } from "./compat.mjs";

export const ID = "mr-eat-the-reich";
export const SOCKET = `system.${ID}`;
export const RUTA = `systems/${ID}`;
export const ARTE = `${RUTA}/assets`;

export const MISION_INICIAL = { escena: "", ronda: 1, objetivos: [], amenazas: [], actuaron: [], turno: "", fuera: [], visitadas: [], caidos: [], banquillo: [], diana: "", desplegado: "", despliegue: null };

class RestablecerVentanas extends ApplicationV2 {
  async render() {
    olvidarTodo();
    ui.notifications.info("Posiciones, tamaños y pestañas olvidadas en este navegador.");
    return this;
  }
}

export function registrarAjustes() {
  game.settings.register(ID, "mision", {
    scope: "world", config: false, type: Object, default: MISION_INICIAL,
    onChange: () => Hooks.callAll("eatthereich.mision", mision())
  });
  game.settings.register(ID, "importada", { scope: "world", config: false, type: Boolean, default: false });
  game.settings.register(ID, "bienvenida", { scope: "world", config: false, type: String, default: "" });
  game.settings.register(ID, "derribo", {
    name: "Ataques sin defender que derriban",
    hint: "El manual dice 3 en la página de reglas y en la hoja de referencia, y 4 en el apartado de bajas. Elige el que use tu mesa.",
    scope: "world", config: true, type: Number, default: 3, choices: { 3: "3 ataques", 4: "4 ataques" }
  });
  game.settings.register(ID, "campana", {
    name: "Nombre de la campaña", hint: "Sale en la nota amarilla pequeña del mapa de París. Vacío = el título del mundo.",
    scope: "world", config: true, type: String, default: "", onChange: () => Hooks.callAll("eatthereich.mision", mision())
  });
  game.settings.register(ID, "escalaAtaud", {
    name: "Tamaño de la hoja-ataúd",
    hint: "0 = automático (lo que quepa en tu pantalla). Ajuste de este navegador.",
    scope: "client", config: true, type: Number, default: 0, range: { min: 0, max: 1.3, step: 0.05 },
    onChange: () => { for (const app of foundry.applications.instances.values()) if (app.element?.classList.contains("er-hoja-ataud")) app.render(); }
  });
  game.settings.registerMenu(ID, "ventanas", {
    name: "Memoria de ventanas", label: "Olvidar posiciones",
    hint: "Las ventanas del sistema recuerdan posición, tamaño, pestaña y secciones plegadas en este navegador.",
    icon: "fa-solid fa-window-restore", type: RestablecerVentanas, restricted: false
  });
}

export const mision = () => foundry.utils.mergeObject(foundry.utils.deepClone(MISION_INICIAL), foundry.utils.deepClone(game.settings.get(ID, "mision") ?? {}), { inplace: false });

/** Solo GM. `fn` recibe una copia de la misión y la modifica. */
export async function cambiarMision(fn) {
  if (!game.user.isGM) return;
  const m = mision();
  await fn(m);
  return game.settings.set(ID, "mision", m);
}

export const nuevoId = () => foundry.utils.randomID(8);
export const vampiros = () => game.actors.filter(a => a.type === "vampiro");
/** Los vampiros que juegan esta partida: todos menos los que quien dirige deja en el banquillo (Panel de misión → Quién juega). */
export const escuadron = () => { const b = mision().banquillo ?? []; return vampiros().filter(v => !b.includes(v.id)); };

const OPERACIONES = {};
/** Registra una operación que ejecuta el GM activo: fn(datos, usuarioQueLaPide). */
export const operacion = (op, fn) => { OPERACIONES[op] = fn; };

/** Pide una operación: si soy el GM activo la hago; si no, se la mando. */
export function pedir(op, datos = {}) {
  if (game.users.activeGM?.isSelf) return OPERACIONES[op]?.(datos, game.user);
  if (!game.users.activeGM) return ui.notifications.warn("Hace falta que quien dirige esté conectado.");
  game.socket.emit(SOCKET, { op, datos });
}

export function escucharSocket() {
  game.socket.on(SOCKET, ({ op, datos } = {}, de) => {
    if (!op || !game.users.activeGM?.isSelf) return;
    const quien = game.users.get(de);
    if (quien) OPERACIONES[op]?.(datos ?? {}, quien);
  });
}
