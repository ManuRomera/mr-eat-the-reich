/**
 * La tirada del Havoc Engine, de principio a fin, en una sola tarjeta de chat:
 * reserva (atributo + equipo + habilidades) contra los dados de ataque del GM, reparto de éxitos dado a dado
 * (Objetivo, Amenaza, Defensa, Sangre, ESPECIAL), dados de bonificación, flashback y, al cerrar el turno, la lesión.
 * La tarjeta se pinta a partir de `flags.mr-eat-the-reich.tirada`; todo cambio lo aplica el GM activo.
 */
import { ID, mision, cambiarMision, pedir, operacion, nuevoId, escuadron } from "./mesa.mjs";
import { DialogV2, aplicarModo, alRenderizarMensaje } from "./compat.mjs";
import { pintarRetratos } from "./retrato.mjs";
import { sonar } from "./escenas.mjs";
import { sonidoDe } from "./efectos-datos.mjs";
import * as R from "./reglas.mjs";
import { ATRIBUTOS, BLOQUEOS, FLASHBACK } from "./datos.mjs";

const esc = t => foundry.utils.escapeHTML(String(t ?? ""));
const mas = n => "+".repeat(n);
const d6 = async () => (await new Roll("1d6").evaluate()).total;
/** Dice So Nice: los dados de quien tira salen con las caras punk y el color de su vampiro (los del GM, negros con canto rojo). */
function vestir(roll, actor) {
  if (!roll || !game.dice3d || !game.settings.get(ID, "dadosPunk")) return roll;
  const color = actor && game.settings.get(ID, "dadosColor") ? actor.getFlag(ID, "forro") : "";
  for (const d of roll.dice) d.options.appearance = { system: ID, colorset: "custom", foreground: "#f4ead6", outline: "#05060f", background: color || "#16131f", edge: color ? "#05060f" : "#c8102e", material: "plastic", texture: "none" };
  return roll;
}
const caras = roll => roll.dice.flatMap(d => d.results.map(r => r.result));

/* ───────────── Diálogo ───────────── */

