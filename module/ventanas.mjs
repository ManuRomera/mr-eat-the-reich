/**
 * Ventanas que caben en cualquier pantalla. Toda ventana del sistema (diálogos, paneles, fichas) se escala sola para
 * quedar entera a la vista —el botón de Tirar nunca se sale por abajo— y, si aun así no cabe, se desplaza por dentro
 * (el tope y el desplazamiento los pone el CSS). El ajuste «Tamaño de las ventanas» fija una escala propia en vez de la automática.
 * La hoja-ataúd entra en la misma regla pero con su propio ajuste («Tamaño de la hoja-ataúd»).
 */
import { ID } from "./mesa.mjs";
import { escalaDeVentana } from "./ventanas-core.mjs";

const nuestra = app => Boolean(app?.element?.classList?.contains(ID));
/** Ajuste de escala elegido por el usuario (porcentaje, 0 = automático): la hoja-ataúd tiene el suyo. */
const manualDe = app => (app.element.classList.contains("er-hoja-ataud") ? Math.round((Number(game.settings.get(ID, "escalaAtaud")) || 0) * 100) : Number(game.settings.get(ID, "escalaVentanas")) || 0);

/** Escala una ventana para que quepa en la pantalla (o con la escala elegida en Ajustes). Se llama al pintarla y al cambiar la pantalla. */
export function ajustarVentana(app) {
  if (!nuestra(app) || !app.rendered || app.minimized) return;
  const el = app.element, doc = document.documentElement;
  const hotbar = parseFloat(getComputedStyle(document.body).getPropertyValue("--hotbar-height")) || 0;   // Foundry deja libre 1,5 veces su alto bajo las ventanas
  const vista = { ancho: doc.clientWidth, alto: doc.clientHeight - 1.5 * hotbar, total: doc.clientHeight };
  // La primera vez se parte del tamaño que pide la ventana (Foundry ya lo ha recortado a la pantalla); después, del que tiene ahora.
  const primera = !app._erAjustada;
  app._erAjustada = true;
  const pedido = app.options?.position ?? {}, ahora = app.position ?? {};
  const medida = (pide, tiene, medir) => (primera && Number.isFinite(pide) ? pide : Number.isFinite(tiene) ? tiene : medir());
  const ancho = medida(pedido.width, ahora.width, () => el.offsetWidth);
  const alto = medida(pedido.height, ahora.height, () => {
    const tope = el.style.maxHeight; el.style.maxHeight = "none";   // lo que la ventana pide de verdad, sin el tope de la pantalla
    const h = el.offsetHeight; el.style.maxHeight = tope; return h;
  });
  const escala = escalaDeVentana(ancho, alto, vista, manualDe(app));
  el.style.setProperty("--er-esc-ventana", String(escala));   // el CSS escala con ella el tope de tamaño
  if (!primera && Math.abs((ahora.scale ?? 1) - escala) < 0.004) return;
  const cambio = { scale: escala };
  if (primera && Number.isFinite(pedido.width)) cambio.width = pedido.width;
  if (primera && Number.isFinite(pedido.height)) cambio.height = pedido.height;
  app.setPosition(cambio);
}

let espera = 0;
/** Reajusta todas las ventanas abiertas (al cambiar el tamaño del navegador o el ajuste). */
export function reajustarVentanas() {
  clearTimeout(espera);
  espera = setTimeout(() => { for (const app of foundry.applications.instances.values()) ajustarVentana(app); }, 150);
}

export function registrarVentanas() {
  game.settings.register(ID, "escalaVentanas", {
    name: "Tamaño de las ventanas (%)",
    hint: "0 = automático: cada ventana se encoge lo justo para caber entera en tu pantalla. Otro valor fija esa escala en todas las ventanas del sistema (menos la hoja-ataúd, que tiene la suya). Si no cabe, se desplaza por dentro. Ajuste de este navegador.",
    scope: "client", config: true, type: Number, default: 0, range: { min: 0, max: 150, step: 5 }, onChange: reajustarVentanas
  });
  Hooks.on("renderApplicationV2", app => ajustarVentana(app));
  window.addEventListener("resize", reajustarVentanas);
}
