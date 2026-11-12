/**
 * Escenas, sonido y navegación:
 *  - las calaveras del mapa de París llevan a la escena de su localización (y cada escena tiene su nota de vuelta al mapa);
 *  - los decorados 16:9 cubren toda la pantalla;
 *  - efectos de sonido del sistema y la banda sonora (música clásica) cuando no la lleva MR- Dirección.
 */
import { ID, RUTA } from "./mesa.mjs";
import { PISTAS } from "./datos.mjs";

const AUDIO = `${RUTA}/assets/audio`;
export const escenaDe = clave => game.scenes.find(s => s.getFlag(ID, "escena") === clave);

/** Efecto de sonido para toda la mesa (lo lanza quien provoca el efecto). */
export function sonar(clave, volumen = 0.7) {
  try {
    if (!game.settings.get(ID, "sonidos")) return;
    foundry.audio.AudioHelper.play({ src: `${AUDIO}/sfx/${clave}.ogg`, volume: volumen, autoplay: true, loop: false }, true);
  } catch (e) { console.warn(`${ID} | no se pudo reproducir «${clave}»`, e); }
}

const lista = () => game.playlists.find(p => p.getFlag(ID, "clave") === "musica");
/** Pone una pista de la banda sonora (solo GM) parando la que sonase. Sin argumento, silencio. */
export async function musica(clave = "") {
  if (!game.user.isGM) return;
  const p = lista();
  if (!p) return ui.notifications.warn("Importa primero la misión: la banda sonora viene en el compendio.");
  const sonido = p.sounds.find(s => s.getFlag(ID, "clave") === clave);
  await p.stopAll();
  if (sonido) await p.playSound(sonido);
}
export const pistaSonando = () => lista()?.sounds.find(s => s.playing)?.getFlag(ID, "clave") ?? "";
export const catalogoMusica = () => Object.entries(PISTAS).map(([id, [titulo, obra]]) => ({ id, titulo, obra }));

export function registrarEscenas() {
  game.settings.register(ID, "sonidos", {
    name: "Efectos de sonido", hint: "El golpe del resultado, los críticos, las lesiones, la sirena de los refuerzos… Para toda la mesa.",
    scope: "world", config: true, type: Boolean, default: true
  });

  // Doble clic en una calavera del mapa: quien dirige va a esa escena (Mayús + doble clic abre el diario, como siempre).
  Hooks.on("activateNote", (nota, opciones) => {
    const ir = nota.document.getFlag(ID, "ir");
    if (!ir || !game.user.isGM || globalThis.event?.shiftKey) return;
    const escena = escenaDe(ir);
    if (!escena) return;
    escena.view();
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