export async function dialogoTirada(actor, atributo = "", libre = false) {
  if (!actor?.isOwner) return;
  const s = actor.system, m = mision(), bloq = new Set(s.bloqueos);
  if (s.muerto) return ui.notifications.warn(`${actor.name} ha caído. Solo queda su último gesto.`);
  if (s.derribado) return ui.notifications.warn(`${actor.name} está derribado: fuera de combate hasta que otro vampiro lo rescate.`);
  const opcion = (name, titulo, detalle, dados, off = false) => `<label class="er-dt-op"><input type="checkbox" name="${name}" data-dados="${dados}" ${off ? "disabled" : ""}><span><b>${esc(titulo)}</b><small>${esc(detalle)}</small></span></label>`;
  const vivas = R.activas(m.amenazas);
  const mayor = R.reservaAtaque(m.amenazas).amenaza;
  const elegido = atributo in ATRIBUTOS ? atributo : (libre ? "" : Object.keys(ATRIBUTOS)[0]);
  const fichas = [...Object.entries(ATRIBUTOS).map(([k, n]) => [k, n, s.efectivos[k]]), ["", "Otra cosa", 2]]
    .map(([k, n, v]) => `<label class="er-chip er-dt-atr${k ? "" : " libre"}"><input type="radio" name="atributo" value="${k}" data-dados="${v}" ${k === elegido ? "checked" : ""}><span>${n}</span><b>${v}</b></label>`).join("");
  const objetos = s.equipo.map((e, i) => (!e.dado ? "" : opcion(`eq.${i}`, e.nombre, `${e.usos}/${e.max} usos${e.usos === 1 && e.max > 1 ? " · último uso: explota, +1 dado" : ""}${e.bono ? ` · ${mas(e.bono)}${e.req}` : ""}`, R.dadosObjeto(e), e.usos < 1))).join("");
  const botin = s.botin.nombre ? opcion("botin", `Botín: ${s.botin.nombre}`, `${s.botin.usos}/${s.botin.max} usos${s.botin.usos === 1 && s.botin.max > 1 ? " · último uso: explota, +1 dado" : ""}${s.botin.bono ? ` · ${mas(s.botin.bono)}${s.botin.req}` : ""}`, R.dadosObjeto(s.botin), s.botin.usos < 1) : "";
  const poderes = (lista, pre) => lista.map((h, i) => (h.tipo !== "sangre" || !h.activa ? "" : opcion(`${pre}.${i}`, h.nombre, `${h.coste} de Sangre${h.bono ? ` · ${mas(h.bono)}${h.req}` : ""}`, 1, bloq.has("gastar") || s.sangre < h.coste))).join("");
  const habs = poderes(s.habilidades, "hab") + poderes(s.mejoras, "mej");
  const avisos = [...bloq].map(b => `<span>${esc(BLOQUEOS[b] ?? b)}</span>`).join("");
  const content = `<div class="er-dt">
    <h2 class="er-nombre-cinta">¿Qué haces?</h2>
    ${avisos ? `<p class="er-avisos-linea">${avisos}</p>` : ""}
    <div class="er-dt-atrs" role="radiogroup" aria-label="Atributo">${fichas}</div>
    <div class="er-dt-bloque"><span class="er-cinta">Contra</span>
      <select name="amenaza" aria-label="Amenaza a la que te enfrentas">${vivas.length ? vivas.map(a => `<option value="${a.id}" data-gm="${a.ataque + vivas.length - 1}" ${a.id === mayor?.id ? "selected" : ""}>${esc(a.nombre)} · Ataque ${a.ataque}</option>`).join("") : `<option value="" data-gm="0">Nadie os dispara: el GM no tira</option>`}</select>
      <p class="er-dt-gm" aria-live="polite"></p></div>
    ${objetos || botin ? `<div class="er-dt-bloque"><span class="er-cinta">Equipo</span> <small class="er-susurro">+1 dado, gasta un uso</small>${objetos}${botin}</div>` : ""}
    ${habs ? `<div class="er-dt-bloque"><span class="er-cinta">Habilidades</span> <small class="er-susurro">+1 dado · tienes ${s.sangre} de Sangre</small>${habs}</div>` : ""}
    <div class="er-dt-bloque er-dt-extra"><span class="er-cinta">Dados extra</span> <input type="number" name="extra" value="0" min="-5" max="10" step="1" aria-label="Dados extra"></div>
  </div>`;
  const datos = await DialogV2.wait({
    window: { resizable: true, title: `${actor.name} · preparar la tirada`, icon: "fa-solid fa-dice" }, classes: [ID, "er-dialogo", "er-tirada-dlg"], position: { width: 500 }, content, rejectClose: false,
    buttons: [{ action: "tirar", label: "Tirar", icon: "fa-solid fa-dice", default: true, callback: (ev, boton) => new foundry.applications.ux.FormDataExtended(boton.form).object }],
    // El botón dice cuántos dados vas a tirar, y la ventana lleva el color del forro del personaje.
    render: (ev, dialogo) => {
      const el = dialogo?.element ?? ev?.target?.element ?? dialogo;
      if (!(el instanceof HTMLElement)) return;
      el.style.setProperty("--forro", actor.getFlag(ID, "forro") || "#ff4f93");
      const contar = () => {
        let n = Number(el.querySelector('input[name="atributo"]:checked')?.dataset.dados ?? 2) + (Number(el.querySelector('input[name="extra"]')?.value) || 0);
        for (const c of el.querySelectorAll(".er-dt-op input:checked")) n += Number(c.dataset.dados) || 0;
        const rotulo = el.querySelector('button[data-action="tirar"] span') ?? el.querySelector('button[data-action="tirar"]');
        if (rotulo) rotulo.textContent = `Tirar ${Math.max(1, n)}d6`;
        // Además de los tuyos caen los dados del GM (negros): el Ataque de esa amenaza + 1 por cada otra en juego.
        const gm = Number(el.querySelector('select[name="amenaza"]')?.selectedOptions[0]?.dataset.gm) || 0, otras = Math.max(0, vivas.length - 1), aviso = el.querySelector(".er-dt-gm");
        if (aviso) aviso.innerHTML = gm ? `Y el GM tira <b>${gm}</b> ${gm === 1 ? "dado negro" : "dados negros"} contra ti${otras ? ` <small>(su Ataque + ${otras} por ${otras === 1 ? "la otra amenaza" : "las otras amenazas"})</small>` : ""}.` : "";
      };
      el.addEventListener("change", contar); el.addEventListener("input", contar); contar();
    }
  });
  if (!datos || typeof datos !== "object") return;
  const marcados = pre => Object.entries(datos).filter(([k, v]) => v && k.startsWith(`${pre}.`)).map(([k]) => Number(k.split(".")[1]));
  return tirar(actor, { atributo: datos.atributo ?? "", amenaza: datos.amenaza, equipo: marcados("eq"), botin: Boolean(datos.botin), habilidades: marcados("hab"), mejoras: marcados("mej"), extra: Number(datos.extra) || 0 });
}

