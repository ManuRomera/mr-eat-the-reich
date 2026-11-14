/**
 * El despliegue (manual, p. 50): la mesa elige en el mapa de París uno de los puntos del Sector 3, sale una diana sobre él
 * y quien dirige da la orden de lanzamiento. La mesa va a ese decorado, caen tantos ataúdes como vampiros juegan (de 3 a 5),
 * cada uno con su explosión, el humo lo tapa todo y, al despejarse, el decorado es ya el de los ataúdes clavados.
 */
import { ID, RUTA, mision, cambiarMision, operacion, pedir, escuadron } from "./mesa.mjs";
import { LOCALIZACIONES } from "./datos.mjs";
import { escenaDe, sonar } from "./escenas.mjs";
import { cargarLocalizacion } from "./apps/mision.mjs";
import { VERSION_CONTENIDO } from "./banda-sonora-datos.mjs";

export const PUNTOS = LOCALIZACIONES.filter(l => l.sector === 3);
/** El manual pide de tres a seis personas contando a quien dirige: hay decorado para 3, 4 y 5 ataúdes. */
export const cuantos = n => Math.min(5, Math.max(3, Number(n) || 0));

/**
 * Dónde está clavado cada ataúd en cada decorado: [x, y de la base, alto, inclinado a la derecha] en % de la imagen.
 * Medido sobre las imágenes de assets/escenas/despliegue: si se regeneran, hay que volver a medir.
 */
export const ATAUDES = {
  sirena: { 3: [[79, 73, 20, 1], [24, 72, 25, 0], [50, 87, 38, 0]], 4: [[40, 68, 16, 0], [72, 68, 15, 1], [26, 90, 50, 0], [78, 92, 45, 1]], 5: [[19, 75, 16, 0], [72, 75, 13, 1], [56, 90, 28, 0], [35, 92, 36, 0], [80, 95, 34, 1]] },
  almacenes: { 3: [[57, 82, 12, 0], [71, 87, 23, 1], [33, 88, 32, 0]], 4: [[46, 84, 12, 0], [79, 86, 14, 1], [60, 92, 22, 1], [28, 97, 32, 0]], 5: [[70, 84, 10, 1], [40, 84, 13, 0], [55, 90, 20, 0], [79, 90, 20, 1], [27, 95, 34, 0]] },
  cementerio: { 3: [[83, 57, 10, 0], [54, 58, 15, 0], [24, 80, 40, 0]], 4: [[69, 58, 10, 0], [36, 62, 16, 0], [82, 87, 34, 1], [24, 83, 43, 0]], 5: [[70, 57, 12, 0], [36, 60, 16, 0], [51, 60, 19, 0], [83, 87, 38, 1], [22, 85, 45, 0]] },
  hotel: { 3: [[45, 73, 17, 0], [71, 82, 30, 1], [28, 84, 37, 0]], 4: [[84, 70, 12, 1], [22, 78, 20, 0], [64, 81, 18, 1], [43, 90, 31, 0]], 5: [[67, 72, 13, 1], [35, 76, 16, 0], [81, 82, 21, 1], [25, 86, 27, 0], [51, 92, 36, 0]] },
  mausoleo: { 3: [[54, 79, 15, 0], [76, 85, 22, 1], [27, 87, 32, 0]], 4: [[66, 81, 18, 1], [41, 80, 21, 0], [80, 90, 35, 1], [25, 92, 46, 0]], 5: [[67, 76, 11, 0], [35, 77, 14, 0], [81, 85, 22, 1], [54, 88, 25, 0], [23, 90, 30, 0]] },
  catedral: { 3: [[53, 77, 16, 0], [77, 86, 34, 1], [32, 88, 45, 0]], 4: [[42, 76, 12, 0], [63, 80, 18, 1], [79, 88, 27, 1], [26, 90, 36, 0]], 5: [[39, 76, 14, 0], [70, 76, 14, 1], [53, 86, 24, 0], [82, 90, 28, 1], [22, 93, 37, 0]] }
};

