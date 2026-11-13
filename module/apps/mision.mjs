/**
 * Panel de misión: lo que hay en juego en la escena (Objetivos, Amenazas, ronda y turnos).
 * Quien dirige lo edita; los jugadores lo ven. Las tarjetas de tirada gastan sus éxitos contra lo que haya aquí.
 */
import { ID, RUTA, mision, cambiarMision, operacion, pedir, nuevoId, vampiros } from "../mesa.mjs";
import { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } from "../compat.mjs";
import { ConMemoria } from "../memoria.mjs";
import { pintarRetratos } from "../retrato.mjs";
import { refuerzos, reservaAtaque } from "../reglas.mjs";
import { AMENAZAS, LOCALIZACIONES, PREMIOS_SECUNDARIO } from "../datos.mjs";
import { dialogoTirada } from "../tirada.mjs";
import { sonar, musica, pistaSonando, catalogoMusica, escenaDe } from "../escenas.mjs";

const esc = t => foundry.utils.escapeHTML(String(t ?? ""));
const CAMPOS_AMENAZA = ["desafio", "revive", "crece", "uber", "umbral", "anatema", "garras", "sinDolor", "sinSangre", "refuerzoValor", "rasgos"];
const actorDe = clave => game.actors.find(a => a.type === "amenaza" && a.getFlag(ID, "clave") === clave);

/** Ficha de amenaza para la misión, desde los datos del sistema o desde un actor del mundo. */
function fichaAmenaza({ clave, actor, alias = "", nota = "" }) {
  const base = actor ? { ...actor.system, nombre: actor.name, clave: actor.getFlag(ID, "clave") ?? "" } : AMENAZAS.find(a => a.clave === clave);
  if (!base) return null;
  const doc = actor ?? actorDe(base.clave);
  return {
    id: nuevoId(), clave: base.clave, uuid: doc?.uuid ?? "", img: doc?.img ?? "icons/svg/skull.svg", nombre: alias || base.nombre, nota,
    valor: base.valor, max: base.valor, ataque: base.ataque, inicial: base.ataque, ...Object.fromEntries(CAMPOS_AMENAZA.map(k => [k, base[k]]))
  };
}
const fichaObjetivo = (o, secundario = false) => ({ id: nuevoId(), nombre: o.nombre, valor: o.valor, max: o.valor, desafio: o.desafio ?? 0, secundario, premio: o.premio ?? "" });

async function aviso(titulo, html) {
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ alias: "F.A.N.G." }), content: `<div class="er-tc er-parte"><header class="er-tc-cab"><div><strong>${esc(titulo)}</strong></div></header>${html}</div>` });
}

export async function cargarLocalizacion(clave) {
  const l = LOCALIZACIONES.find(x => x.clave === clave);
  if (!l || !game.user.isGM) return;
  if (!mision().escena) sonar("ataud");   // la primera escena de la noche: caen los ataúdes
  await cambiarMision(m => {
    m.escena = l.nombre; m.ronda = 1; m.actuaron = []; m.turno = "";
    if (!m.visitadas.includes(l.clave)) m.visitadas.push(l.clave);
    m.objetivos = [fichaObjetivo(l.objetivo), ...l.secundarios.map(s => fichaObjetivo(s, true))];
    m.amenazas = l.enemigos.flatMap(e => Array.from({ length: e.n }, () => fichaAmenaza({ clave: e.clave, alias: e.alias, nota: e.nota }))).filter(Boolean);
    // Las repetidas se numeran: «Patrulla policial 1», «Patrulla policial 2».
    const veces = {}, van = {};
    for (const f of m.amenazas) veces[f.nombre] = (veces[f.nombre] ?? 0) + 1;
    for (const f of m.amenazas) if (veces[f.nombre] > 1) { const base = f.nombre; van[base] = (van[base] ?? 0) + 1; f.nombre = `${base} ${van[base]}`; }
  });
  await aviso(`Sector ${l.sector} · ${l.nombre}`, `<p>${esc(l.resumen)}</p><p><b>Objetivo:</b> ${esc(l.objetivo.nombre)} (${l.objetivo.valor}${l.objetivo.desafio ? `, Desafío ${l.objetivo.desafio}` : ""})</p>${l.botin.length ? `<p><b>Botín a la vista:</b> ${l.botin.map(esc).join(" · ")}</p>` : ""}<p class="er-tc-nota">Manual, p. ${l.pagina}.</p>`);
}

