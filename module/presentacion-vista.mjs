/** Vista pública: solo cambia con el estado compartido; no publica datos ni reproduce audio local. */
import { PERSONAJES } from "./presentacion-core.mjs";

export function crearVistaPresentacion(doc, rootPath) {
  const el = (tag, clase, texto) => {
    const n = doc.createElement(tag); if (clase) n.className = clase;
    if (texto) n.textContent = texto; return n;
  };
  const root = el("section", "er-presentacion-vista");
  root.id = "er-presentacion-vista"; root.setAttribute("aria-live", "polite");
  const marca = el("div", "er-pres-marca");
  marca.append(el("span", "", "F.A.N.G. · OPERACIÓN EAT THE REICH"), el("strong", "", "ESCUADRÓN LISTO PARA EL DESPLIEGUE"));
  const foco = el("div", "er-pres-foco");
  const caja = el("div", "er-pres-ataud"), interior = el("div", "er-pres-interior");
  const imagen = el("img", "er-pres-original"); imagen.decoding = "async";
  interior.append(imagen);
  const tapa = el("div", "er-pres-tapa"); tapa.setAttribute("aria-hidden", "true");
  tapa.append(el("span", "er-pres-placa", "F.A.N.G."));
  caja.append(interior, tapa);
  const datos = el("div", "er-pres-identidad"), jugador = el("p", "er-pres-jugador");
  const nombre = el("h1", "er-pres-nombre"), titulo = el("p", "er-pres-titulo");
  datos.append(el("span", "er-pres-expediente", "ACTIVO DE ASALTO · CLASIFICADO"), jugador, nombre, titulo);
  foco.append(caja, datos); root.append(marca, foco); doc.body.append(root);
  for (const p of PERSONAJES) { const precarga = doc.createElement("img"); precarga.src = `${rootPath}/assets/libro/${p.id}.webp`; }
  let actual = "", cambio = 0, timer;

  function render(estado, roster, visible) {
    root.classList.toggle("is-visible", !!visible);
    doc.body.classList.toggle("er-presentacion-exclusiva", !!visible);
    const p = visible && PERSONAJES.find(p => p.id === estado.personaje);
    if (!p) {
      cambio++; clearTimeout(timer); actual = "";
      root.classList.remove("is-character", "is-changing");
      root.setAttribute("aria-label", visible ? "Sala de despliegue: cinco ataúdes cerrados" : "Presentación inactiva");
      return;
    }
    const quien = roster.find(r => r.id === p.id);
    if (actual === p.id) { jugador.textContent = quien?.jugador || ""; return; }
    const turno = ++cambio; clearTimeout(timer);
    root.classList.add("is-changing");
    const mostrar = () => {
      if (turno !== cambio) return;
      imagen.src = `${rootPath}/assets/libro/${p.id}.webp`;
      imagen.alt = `${p.nombre}, ilustración original del manual de Eat the Reich`;
      jugador.textContent = quien?.jugador || ""; nombre.textContent = p.nombre; titulo.textContent = p.titulo;
      root.style.setProperty("--er-pres-color", p.color);
      root.setAttribute("aria-label", `${quien?.jugador ? quien.jugador + ": " : ""}${p.nombre}`);
      root.classList.add("is-character"); root.classList.remove("is-changing"); actual = p.id;
    };
    if (actual) timer = setTimeout(mostrar, 260); else mostrar();
  }
  return { root, render, destroy() { cambio++; clearTimeout(timer); root.remove(); doc.body.classList.remove("er-presentacion-exclusiva"); } };
}
