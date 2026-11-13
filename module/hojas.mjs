/** Hojas V2 con memoria: vampiro (expediente de F.A.N.G.) y amenaza. */
import { ActorSheetV2, HandlebarsApplicationMixin, DialogV2, enriquecer } from "./compat.mjs";
import { ConMemoria } from "./memoria.mjs";
import { ID, RUTA, pedir } from "./mesa.mjs";
import { EditorRetrato, pintarRetratos } from "./retrato.mjs";
import { dialogoTirada, ultimoGesto } from "./tirada.mjs";
import { ATRIBUTOS, AYUDA_ATRIBUTOS, BLOQUEOS } from "./datos.mjs";
import { SANGRE_MAX, COSTE_CURAR } from "./reglas.mjs";
import { colocarAtaud } from "./contenido.mjs";

const PODER_NUEVO = { nombre: "Nueva", tipo: "sangre", texto: "", coste: 1, bono: 1, req: "", activa: true };
const OBJETO_NUEVO = { nombre: "Nuevo objeto", usos: 3, max: 3, bono: 1, req: "", dado: true, nota: "", corchete: 0 };

class HojaBase extends ConMemoria(HandlebarsApplicationMixin(ActorSheetV2)) {
  static DEFAULT_OPTIONS = {
    classes: [ID, "er-hoja"], form: { submitOnChange: true }, window: { resizable: true },
    actions: { retrato: HojaBase.#retrato, editar: HojaBase.#editar }
  };
  editando = false;
  get title() { return this.document.name; }

  async _prepareContext(options) {
    const a = this.document;
    return { ...(await super._prepareContext(options)), actor: a, system: a.system, editable: this.isEditable, editando: this.editando && this.isEditable, esGM: game.user.isGM, notas: await enriquecer(a.system.notas, a) };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    pintarRetratos(this.element);
    // Campos de listas (equipo, habilidades, lesiones): se guardan clonando la lista entera para no perder datos.
    for (const campo of this.element.querySelectorAll("[data-ruta]")) campo.addEventListener("change", ev => {
      ev.stopPropagation();
      const valor = campo.type === "checkbox" ? campo.checked : campo.type === "number" ? Number(campo.value) || 0 : campo.value;
      this.cambiar(campo.dataset.ruta, valor);
    });
  }

  /** Cambia `system.<ruta>` aunque atraviese listas (equipo.2.usos, lesiones.0.1.marcada). */
  cambiar(ruta, valor) {
    const [raiz, ...resto] = ruta.split(".");
    const dato = this.document.toObject().system[raiz];
    if (!resto.length) return this.document.update({ [`system.${raiz}`]: valor });
    foundry.utils.setProperty(dato, resto.join("."), valor);
    return this.document.update({ [`system.${raiz}`]: dato });
  }

  static #retrato() { if (this.isEditable) EditorRetrato.abrir(this.document); }
  static #editar() { this.editando = !this.editando; this.render(); }
}

export class HojaVampiro extends HojaBase {
  static DEFAULT_OPTIONS = {
    classes: ["er-hoja-vampiro"], position: { width: 820, height: 860 },
    actions: {
      tirar: HojaVampiro.#tirar, sangre: HojaVampiro.#sangre, uso: HojaVampiro.#uso, lesion: HojaVampiro.#lesion, curar: HojaVampiro.#curar,
      gesto: HojaVampiro.#gesto, objeto: HojaVampiro.#objeto, soltar: HojaVampiro.#soltar, soltarBotin: HojaVampiro.#soltarBotin, anadir: HojaVampiro.#anadir, quitar: HojaVampiro.#quitar, rescatar: HojaVampiro.#rescatar
    }
  };
  static PARTS = { hoja: { template: `${RUTA}/templates/hojas/vampiro.hbs`, scrollable: [".er-hoja-cuerpo"] } };
  static SCROLL_MEMORIA = [".er-hoja-cuerpo"];

