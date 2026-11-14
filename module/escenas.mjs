/**
 * Escenas, sonido y navegación:
 *  - las calaveras del mapa de París llevan a la escena de su localización (y cada escena tiene su nota de vuelta al mapa);
 *  - los decorados 16:9 cubren toda la pantalla;
 *  - efectos de sonido del sistema y la partitura por situaciones del manual cuando no la lleva MR- Dirección.
 */
import { ID, RUTA } from "./mesa.mjs";
import { PISTAS, LOCALIZACIONES, AMENAZAS } from "./datos.mjs";
import { mision, escuadron, vampiros, cambiarMision } from "./mesa.mjs";
import { VERSION_CONTENIDO } from "./banda-sonora-datos.mjs";

const AUDIO = `${RUTA}/assets/audio`;
export const escenaDe = clave => game.scenes.find(s => s.getFlag(ID, "escena") === clave);

/** Efecto de sonido para toda la mesa (lo lanza quien provoca el efecto). */
export function sonar(clave, volumen = 0.7) {
  try {
    if (!game.settings.get(ID, "sonidos")) return;
    foundry.audio.AudioHelper.play({ src: `${AUDIO}/${clave.includes("/") ? clave : `sfx/${clave}`}.ogg?v=${VERSION_CONTENIDO}`, volume: volumen, autoplay: true, loop: false }, true);
  } catch (e) { console.warn(`${ID} | no se pudo reproducir «${clave}»`, e); }
}

const lista = () => game.playlists.find(p => p.getFlag(ID, "clave") === "musica");
/** Pone una pista de la banda sonora (solo GM) parando la que sonase. Sin argumento, silencio. */
export async function musica(clave = "") {
  if (!game.user.isGM) return;
  if (game.modules.get("mr-direccion")?.active) return ui.notifications.info("Con MR- Dirección activo, la música se lleva desde su barra.");
  const p = lista();
  if (!p) return ui.notifications.warn("Importa primero la misión: la banda sonora viene en el compendio.");
  const sonido = p.sounds.find(s => s.getFlag(ID, "clave") === clave);
  await p.stopAll();
  if (sonido) await p.playSound(sonido);
}
export const pistaSonando = () => lista()?.sounds.find(s => s.playing)?.getFlag(ID, "clave") ?? "";
/** Las pistas que hay de verdad en la lista importada (con su obra). */
export const catalogoMusica = () => (lista()?.sounds.contents ?? []).sort((a, b) => a.sort - b.sort).map(s => { const id = s.getFlag(ID, "clave"); return { id, titulo: PISTAS[id]?.[0] ?? s.name, obra: PISTAS[id]?.[1] ?? "" }; });

/**
 * Tablón del mapa de París: sobre las dos notas amarillas del mapa se escribe, con datos vivos, el nombre de la campaña (la pequeña)
 * y el escuadrón con sus jugadores, retratos y el avance (la grande). Va dentro de #hud, que Foundry mueve y escala con el mapa.
 */
