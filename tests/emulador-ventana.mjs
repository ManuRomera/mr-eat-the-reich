/**
 * Emulación del posicionamiento de ventanas de Foundry V13 (ApplicationV2 `_updatePosition` + `#applyPosition`) para comprobar,
 * sin Foundry, cómo se ve una ventana en una pantalla de cualquier tamaño. Genérico: vale para cualquier sistema o módulo.
 *
 *   const app = crearApp(elemento, { width: 540, height: 680 });   // lo que pide DEFAULT_OPTIONS.position
 *   app.setPosition({ scale: 0.7 });                                // igual que en Foundry: recorta a max-width/max-height, centra, escala
 *   const datos = medirVentana("misión", app.element, { ancho, alto });   // dónde acaba y si queda a la vista
 */
const medida = (valor, base) => {
  const v = String(valor ?? "");
  if (v.endsWith("%")) return (parseFloat(v) / 100) * base;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;   // «none» → 0 → sin tope
};

/** Port de `ApplicationV2#_updatePosition` (V13): recorta al tope CSS, centra y no deja salir la ventana de la pantalla. */
function resolver(el, posicion) {
  let { width, height, left, top, scale } = posicion;
  scale ??= 1;
  const cs = getComputedStyle(el), doc = document.documentElement;
  const { clientWidth, clientHeight } = doc;
  const minW = medida(cs.minWidth, clientWidth) || 0, minH = medida(cs.minHeight, clientHeight) || 0;
  let maxW = medida(cs.maxWidth, clientWidth) || Infinity, maxH = medida(cs.maxHeight, clientHeight) || Infinity;
  let caja = el.getBoundingClientRect();
  const autoAncho = width === "auto", autoAlto = height === "auto";
  if (!autoAncho) width = Math.min(Math.max(Number(width || caja.width), parseInt(minW) || 0), parseInt(maxW) || clientWidth / scale);
  if (!autoAlto) height = Math.min(Math.max(Number(height || caja.height), parseInt(minH) || 0), parseInt(maxH) || clientHeight / scale);
  if (autoAlto) { Object.assign(el.style, { width: `${width}px`, height: "" }); height = el.getBoundingClientRect().height / (el._escalaAplicada || 1); }
  if (autoAncho) { Object.assign(el.style, { height: `${height}px`, width: "" }); width = el.getBoundingClientRect().width / (el._escalaAplicada || 1); }
  const anchoVisible = width * scale, altoVisible = height * scale;
  left = Math.min(Math.max(left ?? (clientWidth - anchoVisible) / 2, 0), Math.max(clientWidth - anchoVisible, 0));
  top = Math.min(Math.max(top ?? (clientHeight - altoVisible) / 2, 0), Math.max(clientHeight - altoVisible, 0));
  return { width: autoAncho ? "auto" : width, height: autoAlto ? "auto" : height, left, top, scale };
}

function aplicar(el, p) {
  Object.assign(el.style, {
    position: "fixed", transformOrigin: "top left", margin: "0",
    width: p.width === "auto" ? "" : `${p.width}px`, height: p.height === "auto" ? "" : `${p.height}px`,
    left: `${p.left}px`, top: `${p.top}px`, transform: p.scale === 1 ? "" : `scale(${p.scale})`
  });
  el._escalaAplicada = p.scale;
}

/** Una «aplicación» mínima con la forma que usan los módulos (`element`, `rendered`, `options.position`, `position`, `setPosition`). */
export function crearApp(element, pedido) {
  const app = {
    element, rendered: true, minimized: false, options: { position: { ...pedido } }, position: { ...pedido, scale: 1 },
    setPosition(cambio = {}) { app.position = resolver(element, { ...app.position, ...cambio }); aplicar(element, app.position); return app.position; }
  };
  app.setPosition({});
  return app;
}

/**
 * Dónde queda una ventana y si es usable: dentro de la pantalla, sin ocupar demasiado, y con su botón principal a la vista.
 * `hotbar` es la altura de la barra de macros que Foundry deja libre bajo las ventanas.
 */
export function medirVentana(nombre, el, { ancho, alto, hotbar = 0 }) {
  const r = el.getBoundingClientRect(), t = 0.5;
  const boton = el.querySelector(".form-footer button, [data-action='tirar']");
  const rb = boton?.getBoundingClientRect();
  const pequena = alto < 950 || ancho < 1920;
  const limite = pequena ? 0.92 : 1;
  const e = {
    nombre, pantalla: `${ancho}×${alto}`, escala: Number((el._escalaAplicada ?? 1).toFixed(2)),
    caja: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    fraccionAlto: Number((r.height / alto).toFixed(2)), fraccionAncho: Number((r.width / ancho).toFixed(2)),
    dentro: r.left >= -t && r.top >= -t && r.right <= ancho + t && r.bottom <= alto + t,
    sobreHotbar: r.bottom > alto - hotbar + t,
    botonVisible: rb ? rb.top >= -t && rb.bottom <= alto + t && rb.height > 0 : null
  };
  e.ocupaDemasiado = e.fraccionAlto > limite || e.fraccionAncho > limite;
  e.ok = e.dentro && e.botonVisible !== false && !e.ocupaDemasiado;
  return e;
}
