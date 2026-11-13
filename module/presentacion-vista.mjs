/** La silueta y la puerta son capas independientes. La fase compartida conserva el cierre antes del fundido. */
import { PERSONAJES, TIEMPOS } from "./presentacion-core.mjs";
export function crearVistaPresentacion(doc, rootPath) {
  const el = (tag, clase, texto) => {
    const n = doc.createElement(tag); if (clase) n.className = clase;
    if (texto) n.textContent = texto; return n;
  };
  const root = el("section", "er-presentacion-vista");
  root.id = "er-presentacion-vista"; root.setAttribute("aria-live", "polite");
  root.style.setProperty("--er-puerta-abrir", `${TIEMPOS.apertura}ms`);
  root.style.setProperty("--er-puerta-cerrar", `${TIEMPOS.cierre}ms`);
  root.style.setProperty("--er-fundido", `${TIEMPOS.fundido}ms`);
  const marca = el("div", "er-pres-marca");
  marca.append(el("span", "", "F.A.N.G. · OPERACIÓN EAT THE REICH"), el("strong", "", "ESCUADRÓN LISTO PARA EL DESPLIEGUE"));
  const foco = el("div", "er-pres-foco"), caja = el("div", "er-pres-ataud");
  const casco = el("div", "er-pres-casco"), interior = el("div", "er-pres-interior");
  const imagen = el("img", "er-pres-original"); imagen.decoding = "async";
  interior.append(imagen); casco.append(interior);
  const tapa = el("div", "er-pres-tapa"); tapa.setAttribute("aria-hidden", "true");
  tapa.append(el("div", "er-pres-tapa-cara"), el("div", "er-pres-tapa-dorso"));
  caja.append(casco, tapa);
  const datos = el("div", "er-pres-identidad"), jugador = el("p", "er-pres-jugador");
  const nombre = el("h1", "er-pres-nombre"), titulo = el("p", "er-pres-titulo");
  datos.append(el("span", "er-pres-expediente", "ACTIVO DE ASALTO · CLASIFICADO"), jugador, nombre, titulo);
  foco.append(caja, datos); root.append(marca, foco); doc.body.append(root);
  for (const p of PERSONAJES) { const img = doc.createElement("img"); img.src = `${rootPath}/assets/libro/${p.id}.webp`; }
  let actual = "";
  function render(estado, roster, visible) {
    root.classList.toggle("is-visible", !!visible);
    doc.body.classList.toggle("er-presentacion-exclusiva", !!visible);
    const p = visible && PERSONAJES.find(p => p.id === estado.personaje);
    const fase = p ? estado.fase ?? "abierto" : "sala";
    root.setAttribute("data-fase", fase);
    root.classList.toggle("is-character", !!p);
    root.classList.toggle("is-open", !!p && ["abriendo", "abierto"].includes(fase));
    root.classList.toggle("is-leaving", fase === "salida");
    if (!p) { actual = ""; root.setAttribute("aria-label", visible ? "Sala de despliegue: cinco ataúdes cerrados" : "Presentación inactiva"); return; }
    if (actual !== p.id) {
      imagen.src = `${rootPath}/assets/libro/${p.id}.webp`;
      imagen.alt = `${p.nombre} dentro del ataúd metálico, ilustración original del manual`;
      nombre.textContent = p.nombre; titulo.textContent = p.titulo;
      root.style.setProperty("--er-pres-color", p.color); actual = p.id;
    }
    const quien = roster.find(r => r.id === p.id);
    jugador.textContent = quien?.jugador || "";
    root.setAttribute("aria-label", `${quien?.jugador ? quien.jugador + ": " : ""}${p.nombre} · ${fase}`);
  }
  return { root, render, destroy() { root.remove(); doc.body.classList.remove("er-presentacion-exclusiva"); } };
}