const NOTAS = { campana: [150, 232, 1010, 300], equipo: [2390, 270, 1240, 700] };   // x, y, ancho, alto en píxeles del mapa (4000 × 2473)
let eligiendo = false;   // quien dirige está marcando quién juega (solo en su pantalla)
export function pintarTablon() {
  document.getElementById("er-tablon")?.remove();
  const hud = document.getElementById("hud");
  if (!hud || !globalThis.canvas?.ready || canvas.scene?.getFlag(ID, "escena") !== "paris") return;
  const esc = t => foundry.utils.escapeHTML(String(t ?? ""));
  const m = mision(), d = canvas.dimensions, k = d.sceneWidth / 4000;
  const caja = ([x, y, w, h]) => `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  const gm = game.user.isGM, elige = gm && eligiendo, banquillo = m.banquillo ?? [];
  const filas = (elige ? vampiros() : escuadron()).map(v => {
    const duenos = game.users.filter(u => !u.isGM && v.testUserPermission(u, "OWNER")).map(u => u.name);
    const heridas = v.system.lesiones.flat().filter(l => l.marcada).length;
    const estado = v.system.muerto ? "ha caído" : v.system.derribado ? "derribado" : `sangre ${v.system.sangre}${heridas ? ` · ${heridas} lesión${heridas > 1 ? "es" : ""}` : ""}`;
    const fuera = banquillo.includes(v.id), E = elige ? "button" : "div";
    return `<${E} ${elige ? `type="button" data-juega="${v.id}" aria-pressed="${!fuera}"` : ""} class="er-tb-fila ${v.system.muerto ? "caido" : ""} ${fuera ? "fuera" : ""}"><img src="${esc(v.prototypeToken?.texture?.src || v.img)}" data-lupa="${esc(v.img)}" data-lupa-espera="1000" data-ficha="${v.id}" alt=""><div><b>${esc(v.name)}</b><span>${esc(duenos.join(", ") || "sin jugador")}</span><i>${esc(elige ? (fuera ? "no juega" : "juega") : estado)}</i></div></${E}>`;
  }).join("");
  const visitadas = LOCALIZACIONES.filter(l => (m.visitadas ?? []).includes(l.clave));
  const actual = LOCALIZACIONES.find(l => l.nombre === m.escena);
  const frente = actual?.sector ?? (visitadas.length ? Math.min(...visitadas.map(l => l.sector)) : 0);
  const sectores = [3, 2, 1].map(s => `<span class="${frente && s > frente ? "hecho" : s === frente ? "ahora" : ""}">Sector ${s}</span>`).join("");
  const uber = AMENAZAS.filter(a => a.uber).length;
  const t = document.createElement("div");
  t.id = "er-tablon";
  t.style.cssText = `left:${d.sceneX}px;top:${d.sceneY}px;width:4000px;height:2473px;transform-origin:0 0;transform:scale(${k})`;
  t.innerHTML = `<div class="er-tb er-tb-campana" style="${caja(NOTAS.campana)}"><small>Operación</small><b>${esc(game.settings.get(ID, "campana") || game.world.title)}</b></div>
    <div class="er-tb er-tb-equipo" style="${caja(NOTAS.equipo)}"><div class="er-tb-cab"><h3>Escuadrón F.A.N.G.</h3>${gm ? `<button type="button" data-tb="elegir" aria-pressed="${elige}">${elige ? "Hecho" : "¿Quién juega?"}</button><button type="button" data-tb="reiniciar">Reiniciar</button>` : ""}</div><div class="er-tb-lista">${filas || "<span>Aún no hay vampiros.</span>"}</div>
      <div class="er-tb-avance"><div class="er-tb-sectores">${sectores}</div>
        ${actual ? `Ahora: <b>${esc(actual.nombre)}</b> · ronda ${m.ronda}<br>` : m.desplegado ? "" : "Elegid el punto de despliegue en el Sector 3.<br>"}Localizaciones: <b>${visitadas.length}</b> · Übermenschen caídos: <b>${(m.caidos ?? []).length}/${uber}</b></div></div>`;
  // Escenas resueltas: la calavera desaparece y queda el nombre, tachado.
  const resueltas = m.resueltas ?? [];
  for (const nota of canvas.scene?.notes ?? []) {
    const l = LOCALIZACIONES.find(x => x.clave === nota.getFlag(ID, "ir"));
    if (!l || !resueltas.includes(l.clave)) continue;
    const r = document.createElement("div");
    r.className = "er-tb-resuelta"; r.style.cssText = `left:${(nota.x - d.sceneX) / k}px;top:${(nota.y - d.sceneY) / k}px`;
    r.innerHTML = `<span>${esc(l.nombre)}</span>`;
    t.append(r);
  }
  for (const n of canvas.notes?.placeables ?? []) if (n.controlIcon) n.controlIcon.alpha = resueltas.includes(n.document.getFlag(ID, "ir")) ? 0 : 1;
  // Doble clic en un retrato: su ficha, para quien tenga permiso.
  t.addEventListener("dblclick", ev => {
    const actor = game.actors.get(ev.target.closest("[data-ficha]")?.dataset.ficha);
    if (actor && !eligiendo && actor.testUserPermission(game.user, "OBSERVER")) actor.sheet.render(true);
  });
  t.addEventListener("click", ev => {
    const id = ev.target.closest("[data-juega]")?.dataset.juega, que = ev.target.closest("[data-tb]")?.dataset.tb;
    if (id) cambiarMision(x => { x.banquillo = x.banquillo.includes(id) ? x.banquillo.filter(y => y !== id) : [...x.banquillo, id]; if (x.turno === id) x.turno = ""; });
    if (que === "elegir") { eligiendo = !eligiendo; pintarTablon(); }
    if (que === "reiniciar") game.mrEatTheReich.reiniciarPartida();
  });
  hud.append(t);
  Hooks.callAll("eatthereich.tablon", t, m, k);
}

export function registrarEscenas() {
  // El contenedor #hud se vuelve a pintar al cargar el lienzo: se repinta el tablón después, y cada vez que Foundry lo rehace.
  Hooks.on("canvasReady", () => { pintarTablon(); setTimeout(pintarTablon, 400); setTimeout(pintarTablon, 1600); });
  Hooks.on("renderHeadsUpDisplayContainer", () => setTimeout(pintarTablon, 0));
  Hooks.on("eatthereich.mision", () => pintarTablon());
  Hooks.on("refreshNote", n => { if (n.controlIcon && (mision().resueltas ?? []).includes(n.document.getFlag(ID, "ir"))) n.controlIcon.alpha = 0; });
  for (const h of ["updateActor", "createActor", "deleteActor", "updateUser"]) Hooks.on(h, () => pintarTablon());

  game.settings.register(ID, "sonidos", {
    name: "Efectos de sonido", hint: "El golpe del resultado, los críticos, las lesiones, la sirena de los refuerzos… Para toda la mesa.",
    scope: "world", config: true, type: Boolean, default: true
  });

  // Doble clic en una calavera del mapa: quien dirige lleva la mesa a esa escena (Mayús + doble clic abre el diario; Alt + doble clic, solo mirar).
  Hooks.on("activateNote", (nota, opciones) => {
    const ir = nota.document.getFlag(ID, "ir");
    if (!ir || !game.user.isGM || globalThis.event?.shiftKey) return;
    const escena = escenaDe(ir);
    if (!escena) return;
    // Se activa (va toda la mesa y cambia la música de la escena); con Alt, quien dirige solo se asoma.
    if (globalThis.event?.altKey) escena.view(); else escena.activate();
    return false;
  });

  // Los decorados cubren la pantalla: Foundry encaja la escena entera y deja bandas si la pantalla no es 16:9.
  const cubrir = lienzo => {
    const clave = lienzo?.scene?.getFlag(ID, "escena");
    if (!clave || clave === "paris") return;
    const r = lienzo.dimensions.sceneRect, p = lienzo.app.screen;
    lienzo.pan({ x: r.x + r.width / 2, y: r.y + r.height / 2, scale: Math.max(p.width / r.width, p.height / r.height) });
  };
  Hooks.on("canvasReady", lienzo => setTimeout(() => cubrir(lienzo), 50));
  window.addEventListener("resize", () => { if (globalThis.canvas?.ready) cubrir(globalThis.canvas); });
}