/* ───────────── Tirar ───────────── */

export async function tirar(actor, { atributo = "", amenaza = "", equipo = [], botin = false, habilidades = [], mejoras = [], extra = 0, ultimo = false } = {}) {
  const dato = actor.toObject().system, s = actor.system, bloq = new Set(s.bloqueos);
  if (ultimo && (!s.muerto || s.gestoHecho)) return ui.notifications.warn(s.gestoHecho ? `${actor.name} ya ha hecho su último gesto.` : `${actor.name} aún no ha caído: el último gesto es con las seis lesiones marcadas.`);
  const cambios = {}, usados = [], bonos = [], notas = [];
  let n = ultimo ? R.DADOS_ULTIMO_GESTO : (atributo ? s.efectivos[atributo] : 2) + extra, sangre = s.sangre;

  if (!ultimo) {
    if (bloq.has("unObjeto") && equipo.length + (botin ? 1 : 0) > 1) return ui.notifications.warn("Con esa lesión solo puedes usar un objeto por turno.");
    if (bloq.has("sangria") && sangre > 0) { sangre--; notas.push("Pierde 1 de Sangre por su lesión."); }
    const usar = (o, bono = true) => {
      const dados = R.dadosObjeto(o);
      if (!dados) return;
      n += dados; o.usos--;
      usados.push(`${o.nombre}${dados > 1 ? " (último uso: explota)" : ""}`);
      if (bono && o.bono) bonos.push({ nombre: o.nombre, n: o.bono, req: o.req, hecho: false });
    };
    for (const i of equipo) if (dato.equipo[i]) usar(dato.equipo[i]);
    if (botin) usar(dato.botin);
    for (const [lista, idx] of [[dato.habilidades, habilidades], [dato.mejoras, mejoras]]) for (const i of idx) {
      const h = lista[i];
      if (!h || sangre < h.coste || bloq.has("gastar")) continue;
      sangre -= h.coste; n += 1; usados.push(`${h.nombre} (${h.coste} de Sangre)`);
      if (h.bono) bonos.push({ nombre: h.nombre, n: h.bono, req: h.req, hecho: false });
    }
    Object.assign(cambios, { "system.equipo": dato.equipo, "system.botin": dato.botin, "system.sangre": sangre });
  } else cambios["system.gestoHecho"] = true;
  n = Math.max(1, n);

  const m = mision();
  const ataque = ultimo ? { dados: 0, amenaza: null } : R.reservaAtaque(m.amenazas, amenaza);
  const rJ = vestir(await new Roll(`${n}d6`).evaluate(), actor);
  const rG = vestir(ataque.dados ? await new Roll(`${ataque.dados}d6`).evaluate() : null, null);
  const carasGM = rG ? caras(rG) : [];
  const especiales = bloq.has("especiales") ? [] : [...dato.habilidades, ...dato.mejoras.filter(h => h.activa)].filter(h => h.tipo === "especial").map(h => ({ nombre: h.nombre, texto: h.texto }));
  // Escuadrón motorizado (manual p. 61): mientras se enfrentan a ellos, todos los vampiros tienen el ESPECIAL «Chocar y arder».
  if (!bloq.has("especiales") && !ultimo && m.amenazas.some(a => a.clave === "motoristas" && a.valor > 0)) especiales.push({ nombre: "Chocar y arder", texto: "Inflige 3 de daño al escuadrón de motoristas.", golpe: 3 });
  // Si había sangre nazi a la vista al empezar, se puede beber aunque la última amenaza caiga en esta misma acción.
  const vivasAlTirar = m.amenazas.filter(a => a.valor > 0), conSangre = vivasAlTirar.length > 0 && !vivasAlTirar.every(a => a.sinSangre);
  const tirada = {
    actor: actor.id, ultimo, atributo: ultimo ? `Último gesto: ${s.ultimoGesto}` : (ATRIBUTOS[atributo] ?? "Sin atributo"),
    umbral: ataque.amenaza?.umbral ?? 4, dados: caras(rJ).map(c => ({ c, origen: "", destino: null })),
    gm: { caras: carasGM, exitos: R.exitosGM(carasGM, { anatema: ataque.amenaza?.anatema }), amenaza: ataque.amenaza?.id ?? "", nombre: ataque.amenaza?.nombre ?? "", garras: Boolean(ataque.amenaza?.garras), otras: Math.max(0, R.activas(m.amenazas).length - 1) },
    usados, bonos: bloq.has("bonos") ? [] : bonos, sinBonos: bloq.has("bonos") && bonos.length > 0, especiales, sinEspeciales: bloq.has("especiales"), sinBeber: bloq.has("beber"), conSangre,
    defensa: 0, absorbido: {}, notas, flashback: null, cerrada: false, resultado: null
  };
  await actor.update(cambios);
  const datos = { content: `<div class="er-tirada"></div>`, speaker: ChatMessage.getSpeaker({ actor }), rolls: rG ? [rJ, rG] : [rJ], sound: CONFIG.sounds.dice, flags: { [ID]: { tirada } } };
  aplicarModo(datos);
  const mensaje = await ChatMessage.create(datos);
  sonar(tirada.dados.some(d => d.c === 6) ? "critico" : "sello");
  // El primer cacharro o poder usado pone su sonido (rifle, sable, enjambre…), un instante después del golpe del resultado.
  const arma = usados.map(sonidoDe).find(Boolean);
  if (arma) setTimeout(() => sonar(arma, 0.6), 350);
  pedir("tiradaHecha", { mensaje: mensaje.id });
  return mensaje;
}