const esc = t => foundry.utils.escapeHTML(String(t ?? ""));
const activoGM = () => game.users.activeGM?.isSelf;
const esperar = ms => new Promise(r => setTimeout(r, ms));
export const variante = (clave, n) => `${RUTA}/assets/escenas/despliegue/${clave}-${n}.webp?v=${VERSION_CONTENIDO}`;

/** Las dianas van dentro del tablón del mapa (misma caja de 4000 px que Foundry mueve y escala con el lienzo). */
function pintarDianas(tablon, m, k) {
  if (m.desplegado || !canvas.scene?.notes) return;
  const d = canvas.dimensions;
  for (const nota of canvas.scene.notes) {
    const l = PUNTOS.find(p => p.clave === nota.getFlag(ID, "ir"));
    if (!l) continue;
    const x = (nota.x - d.sceneX) / k, y = (nota.y - d.sceneY) / k, fijada = m.diana === l.clave;
    const b = document.createElement("button");
    b.type = "button"; b.className = `er-diana ${fijada ? "fijada" : ""}`; b.style.cssText = `left:${x}px;top:${y}px`;
    b.setAttribute("aria-pressed", String(fijada)); b.setAttribute("aria-label", `Punto de despliegue: ${l.nombre}`);
    b.addEventListener("click", () => pedir("diana", { clave: l.clave }));
    tablon.append(b);
    if (!fijada) continue;
    const n = cuantos(escuadron().length), f = document.createElement("div");
    f.className = `er-diana-ficha ${x > 2400 ? "izq" : ""}`; f.style.cssText = `left:${x}px;top:${y}px`;
    f.innerHTML = `<small>Punto de despliegue · Sector 3</small><b>${esc(l.nombre)}</b><p>${esc(l.resumen)}</p>
      <p><strong>Objetivo:</strong> ${esc(l.objetivo.nombre)} (${l.objetivo.valor})</p>
      ${game.user.isGM ? `<button type="button" data-er="lanzar">¡Lanzamiento! <span>${n} ataúdes</span></button><button type="button" data-er="otro">Otro punto</button>` : `<p class="er-diana-espera">${n} ataúdes en el aire. Esperando la orden de lanzamiento…</p>`}`;
    f.addEventListener("click", ev => {
      const a = ev.target.closest("button[data-er]")?.dataset.er;
      if (a === "lanzar") lanzar(l.clave);
      if (a === "otro") pedir("diana", { clave: l.clave });
    });
    tablon.append(f);
  }
}

async function restaurar() {
  for (const s of game.scenes) {
    const limpio = s.getFlag(ID, "fondoLimpio");
    if (limpio && s._source.background?.src !== limpio) await s.update({ "background.src": limpio });
  }
}

/** Solo el GM activo: carga la localización, publica el despliegue y lleva la mesa al decorado. La animación corre en cada cliente. */
export async function lanzar(clave = mision().diana) {
  if (!activoGM()) return;
  const escena = escenaDe(clave);
  if (!PUNTOS.some(p => p.clave === clave) || !escena) return ui.notifications.warn("No encuentro el decorado de ese punto: importa primero la misión.");
  const d = { id: foundry.utils.randomID(8), clave, n: cuantos(escuadron().length) };
  await restaurar();
  await cargarLocalizacion(clave);
  await cambiarMision(m => { m.diana = ""; m.desplegado = clave; m.despliegue = d; });
  if (!escena.active) await escena.activate();
  else if (canvas.scene?.id !== escena.id) await escena.view();
}

/** Vuelve a ofrecer el punto de despliegue en el mapa y devuelve los decorados a su estado original. */
export async function nuevoDespliegue() {
  if (!activoGM()) return;
  await restaurar();
  await cambiarMision(m => { m.diana = ""; m.desplegado = ""; m.despliegue = null; });
  await escenaDe("paris")?.activate();
}