export async function finDeRonda() {
  if (!game.user.isGM) return;
  const tiradas = [];
  const d6 = () => { const n = Math.ceil(CONFIG.Dice.randomUniform() * 6); tiradas.push(n); return n; };
  let parte = [], ronda = 1, bruja = false;
  await cambiarMision(m => {
    bruja = m.amenazas.some(a => a.clave === "rust-witch" && a.valor > 0);
    const r = refuerzos(m.amenazas, d6);
    m.amenazas = r.amenazas; parte = r.parte; m.ronda += 1; m.actuaron = []; m.turno = ""; ronda = m.ronda;
  });
  if (parte.length) sonar("sirena", 0.5);
  await aviso(`Refuerzos · empieza la ronda ${ronda}`, `<ul class="er-tc-reparto">${parte.map(p => `<li>${esc(p)}</li>`).join("") || "<li>Nadie a la vista.</li>"}</ul>${bruja ? `<p class="er-tc-nota"><b>Maldición del óxido:</b> elige un vampiro; una pieza de su equipo, al azar, queda inservible.</p>` : ""}`);
}

/**
 * Da el turno a un vampiro y lo anuncia a la mesa. En Eat the Reich los enemigos no tienen turno propio:
 * atacan dentro del turno de cada vampiro, así que el aviso dice quién le dispara y con cuántos dados.
 */
export async function darTurno(id) {
  const actor = game.actors.get(id);
  if (!actor || !game.user.isGM) return;
  let m;
  await cambiarMision(x => { x.turno = id; x.fuera = x.fuera.filter(f => f !== id); x.actuaron = x.actuaron.filter(f => f !== id); m = x; });
  const ataque = reservaAtaque(m.amenazas), vivas = m.amenazas.filter(a => a.valor > 0 && a.ataque > 0);
  const quedan = vampiros().filter(v => !v.system.muerto && !v.system.derribado && !m.fuera.includes(v.id) && !m.actuaron.includes(v.id) && v.id !== id).map(v => v.name);
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ alias: "F.A.N.G." }), content: `<div class="er-tc er-turno-aviso"><header class="er-tc-cab"><img src="${esc(actor.img)}" data-retrato="${actor.id}" alt=""><div><strong>Turno de ${esc(actor.name)}</strong><span>Ronda ${m.ronda}${m.escena ? ` · ${esc(m.escena)}` : ""}</span></div></header>
    ${vivas.length ? `<p><b>Le disparan:</b> ${vivas.map(a => `${esc(a.nombre)} (Ataque ${a.ataque})`).join(", ")}.</p><div class="er-res"><b class="er-res-n">${ataque.dados}</b><span class="er-res-l"><b>${ataque.dados === 1 ? "DADO" : "DADOS"}</b><small>de ataque del GM</small></span></div>` : `<p>Nadie le dispara. Por ahora.</p>`}
    ${m.objetivos.filter(o => o.valor > 0).length ? `<p><b>En juego:</b> ${m.objetivos.filter(o => o.valor > 0).map(o => `${esc(o.nombre)} (${o.valor})`).join(" · ")}</p>` : ""}
    <p class="er-tc-nota">${quedan.length ? `Después: ${quedan.map(esc).join(", ")}.` : "Es el último de la ronda: después llegan los refuerzos."}</p></div>` });
}