  async _prepareContext(options) {
    const c = await super._prepareContext(options), s = this.document.system;
    const cajas = o => Array.from({ length: o.max }, (_, i) => ({ i: i + 1, llena: i >= o.max - o.usos, ultima: i === o.max - 1 && o.max > 1 }));
    const poder = h => ({ ...h, especial: h.tipo === "especial", sangre: h.tipo === "sangre", mas: "+".repeat(h.bono) });
    return {
      ...c,
      atributos: Object.entries(ATRIBUTOS).map(([k, nombre]) => ({ k, nombre, base: s.atributos[k], valor: s.efectivos[k], cambia: s.efectivos[k] !== s.atributos[k], ayuda: AYUDA_ATRIBUTOS[k] })),
      sangre: Array.from({ length: SANGRE_MAX }, (_, i) => ({ n: i + 1, llena: i < s.sangre })),
      equipo: s.equipo.map(e => ({ ...e, cajas: cajas(e), mas: "+".repeat(e.bono) })),
      botin: { ...s.botin, cajas: cajas(s.botin), mas: "+".repeat(s.botin.bono) },
      habilidades: s.habilidades.map(poder), mejoras: s.mejoras.map(poder),
      columnas: s.lesiones.map((col, i) => ({ rango: ["1-2", "3-4", "5-6"][i], casillas: col.map((l, j) => ({ ...l, ruta: `lesiones.${i}.${j}`, mod: JSON.stringify(l.mod ?? {}) })) })),
      bloqueos: s.bloqueos.map(b => BLOQUEOS[b] ?? b), tipos: { especial: "ESPECIAL", sangre: "Gasta Sangre", pasiva: "Pasiva" },
      listaBloqueos: { "": "—", ...BLOQUEOS }, puedeCurar: s.sangre >= COSTE_CURAR, costeCurar: COSTE_CURAR
    };
  }

  static #tirar(ev, b) { return dialogoTirada(this.document, b.dataset.atributo ?? "", true); }
  /** Pulsar la gota n deja la Sangre en n; pulsar la última llena, la vacía. */
  static #sangre(ev, b) {
    if (!this.isEditable) return;
    const n = Number(b.dataset.n);
    return this.document.update({ "system.sangre": n === this.document.system.sangre ? n - 1 : n });
  }
  /** Pulsar una casilla libre gasta un uso; pulsar una tachada lo devuelve. La gris (el último uso) es la última en gastarse. */
  static #uso(ev, b) {
    if (!this.isEditable) return;
    const ruta = b.dataset.objeto, o = foundry.utils.getProperty(this.document.system, ruta);
    return this.cambiar(`${ruta}.usos`, Math.min(o.max, Math.max(0, o.usos + (b.classList.contains("llena") ? -1 : 1))));
  }
  static #lesion(ev, b) {
    if (!this.isEditable) return;
    return this.cambiar(`${b.dataset.lesion}.marcada`, !foundry.utils.getProperty(this.document.system, b.dataset.lesion).marcada);
  }
  static async #curar(ev, b) {
    const a = this.document;
    if (!this.isEditable || a.system.sangre < COSTE_CURAR) return ui.notifications.warn(`Curar una lesión cuesta ${COSTE_CURAR} de Sangre.`);
    const l = foundry.utils.getProperty(a.system, b.dataset.lesion);
    await a.update({ "system.sangre": a.system.sangre - COSTE_CURAR });
    await this.cambiar(`${b.dataset.lesion}.marcada`, false);
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: a }), content: `<p class="er-aviso"><i class="fa-solid fa-droplet"></i> Gasta ${COSTE_CURAR} de Sangre y se cura: <b>${foundry.utils.escapeHTML(l.nombre)}</b>.</p>` });
  }
  static #gesto() { if (this.isEditable) return ultimoGesto(this.document); }

  /** Inventario: coger un cacharro nuevo (sin `data-i`) o cambiar uno que ya llevas. Hay que definirlo: usos, dados de bonificación y cuándo se ganan. */
  static async #objeto(ev, b) {
    if (!this.isEditable) return;
    const esc = t => foundry.utils.escapeHTML(String(t ?? ""));
    const lista = this.document.toObject().system.equipo, i = b.dataset.i === undefined ? -1 : Number(b.dataset.i);
    const o = lista[i] ?? { ...OBJETO_NUEVO, nombre: "" };
    const actor = this.document;
    const datos = await DialogV2.wait({
      window: { title: i < 0 ? "Coger un cacharro" : `Cambiar: ${o.nombre}`, icon: "fa-solid fa-toolbox" }, classes: [ID, "er-dialogo", "er-tirada-dlg"], position: { width: 470 }, rejectClose: false,
      content: `<div class="er-dt"><h2 class="er-nombre-cinta">${i < 0 ? "¿Qué has cogido?" : "Cacharro"}</h2>
        <div class="er-dt-bloque"><span class="er-cinta">Nombre</span> <input type="text" name="nombre" value="${esc(o.nombre)}" placeholder="Subfusil, coche de lujo, cañón…" autofocus></div>
        <div class="er-dt-bloque"><span class="er-cinta">Usos</span> <input type="number" name="max" value="${o.max}" min="1" max="9"> <small class="er-susurro">el botín suele traer 3; el último uso explota: +1 dado</small></div>
        <div class="er-dt-bloque"><span class="er-cinta">Dados +</span> <input type="number" name="bono" value="${o.bono}" min="0" max="5"> <small class="er-susurro">los que ganas si cumples el requisito</small></div>
        <div class="er-dt-bloque"><span class="er-cinta">Cuando…</span> <input type="text" name="req" value="${esc(o.req)}" placeholder="flanquear, espacios cerrados, a quemarropa…"></div>
        <div class="er-dt-bloque"><span class="er-cinta">Nota</span> <input type="text" name="nota" value="${esc(o.nota)}" placeholder="opcional"></div></div>`,
      buttons: [{ action: "guardar", label: i < 0 ? "Me lo quedo" : "Guardar", icon: "fa-solid fa-hand-back-fist", default: true, callback: (e, boton) => new foundry.applications.ux.FormDataExtended(boton.form).object }],
      render: (e, dialogo) => { const el = dialogo?.element ?? dialogo; if (el instanceof HTMLElement) el.style.setProperty("--forro", actor.getFlag(ID, "forro") || "#ff4f93"); }
    });
    if (!datos || typeof datos !== "object" || !String(datos.nombre ?? "").trim()) return;
    const max = Math.min(9, Math.max(1, Number(datos.max) || 3));
    const nuevo = { ...o, nombre: String(datos.nombre).trim(), max, usos: i < 0 || max !== o.max ? max : Math.min(o.usos, max), bono: Math.min(5, Math.max(0, Number(datos.bono) || 0)), req: String(datos.req ?? "").trim(), nota: String(datos.nota ?? "").trim() };
    if (i < 0) lista.push(nuevo); else lista[i] = nuevo;
    return actor.update({ "system.equipo": lista });
  }
  /** Deshacerse de un cacharro (gastado o no): nunca es automático. */
  static async #soltar(ev, b) {
    if (!this.isEditable) return;
    const lista = this.document.toObject().system.equipo, i = Number(b.dataset.i), o = lista[i];
    if (!o) return;
    const ok = await DialogV2.confirm({ window: { title: "Tirar el cacharro", icon: "fa-solid fa-trash" }, content: `<p>¿Te deshaces de <b>${foundry.utils.escapeHTML(o.nombre)}</b>? Desaparece de la hoja.</p>`, yes: { label: "Tirarlo", icon: "fa-solid fa-trash" }, no: { label: "Me lo quedo" }, rejectClose: false });
    if (ok) return this.document.update({ "system.equipo": lista.filter((_, k) => k !== i) });
  }
  static #soltarBotin() { if (this.isEditable) return this.document.update({ "system.botin.nombre": "", "system.botin.usos": 3, "system.botin.max": 3 }); }
  static #rescatar() { return this.document.update({ "system.derribado": false }); }
  static #anadir(ev, b) {
    const lista = b.dataset.lista;
    return this.document.update({ [`system.${lista}`]: [...this.document.toObject().system[lista], lista === "equipo" ? OBJETO_NUEVO : PODER_NUEVO] });
  }
  static #quitar(ev, b) {
    const lista = b.dataset.lista, i = Number(b.dataset.i);
    return this.document.update({ [`system.${lista}`]: this.document.toObject().system[lista].filter((_, k) => k !== i) });
  }
}