let jugado = null;
function comprobar() {
  const d = mision().despliegue;
  if (jugado === null) { jugado = d?.id ?? ""; return; }   // lo que ya estaba al entrar no se repite
  if (!d || d.id === jugado || !canvas?.ready || canvas.scene?.getFlag(ID, "escena") !== d.clave) return;
  jugado = d.id;
  animar(d).catch(e => { console.error(`${ID} | despliegue`, e); document.getElementById("er-despliegue")?.remove(); });
}

/** La caída, en este cliente. El GM activo pone además los sonidos (para toda la mesa) y cambia el decorado bajo el humo. */
export async function animar(d) {
  const puntos = ATAUDES[d.clave]?.[d.n] ?? [], escena = canvas.scene, l = PUNTOS.find(p => p.clave === d.clave);
  const calma = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("er-despliegue")?.remove();
  const capa = document.createElement("div");
  capa.id = "er-despliegue"; capa.className = ID; capa.setAttribute("aria-hidden", "true");
  capa.innerHTML = `<div class="er-dp-humo"></div><div class="er-dp-rotulo"><small>Sector 3 · ${esc(l?.nombre)}</small><b>¡Lanzamiento!</b></div>`;
  document.body.append(capa);
  const humo = capa.firstElementChild;
  if (activoGM()) sonar("sirena", 0.35);
  await esperar(900);   // el decorado tarda un instante en encuadrarse a pantalla completa
  const r = canvas.dimensions.sceneRect, zoom = canvas.stage.scale.x;
  for (const [i, [x, y, alto, derecha]] of puntos.entries()) {
    const p = canvas.stage.worldTransform.apply({ x: r.x + r.width * x / 100, y: r.y + r.height * y / 100 });
    const h = r.height * alto / 100 * zoom;
    if (!calma) {
      const a = document.createElement("img");
      a.className = `er-dp-ataud ${derecha ? "derecha" : ""}`; a.src = `${RUTA}/assets/atrezo/ataud-metalico.png`; a.alt = "";
      a.style.cssText = `left:${p.x}px;top:${p.y}px;height:${h}px`;
      capa.append(a);
      await esperar(480);
    }
    if (activoGM()) sonar("granada", 0.85);
    const nube = document.createElement("i");
    nube.className = "er-dp-nube"; nube.style.cssText = `left:${p.x}px;top:${p.y}px;--t:${Math.max(160, h * 2.2)}px`;
    capa.append(nube);
    if (!calma) { document.body.classList.remove("er-temblor"); void document.body.offsetWidth; document.body.classList.add("er-temblor"); }
    humo.style.opacity = String((i + 1) / puntos.length);
    await esperar(calma ? 250 : 520);
  }
  humo.style.opacity = "1";
  await esperar(900);
  document.body.classList.remove("er-temblor");
  if (activoGM() && puntos.length) {
    const limpio = escena.getFlag(ID, "fondoLimpio") ?? escena._source.background.src;
    await escena.update({ "background.src": variante(d.clave, d.n), [`flags.${ID}.fondoLimpio`]: limpio });
  }
  // Se espera a que este cliente tenga ya pintado el decorado nuevo (o, si algo falla, 8 s) antes de despejar el humo.
  for (let t = 0; t < 8000 && !escena.background?.src?.includes("/despliegue/"); t += 150) await esperar(150);
  await esperar(500);
  for (let t = 0; t < 6000 && !canvas.ready; t += 150) await esperar(150);
  await esperar(500);
  for (const a of capa.querySelectorAll(".er-dp-ataud, .er-dp-nube")) a.remove();
  capa.classList.add("despeja");
  await esperar(3400);
  capa.remove();
}

export function registrarDespliegue() {
  operacion("diana", ({ clave }) => {
    if (!PUNTOS.some(p => p.clave === clave)) return;
    sonar("sello", 0.4);
    return cambiarMision(m => { if (!m.desplegado) m.diana = m.diana === clave ? "" : clave; });
  });
  Hooks.on("eatthereich.tablon", pintarDianas);
  Hooks.on("canvasReady", comprobar);
  Hooks.on("eatthereich.mision", comprobar);
  Hooks.once("ready", comprobar);
}
