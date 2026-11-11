/** Hojas V2 con memoria: vampiro (expediente de F.A.N.G.) y amenaza. */
import { ActorSheetV2, HandlebarsApplicationMixin, enriquecer } from "./compat.mjs";
import { ConMemoria } from "./memoria.mjs";
import { ID, RUTA, pedir } from "./mesa.mjs";
import { EditorRetrato, pintarRetratos } from "./retrato.mjs";
import { dialogoTirada, ultimoGesto } from "./tirada.mjs";
import { ATRIBUTOS, AYUDA_ATRIBUTOS, BLOQUEOS } from "./datos.mjs";
import { SANGRE_MAX, COSTE_CURAR } from "./reglas.mjs";

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
      gesto: HojaVampiro.#gesto, anadir: HojaVampiro.#anadir, quitar: HojaVampiro.#quitar, rescatar: HojaVampiro.#rescatar
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

  static #tirar(ev, b) { return dialogoTirada(this.document, b.dataset.atributo ?? ""); }
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