export class PanelMision extends ConMemoria(HandlebarsApplicationMixin(ApplicationV2)) {
  static MEMORIA = "mision";
  static DEFAULT_OPTIONS = {
    id: "er-mision", classes: [ID, "er-mision"], position: { width: 540, height: 680 },
    window: { title: "Misión", icon: "fa-solid fa-crosshairs", resizable: true },
    actions: { mas: PanelMision.#ajustar, menos: PanelMision.#ajustar, quitar: PanelMision.#quitar, objetivo: PanelMision.#objetivo, amenaza: PanelMision.#amenaza,
      cargar: PanelMision.#cargar, tirarDesde: PanelMision.#tirarDesde, musica: PanelMision.#musica, silencio: PanelMision.#silencio, irEscena: PanelMision.#irEscena, ronda: PanelMision.#ronda, limpiar: PanelMision.#limpiar, turno: PanelMision.#turno, abrir: PanelMision.#abrir }
  };
  static PARTS = { cuerpo: { template: `${RUTA}/templates/apps/mision.hbs`, scrollable: [".er-mision-cuerpo"] } };
  static SCROLL_MEMORIA = [".er-mision-cuerpo"];

  static abrir() { return (foundry.applications.instances.get("er-mision") ?? new PanelMision()).render({ force: true }); }

  async _prepareContext() {
    const m = mision(), ataque = reservaAtaque(m.amenazas);
    const sectores = [3, 2, 1].map(s => ({ nombre: `Sector ${s}`, lugares: LOCALIZACIONES.filter(l => l.sector === s) }));
    const mundo = game.actors.filter(a => a.type === "amenaza" && !AMENAZAS.some(x => x.clave === a.getFlag(ID, "clave")));
    return {
      direccion: Boolean(game.modules.get("mr-direccion")?.active),
      pistas: catalogoMusica(), sonando: pistaSonando(), hayEscena: Boolean(LOCALIZACIONES.find(l => l.nombre === m.escena)),
      esGM: game.user.isGM, m, sectores, ataque: ataque.dados, premios: PREMIOS_SECUNDARIO,
      objetivos: m.objetivos.map(o => ({ ...o, hecho: o.valor <= 0 })),
      amenazas: m.amenazas.map(a => ({ ...a, caida: a.valor <= 0, solo: !a.revive && !a.crece })),
      catalogo: [...AMENAZAS.map(a => ({ v: a.clave, n: `${a.nombre} (${a.valor}/${a.ataque})` })), ...mundo.map(a => ({ v: a.uuid, n: `${a.name} · del mundo` }))],
      vampiros: vampiros().map(v => ({ id: v.id, nombre: v.name, img: v.img, sangre: v.system.sangre, actuo: m.actuaron.includes(v.id), turno: m.turno === v.id, fuera: m.fuera.includes(v.id), derribado: v.system.derribado, muerto: v.system.muerto })),
      // Quién puede tirar desde aquí: los jugadores, con sus vampiros en escena; quien dirige, con el que tiene el turno.
      tiradores: vampiros().filter(v => !v.system.muerto && !m.fuera.includes(v.id) && (game.user.isGM ? m.turno === v.id : v.isOwner)).map(v => ({ id: v.id, nombre: v.name, turno: m.turno === v.id })),
      enTurno: game.actors.get(m.turno)?.name ?? "",
      rondaHecha: vampiros().filter(v => !v.system.muerto && !v.system.derribado && !m.fuera.includes(v.id)).every(v => m.actuaron.includes(v.id))
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    pintarRetratos(this.element);
    if (!game.user.isGM) return;
    // Clic derecho en un retrato: ese vampiro entra o sale de la escena (los ausentes no cuentan para cerrar la ronda).
    for (const b of this.element.querySelectorAll(".er-turno")) b.addEventListener("contextmenu", ev => {
      ev.preventDefault();
      const id = b.dataset.id;
      cambiarMision(m => { m.fuera = m.fuera.includes(id) ? m.fuera.filter(x => x !== id) : [...m.fuera, id]; if (m.turno === id) m.turno = ""; });
    });
    for (const campo of this.element.querySelectorAll("[data-campo]:is(input, textarea)")) campo.addEventListener("change", () => {
      const { lista, id, campo: clave } = campo.dataset;
      cambiarMision(m => { const o = lista ? m[lista].find(x => x.id === id) : m; if (o) o[clave] = campo.type === "number" ? Math.max(0, Number(campo.value) || 0) : campo.value; });
    });
    if (this._sueltaLista) return; // el elemento de la ventana persiste entre repintados: un solo oyente
    this._sueltaLista = true;
    this.element.addEventListener("drop", async ev => {
      const datos = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev);
      if (datos?.type === "Actor") pedir("amenazaNueva", { uuid: datos.uuid });
    });
  }

  static #ajustar(ev, b) {
    const { lista, id, campo } = b.dataset, d = b.dataset.action === "mas" ? 1 : -1;
    return cambiarMision(m => { const o = m[lista].find(x => x.id === id); if (o) { o[campo] = Math.max(0, (o[campo] ?? 0) + d); if (lista === "amenazas" && campo === "valor" && o.valor === 0) o.ataque = 0; } });
  }
  static #quitar(ev, b) { return cambiarMision(m => { m[b.dataset.lista] = m[b.dataset.lista].filter(x => x.id !== b.dataset.id); }); }
  static #objetivo(ev, b) { const sec = b.dataset.secundario === "1"; return cambiarMision(m => m.objetivos.push(fichaObjetivo({ nombre: sec ? "Objetivo secundario" : "Nuevo objetivo", valor: sec ? 3 : 6 }, sec))); }
  static #amenaza() {
    const v = this.element.querySelector("select[name=catalogo]")?.value;
    if (v) pedir("amenazaNueva", v.includes(".") ? { uuid: v } : { clave: v });
  }
  static #cargar() { const v = this.element.querySelector("select[name=lugar]")?.value; if (v) return cargarLocalizacion(v); }
  static #ronda() { return finDeRonda(); }
  static async #musica() { await musica(this.element.querySelector("select[name=pista]")?.value); this.render(); }
  static async #silencio() { await musica(""); this.render(); }
  static #irEscena() { const l = LOCALIZACIONES.find(x => x.nombre === mision().escena); return escenaDe(l?.clave)?.view(); }
  static async #limpiar() {
    const ok = await DialogV2.confirm({ window: { title: "Escena nueva", icon: "fa-solid fa-broom" }, content: "<p>Se quitan los Objetivos y las Amenazas de la escena actual. Los vampiros siguen adelante.</p>", yes: { label: "Escena nueva", icon: "fa-solid fa-broom" }, no: { label: "Cancelar" }, rejectClose: false });
    if (ok) return cambiarMision(m => Object.assign(m, { escena: "", ronda: 1, objetivos: [], amenazas: [], actuaron: [] }));
  }
  /** Quien dirige: clic da el turno y lo anuncia; Mayús + clic marca «ya actuó». Jugador: abre su tirada (o la hoja ajena). */
  static #turno(ev, b) {
    const id = b.dataset.id, actor = game.actors.get(id);
    if (!game.user.isGM) return actor?.isOwner ? dialogoTirada(actor) : actor?.sheet.render(true);
    if (ev.shiftKey) return cambiarMision(m => { m.actuaron = m.actuaron.includes(id) ? m.actuaron.filter(x => x !== id) : [...m.actuaron, id]; if (m.turno === id) m.turno = ""; });
    return darTurno(id);
  }
  static #tirarDesde(ev, b) { return dialogoTirada(game.actors.get(b.dataset.id)); }
  static async #abrir(ev, b) { (await fromUuid(b.dataset.uuid))?.sheet.render(true); }
}

export function registrarMision() {
  operacion("amenazaNueva", async ({ clave, uuid }, quien) => {
    if (!quien.isGM) return;
    const actor = uuid ? await fromUuid(uuid) : null;
    if (uuid && actor?.type !== "amenaza") return;
    const ficha = fichaAmenaza({ clave, actor });
    if (ficha) await cambiarMision(m => m.amenazas.push(ficha));
  });
  Hooks.on("eatthereich.mision", () => foundry.applications.instances.get("er-mision")?.render());
  for (const h of ["updateActor", "createActor", "deleteActor"]) Hooks.on(h, a => { if (a.type === "vampiro") foundry.applications.instances.get("er-mision")?.render(); });
}