/* ───────────── La hoja-ataúd ───────────── */

/** Hexágono de ataúd como fracciones del ancho y del alto. */
const HEX = [[0.27, 0], [0.73, 0], [1, 0.21], [0.79, 1], [0.21, 1], [0, 0.21]];
const GROSOR = 22;
const hex = (w, h, t = 0) => HEX.map(([x, y]) => [t + x * (w - 2 * t), t + y * (h - 2 * t)]);

/** Marco de acero remachado: el hexágono exterior menos el interior, con remaches a lo largo de cada lado. */
export function marcoSVG(w, h) {
  const fuera = hex(w, h), dentro = hex(w, h, GROSOR), medio = hex(w, h, GROSOR / 2);
  const d = pts => `M${pts.map(p => p.map(n => n.toFixed(1)).join(" ")).join(" L")} Z`;
  let remaches = "";
  medio.forEach((a, i) => {
    const b = medio[(i + 1) % medio.length], largo = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(largo / 52));
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
      remaches += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="url(#er-remache)"/><circle cx="${(x - 1.2).toFixed(1)}" cy="${(y - 1.2).toFixed(1)}" r="1.3" fill="#cfd3ee" opacity=".7"/>`;
    }
  });
  return `<svg class="er-marco" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false">
    <defs><linearGradient id="er-acero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4066"/><stop offset=".35" stop-color="#0d0f22"/><stop offset=".6" stop-color="#2c3052"/><stop offset="1" stop-color="#07081a"/></linearGradient>
    <radialGradient id="er-remache"><stop offset="0" stop-color="#8f94b8"/><stop offset="1" stop-color="#15172e"/></radialGradient></defs>
    <path d="${d(fuera)} ${d(dentro)}" fill="url(#er-acero)" fill-rule="evenodd" stroke="#05060f" stroke-width="2"/>
    <path d="${d(dentro)}" fill="none" stroke="#ff3d8b" stroke-width="1.5" opacity=".8"/>${remaches}</svg>`;
}

const ANCHO = 1090, ALTO = 920, CAJA = [620, 880], TAPA = [500, 780];
const PESTANAS = { accion: "Acción", poderes: "Poderes", heridas: "Heridas", dosier: "Dosier" };

/**
 * La hoja de vampiro por defecto: un ataúd abierto. La ventana no tiene marco ni fondo; lo que se ve (y lo que recibe el ratón)
 * son la tapa, con el personaje a cuerpo entero, y la caja, con la hoja dentro. El texto se ciñe a la forma con `shape-outside`.
 */
export class HojaAtaud extends HojaVampiro {
  static DEFAULT_OPTIONS = {
    classes: ["er-hoja-ataud"], position: { width: ANCHO, height: ALTO }, window: { resizable: false },
    actions: { clasica: HojaAtaud.#clasica }
  };
  static PARTS = { hoja: { template: `${RUTA}/templates/hojas/ataud.hbs` } };
  static CAMPOS_MEMORIA = ["left", "top"];
  static SCROLL_MEMORIA = [];

  async _prepareContext(options) {
    const c = await super._prepareContext(options);
    this.tabGroups.ataud ??= "accion";
    const pestana = this.tabGroups.ataud;
    return {
      ...c, pestana, pestanas: Object.entries(PESTANAS).map(([id, nombre]) => ({ id, nombre, activa: id === pestana })),
      forro: this.document.getFlag(ID, "forro") || "#ff4f93", marcoCaja: marcoSVG(...CAJA), marcoTapa: marcoSVG(...TAPA)
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    // Tamaño: el elegido en Ajustes, o el que quepa en esta pantalla.
    const elegido = Number(game.settings.get(ID, "escalaAtaud")) || 0;
    const escala = elegido || Math.min(1, (window.innerHeight - 8) / ALTO, (window.innerWidth - 8) / ANCHO);
    if (Math.abs((this.position.scale ?? 1) - escala) > 0.005) this.setPosition({ scale: escala });
    this.ajustar();
  }

  changeTab(tab, group, opciones) {
    super.changeTab(tab, group, opciones);
    this.ajustar();
  }

  /** Si lo de una pestaña no cabe en el ataúd, se encoge la letra poco a poco hasta que quepa (nunca por debajo del 72 %). */
  ajustar() {
    const forro = this.element?.querySelector(".er-forro");
    if (!forro) return;
    let f = 1;
    forro.style.setProperty("--er-ajuste", f);
    while (forro.scrollHeight > forro.clientHeight + 1 && f > 0.72) forro.style.setProperty("--er-ajuste", (f -= 0.03));
  }

  /** La ficha rectangular de siempre, en modo edición: para crear o retocar vampiros. */
  static #clasica() {
    const hoja = new HojaVampiro({ document: this.document });
    hoja.editando = true;
    hoja.render({ force: true });
  }
}

export class HojaAmenaza extends HojaBase {
  static DEFAULT_OPTIONS = { classes: ["er-hoja-amenaza"], position: { width: 520, height: 640 }, actions: { aMision: HojaAmenaza.#aMision } };
  static PARTS = { hoja: { template: `${RUTA}/templates/hojas/amenaza.hbs`, scrollable: [".er-hoja-cuerpo"] } };
  static SCROLL_MEMORIA = [".er-hoja-cuerpo"];

  async _prepareContext(options) {
    const c = await super._prepareContext(options);
    return { ...c, rasgos: await enriquecer(this.document.system.rasgos, this.document), umbrales: { 4: "4 o más", 5: "5 o más", 6: "solo con 6" } };
  }
  static #aMision() { pedir("amenazaNueva", { uuid: this.document.uuid }); ui.notifications.info(`${this.document.name} entra en la misión.`); }
}

/** Hoja de atrezo: se arrastra desde Actores y no añade mecánicas de combate. */
export class HojaObjeto extends HojaBase {
  static DEFAULT_OPTIONS = { classes: ["er-hoja-objeto"], position: { width: 440, height: 650 },
    actions: { colocar: HojaObjeto.#colocar } };
  static PARTS = { hoja: { template: `${RUTA}/templates/hojas/objeto.hbs`, scrollable: [".er-hoja-cuerpo"] } };
  static SCROLL_MEMORIA = [".er-hoja-cuerpo"];
  static #colocar() { return colocarAtaud(this.document); }
}