export const ultimoGesto = actor => tirar(actor, { ultimo: true });

/* ───────────── Pintar la tarjeta ───────────── */

const ICONO = { objetivo: "fa-bullseye", amenaza: "fa-skull", defensa: "fa-shield", sangre: "fa-droplet", especial: "fa-star" };

/** El éxito que cada cual tiene «en la mano» en su navegador: el siguiente sin gastar, o el dado que haya pulsado. */
const enMano = new Map();
function manoDe(mensaje, t) {
  const libres = t.dados.map((d, i) => (!d.destino && R.exitosDado(d.c, t.umbral) ? i : -1)).filter(i => i >= 0);
  const elegido = enMano.get(mensaje?.id);
  return libres.includes(elegido) ? elegido : libres[0] ?? -1;
}

/** Un ESPECIAL que cura heridas (el manual, p. 36, no deja usarlo en un último gesto). */
const curaHeridas = e => /elimina una lesi|cura|regenera|sana/i.test(`${e.nombre} ${e.texto}`);

/**
 * Dónde puede ir un éxito (manual, p. 31): un Objetivo, una Amenaza, defenderse, beber sangre o, con un 6, un ESPECIAL.
 * Un último gesto (p. 36) solo se aplica a Objetivos y Amenazas (y a ESPECIALES que no curen). Contra una amenaza con umbral
 * (Rust-Witch: solo valen el 5 y el 6) un dado más bajo no cuenta aunque la tirada tenga otro umbral.
 */
function destinos(t, i) {
  const m = mision(), d = t.dados[i], ex = R.exitosDado(d.c, t.umbral), quedan = Math.max(0, t.gm.exitos - t.defensa);
  const vivas = m.amenazas.filter(a => a.valor > 0);
  const soloSinSangre = vivas.length > 0 && vivas.every(a => a.sinSangre);
  const hayAlimento = t.conSangre ?? (vivas.length > 0 && !soloSinSangre);
  const reto = o => (o.desafio ? `Desafío ${o.desafio}` : "");
  const especiales = t.sinEspeciales || d.c !== 6 ? [] : t.especiales.filter(e => !(t.ultimo && curaHeridas(e)));
  return [
    ...m.objetivos.filter(o => o.valor > 0).map(o => ({ tipo: "objetivo", id: o.id, texto: o.nombre, cifra: o.valor, nota: [o.rescate ? "rescate" : o.secundario ? "secundario" : "", reto(o)].filter(Boolean).join(" · ") })),
    ...vivas.filter(a => d.c >= (a.umbral ?? 4)).map(a => ({ tipo: "amenaza", id: a.id, texto: a.nombre, cifra: a.valor, nota: reto(a) })),
    ...(quedan && !t.ultimo ? [{ tipo: "defensa", texto: "Defenderte", cifra: quedan, nota: quedan === 1 ? "ataque por parar" : "ataques por parar" }] : []),
    ...(t.sinBeber || t.ultimo || !hayAlimento ? [] : [{ tipo: "sangre", texto: "Beber sangre", cifra: `+${ex}` }]),
    ...(d.c === 6 && !t.sinEspeciales ? [...especiales.map(e => ({ tipo: "especial", nombre: e.nombre, texto: e.nombre, nota: "especial", ayuda: e.texto })), ...(t.ultimo ? [] : [{ tipo: "especial", nombre: "", texto: "Otro especial" }])] : [])
  ];
}

export function htmlTirada(mensaje, t) {
  const actor = game.actors.get(t.actor);
  const mio = Boolean(actor?.isOwner) && !t.cerrada;
  const mano = mio ? manoDe(mensaje, t) : -1, vale = mano >= 0 ? R.exitosDado(t.dados[mano].c, t.umbral) : 0;
  const ops = mano >= 0 ? destinos(t, mano) : [];
  const dado = (d, i) => {
    const ex = R.exitosDado(d.c, t.umbral);
    const clase = d.destino ? "gastado" : ex === 2 ? "critico" : ex ? "exito" : "fallo";
    const titulo = d.destino ? `${d.destino.nombre}` : ex ? (mio ? (i === mano ? "Este es el que vas a gastar" : "Pulsa para gastar este en vez del otro") : `${ex} éxito${ex > 1 ? "s" : ""}`) : "Descartado";
    const dentro = d.destino ? `<i class="fa-solid ${ICONO[d.destino.tipo]}" inert></i>` : d.c;
    return `<button type="button" class="er-dado ${clase}${d.origen ? " bono" : ""}${i === mano ? " mano" : ""}" data-dado="${i}" ${i === mano ? 'aria-pressed="true"' : ""} ${!ex || d.destino || !mio ? "disabled" : ""} data-tooltip="${esc(titulo)}" aria-label="Dado ${d.c}. ${esc(titulo)}">${dentro}</button>`;
  };
  const total = R.totalExitos(t.dados.map(d => d.c), t.umbral);
  const quedan = Math.max(0, t.gm.exitos - t.defensa);
  const crit = t.dados.filter(d => d.c >= 6).length;
  const repartos = t.dados.filter(d => d.destino).map(d => `<li><i class="fa-solid ${ICONO[d.destino.tipo]}" inert></i> ${esc(d.destino.texto)}</li>`).join("");
  const puedeFlashback = mio && !t.flashback && !t.ultimo && total <= 2 && !actor.system.flashback && !t.dados.some(d => d.destino);
  const r = t.resultado;
  return `<div class="er-tc ${t.ultimo ? "ultimo" : ""} ${t.cerrada ? "cerrada" : ""}">
    <header class="er-tc-cab"><img src="${esc(actor?.img ?? "icons/svg/mystery-man.svg")}" data-retrato="${t.actor}" data-lupa alt="">
      <div><strong>${esc(actor?.name ?? "¿?")}</strong><span>${esc(t.atributo)} · ${t.dados.length} dados${t.umbral > 4 ? ` · éxito con ${t.umbral}+` : ""}</span></div>
    </header>
    <div class="er-res" role="status" aria-label="${total} éxitos"><b class="er-res-n">${total}</b><span class="er-res-l"><b>${total === 1 ? "ÉXITO" : "ÉXITOS"}</b>${crit ? `<small>${crit} crítico${crit > 1 ? "s" : ""}</small>` : ""}</span></div>
    ${t.usados.length ? `<p class="er-tc-usa"><i class="fa-solid fa-toolbox" inert></i> ${t.usados.map(esc).join(" · ")}</p>` : ""}
    ${t.flashback ? `<blockquote class="er-tc-flash"><b>Flashback.</b> ${esc(t.flashback.contexto)}. ${esc(t.flashback.pregunta)}</blockquote>` : ""}
    <div class="er-dados" role="group" aria-label="Dados del jugador">${t.dados.map(dado).join("")}</div>
    ${t.gm.caras.length ? `<div class="er-tc-gm"><span>Ataque · ${esc(t.gm.nombre)}</span>
      <div class="er-dados gm">${t.gm.caras.map(c => `<span class="er-dado ${c >= 4 ? "exito" : "fallo"}">${c}</span>`).join("")}</div>
      <span class="er-tc-quedan ${quedan ? "peligro" : ""}">${t.gm.exitos} ataque${t.gm.exitos === 1 ? "" : "s"}${t.defensa ? ` − ${t.defensa} defendidos` : ""} → <b>${quedan}</b> sin defender</span></div>`
    : ""}
    ${mano >= 0 ? `<div class="er-tc-destinos" role="group" aria-label="Dónde gastar el éxito"><p>${vale > 1 ? "Ese <b>6</b> vale por dos. ¿Dónde va?" : `¿Dónde va ese <b>${t.dados[mano].c}</b>?`}</p>
      ${ops.map((o, k) => `<button type="button" class="er-dest ${o.tipo}" data-dest="${k}" ${o.ayuda ? `data-tooltip="${esc(o.ayuda)}"` : ""}><i class="fa-solid ${ICONO[o.tipo]}" inert></i><span>${esc(o.texto)}${o.nota ? ` <small>${esc(o.nota)}</small>` : ""}</span>${o.cifra !== undefined ? `<b>${o.cifra}</b>` : ""}</button>`).join("") || `<p class="er-tc-nota">No hay nada en juego. Abre el Panel de misión.</p>`}</div>` : ""}
    ${repartos ? `<ul class="er-tc-reparto">${repartos}</ul>` : ""}
    ${t.notas.length ? `<p class="er-tc-nota">${t.notas.map(esc).join(" ")}</p>` : ""}
    ${t.sinBonos ? `<p class="er-tc-nota">Por su lesión no puede usar los +.</p>` : ""}
    ${mio ? `<div class="er-tc-botones">
      ${t.bonos.map((b, k) => (b.hecho ? "" : `<button type="button" class="er-boton er-boton-suave" data-er="bono" data-k="${k}" data-tooltip="Si tu descripción cumple «${esc(b.req)}»"><i class="fa-solid fa-plus" inert></i> ${esc(b.nombre)}: ${b.n}d6 (${esc(b.req)})</button>`)).join("")}
      ${puedeFlashback ? `<button type="button" class="er-boton er-boton-suave" data-er="flashback"><i class="fa-solid fa-clock-rotate-left" inert></i> Flashback: +2 dados y repetir</button>` : ""}
      <button type="button" class="er-boton" data-er="cerrar"><i class="fa-solid fa-flag-checkered" inert></i> Terminar el turno</button></div>` : ""}
    ${r ? `<div class="er-tc-fin ${r.lesion ? "herida" : "ilesa"}">${r.lesion
      ? `<b>${r.quedan} ataque${r.quedan > 1 ? "s" : ""} sin defender.</b> Lesión (${r.lesion.d6}): ${r.lesion.marcadas.map(esc).join(" y ") || "ninguna casilla libre"}.${r.lesion.derribado ? " <b>¡Derribado!</b> Fuera de combate hasta que lo rescaten." : ""}${r.lesion.muerto ? " <b>Las seis lesiones marcadas: es la hora del último gesto.</b>" : ""}`
      : (t.ultimo ? "Y así cae. Describid el sacrificio." : "Turno terminado sin un rasguño.")}${r.sube ? ` <i>${esc(r.sube)}</i>` : ""}</div>` : ""}
  </div>`;
}

/** Tarjetas abiertas en este navegador: se repintan cuando cambia la misión (los valores de objetivos y amenazas van en los destinos). */
const vivas = new Map();
export function escucharTiradas() {
  Hooks.on("eatthereich.mision", () => { for (const [id, v] of vivas) { if (v.hueco.isConnected) v.pintar(); else vivas.delete(id); } });
  alRenderizarMensaje((mensaje, html) => {
    const t = mensaje.getFlag(ID, "tirada");
    const hueco = html.querySelector(".er-tirada");
    if (!t || !hueco) return;
    const pintar = () => { const actual = mensaje.getFlag(ID, "tirada"); if (actual) { hueco.innerHTML = htmlTirada(mensaje, actual); pintarRetratos(hueco); } };
    pintar();
    if (!t.cerrada) vivas.set(mensaje.id, { hueco, pintar });
    hueco.addEventListener("click", ev => {
      const dado = ev.target.closest("button[data-dado]");
      if (dado) { enMano.set(mensaje.id, Number(dado.dataset.dado)); return pintar(); }
      const destino = ev.target.closest("button[data-dest]");
      if (destino) {
        const actual = mensaje.getFlag(ID, "tirada"), i = manoDe(mensaje, actual), o = i >= 0 ? destinos(actual, i)[Number(destino.dataset.dest)] : null;
        if (o) pedir("asignar", { mensaje: mensaje.id, i, tipo: o.tipo, id: o.id ?? "", nombre: o.nombre ?? "" });
        return;
      }
      const b = ev.target.closest("button[data-er]");
      if (b) pedir(b.dataset.er, { mensaje: mensaje.id, k: Number(b.dataset.k) });
    });
  });

  /* ───────────── Operaciones (las ejecuta el GM activo) ───────────── */

  const abrir = ({ mensaje }, quien) => {
    const msg = game.messages.get(mensaje);
    const t = foundry.utils.deepClone(msg?.getFlag(ID, "tirada"));
    const actor = game.actors.get(t?.actor);
    if (!t || !actor || t.cerrada || !(quien.isGM || actor.testUserPermission(quien, "OWNER"))) return {};
    return { msg, t, actor };
  };
  const guardar = (msg, t) => msg.update({ [`flags.${ID}.tirada`]: t });
  const mostrar3d = (roll, quien) => game.dice3d?.showForRoll(roll, quien, true);

  // Sin dolor (Einherjar): cada 1 del GM sube el Desafío de esa amenaza.
  operacion("tiradaHecha", async ({ mensaje }) => {
    const t = game.messages.get(mensaje)?.getFlag(ID, "tirada");
    const unos = t?.gm.caras.filter(c => c === 1).length;
    if (!unos) return;
    await cambiarMision(m => { const a = m.amenazas.find(x => x.id === t.gm.amenaza); if (a?.sinDolor) a.desafio += unos; });
  });

  operacion("asignar", async (datos, quien) => {
    const { msg, t, actor } = abrir(datos, quien);
    const d = t?.dados[datos.i];
    if (!d || d.destino) return;
    const ex = R.exitosDado(d.c, t.umbral);
    if (!ex) return;
    let texto = "", nombre = datos.nombre, rescatado = "";
    if (datos.tipo === "especial" && t.sinEspeciales) return;      // la lesión impide usar ESPECIALES
    if (t.ultimo && ["defensa", "sangre"].includes(datos.tipo)) return;   // el último gesto solo va a Objetivos y Amenazas (p. 36)
    if (datos.tipo === "objetivo" || datos.tipo === "amenaza") {
      await cambiarMision(m => {
        const o = (datos.tipo === "objetivo" ? m.objetivos : m.amenazas).find(x => x.id === datos.id);
        if (!o || o.valor <= 0) return;
        if (datos.tipo === "amenaza" && d.c < (o.umbral ?? 4)) return;   // Aura de desgracia: contra ella solo valen el 5 y el 6
        const r = R.aplicarExitos(o, ex, t.absorbido[o.id] ?? 0);
        t.absorbido[o.id] = r.absorbido;
        o.valor = r.valor;
        nombre = o.nombre;
        texto = `${o.nombre}: ${r.absorbe ? `el Desafío absorbe ${r.absorbe}; ` : ""}${ex - r.absorbe ? `−${ex - r.absorbe} → ${o.valor}` : "sin efecto"}`;
        if (o.valor === 0) {
          if (datos.tipo === "amenaza") { o.ataque = 0; if (o.uber && !m.caidos.includes(o.nombre)) m.caidos.push(o.nombre); texto += o.revive ? ". ¡Rechazada! (volverá con refuerzos)" : ". ¡Destruida!"; }
          else if (o.rescate) { rescatado = o.rescate; texto += `. ¡Rescatado! ${o.premio || "Vuelve al combate."}`; sonar("objetivo"); }
          else { texto += o.secundario ? ". ¡Secundario cumplido! Elige recompensa." : ". ¡Objetivo cumplido!"; sonar("objetivo"); }
        }
      });
      if (!texto) return;
      if (rescatado) await game.actors.get(rescatado)?.update({ "system.derribado": false });   // rescatarlo lo devuelve al combate, sin más premio
    } else if (datos.tipo === "defensa") {
      t.defensa += ex; nombre = "Defensa"; texto = `Se defiende: −${ex} ataque${ex > 1 ? "s" : ""}`;
    } else if (datos.tipo === "sangre") {
      const antes = actor.system.sangre, ahora = Math.min(R.SANGRE_MAX, antes + ex);
      await actor.update({ "system.sangre": ahora });
      nombre = "Sangre"; texto = `Bebe sangre: +${ahora - antes} (tiene ${ahora})`; sonar("sangre", 0.6);
    } else if (datos.tipo === "especial" && d.c === 6) {
      const e = t.especiales.find(x => x.nombre === datos.nombre);
      if (t.ultimo && (!e || curaHeridas(e))) return;
      nombre = e?.nombre || "ESPECIAL"; texto = e ? `ESPECIAL · ${e.nombre}: ${e.texto}` : "ESPECIAL (aplicadlo en el Panel de misión)";
      if (e?.golpe) {   // Chocar y arder: 3 de daño al escuadrón de motoristas
        await cambiarMision(m => {
          const o = m.amenazas.find(x => x.clave === "motoristas" && x.valor > 0);
          if (!o) { texto += " (no hay motoristas a la vista)"; return; }
          const r = R.aplicarExitos(o, e.golpe, t.absorbido[o.id] ?? 0);
          t.absorbido[o.id] = r.absorbido; o.valor = r.valor;
          if (o.valor === 0) o.ataque = 0;
          texto += `: ${o.nombre} −${e.golpe - r.absorbe} → ${o.valor}`;
        });
      }
    } else return;
    d.destino = { tipo: datos.tipo, nombre, texto };
    await guardar(msg, t);
  });

  operacion("bono", async (datos, quien) => {
    const { msg, t, actor } = abrir(datos, quien);
    const b = t?.bonos[datos.k];
    if (!b || b.hecho) return;
    const roll = vestir(await new Roll(`${b.n}d6`).evaluate(), actor);
    mostrar3d(roll, quien);
    b.hecho = true;
    t.dados.push(...caras(roll).map(c => ({ c, origen: b.nombre, destino: null })));
    t.usados.push(`${mas(b.n)}${b.req}`);
    await guardar(msg, t);
  });

  operacion("flashback", async (datos, quien) => {
    const { msg, t, actor } = abrir(datos, quien);
    if (!t || t.flashback || actor.system.flashback || t.dados.some(d => d.destino) || R.totalExitos(t.dados.map(d => d.c), t.umbral) > 2) return;
    const otros = escuadron().filter(v => v.id !== actor.id && !v.system.muerto);
    const quienSale = otros.length ? otros[Math.floor(Math.random() * otros.length)].name : "alguien de F.A.N.G.";
    // «Agrega 2 dados a tu reserva» (p. 41): la reserva original, sin los dados de bonificación que ya se hubieran tirado.
    const roll = vestir(await new Roll(`${t.dados.filter(d => !d.origen).length + 2}d6`).evaluate(), actor);
    mostrar3d(roll, quien);
    t.flashback = { contexto: FLASHBACK.contexto[(await d6()) - 1], pregunta: FLASHBACK.preguntas[(await d6()) - 1].replace("[personaje]", quienSale) };
    t.dados = caras(roll).map(c => ({ c, origen: "", destino: null }));
    for (const b of t.bonos) b.hecho = false;
    sonar("flashback");
    await actor.update({ "system.flashback": true });
    await guardar(msg, t);
  });

  operacion("cerrar", async (datos, quien) => {
    const { msg, t, actor } = abrir(datos, quien);
    if (!t) return;
    const quedan = Math.max(0, t.gm.exitos - t.defensa);
    const r = { quedan, lesion: null, sube: "" };
    const derribo = Number(game.settings.get(ID, "derribo")) || R.DERRIBO;
    if (quedan > 0) {
      const dado = await d6();
      const derribado = quedan >= derribo;
      const l = R.marcarLesion(actor.toObject().system.lesiones, dado, derribado || t.gm.garras);
      await actor.update({ "system.lesiones": l.lesiones, "system.derribado": derribado || actor.system.derribado });
      r.lesion = { d6: dado, marcadas: l.marcadas, derribado, muerto: l.muerto };
      sonar(derribado ? "derribo" : "lesion");
    }
    await cambiarMision(m => {
      if (!t.ultimo && !m.actuaron.includes(actor.id)) m.actuaron.push(actor.id);
      if (m.turno === actor.id) m.turno = "";
      const a = m.amenazas.find(x => x.id === t.gm.amenaza);
      if (a && a.valor > 0 && t.gm.caras.length && t.gm.exitos === 0 && a.crece) { a.ataque += 1; r.sube = `${a.nombre} no ha acertado ni una: su Ataque sube a ${a.ataque}.`; }
      if (r.lesion?.derribado && !r.lesion.muerto) m.objetivos.push({ id: nuevoId(), nombre: `Rescatar a ${actor.name}`, valor: 3, max: 3, desafio: 0, secundario: true, premio: `${actor.name} vuelve al combate.`, rescate: actor.id });
    });
    t.cerrada = true; t.resultado = r;
    await guardar(msg, t);
  });
}
