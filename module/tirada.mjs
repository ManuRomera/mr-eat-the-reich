/**
 * La tirada del Havoc Engine, de principio a fin, en una sola tarjeta de chat:
 * reserva (atributo + equipo + habilidades) contra los dados de ataque del GM, reparto de éxitos dado a dado
 * (Objetivo, Amenaza, Defensa, Sangre, ESPECIAL), dados de bonificación, flashback y, al cerrar el turno, la lesión.
 * La tarjeta se pinta a partir de `flags.mr-eat-the-reich.tirada`; todo cambio lo aplica el GM activo.
 */
import { ID, mision, cambiarMision, pedir, operacion, nuevoId, vampiros } from "./mesa.mjs";
import { DialogV2, aplicarModo, alRenderizarMensaje } from "./compat.mjs";
import { pintarRetratos } from "./retrato.mjs";
import * as R from "./reglas.mjs";
import { ATRIBUTOS, BLOQUEOS, FLASHBACK } from "./datos.mjs";

const esc = t => foundry.utils.escapeHTML(String(t ?? ""));
const mas = n => "+".repeat(n);
const d6 = async () => (await new Roll("1d6").evaluate()).total;
const caras = roll => roll.dice.flatMap(d => d.results.map(r => r.result));

/* ───────────── Diálogo ───────────── */

export async function dialogoTirada(actor, atributo = "") {
  if (!actor?.isOwner) return;
  const s = actor.system, m = mision(), bloq = new Set(s.bloqueos);
  if (s.muerto) return ui.notifications.warn(`${actor.name} ha caído. Solo queda su último gesto.`);
  const casilla = (name, titulo, detalle, off = false) => `<label class="er-casilla-texto"><input type="checkbox" name="${name}" ${off ? "disabled" : ""}><span>${esc(titulo)}<small>${esc(detalle)}</small></span></label>`;
  const vivas = R.activas(m.amenazas);
  const mayor = R.reservaAtaque(m.amenazas).amenaza;
  const objetos = s.equipo.map((e, i) => (!e.dado ? "" : casilla(`eq.${i}`, e.nombre, `${e.usos}/${e.max} usos${e.usos === 1 && e.max > 1 ? " · último uso: +1 dado" : ""}${e.bono ? ` · ${mas(e.bono)}${e.req}` : ""}`, e.usos < 1))).join("");
  const botin = s.botin.nombre ? casilla("botin", `Botín: ${s.botin.nombre}`, `${s.botin.usos}/${s.botin.max} usos${s.botin.bono ? ` · ${mas(s.botin.bono)}${s.botin.req}` : ""}`, s.botin.usos < 1) : "";
  const poderes = (lista, pre) => lista.map((h, i) => (h.tipo !== "sangre" || !h.activa ? "" : casilla(`${pre}.${i}`, h.nombre, `${h.coste} de Sangre${h.bono ? ` · ${mas(h.bono)}${h.req}` : ""} · ${h.texto}`, bloq.has("gastar") || s.sangre < h.coste))).join("");
  const avisos = [...bloq].map(b => `<li>${esc(BLOQUEOS[b] ?? b)}</li>`).join("");
  const content = `<div class="er-dialogo-cuerpo">
    ${avisos ? `<ul class="er-avisos">${avisos}</ul>` : ""}
    <label class="er-campo"><span>Atributo</span><select name="atributo">
      ${Object.entries(ATRIBUTOS).map(([k, n]) => `<option value="${k}" ${k === atributo ? "selected" : ""}>${n} · ${s.efectivos[k]} dados</option>`).join("")}
      <option value="">Ninguno encaja · 2 dados</option></select></label>
    <label class="er-campo"><span>Amenaza a la que te enfrentas</span><select name="amenaza">
      ${vivas.length ? vivas.map(a => `<option value="${a.id}" ${a.id === mayor?.id ? "selected" : ""}>${esc(a.nombre)} · Ataque ${a.ataque}</option>`).join("") : `<option value="">Ninguna en juego: el GM no tira</option>`}</select></label>
    ${objetos || botin ? `<fieldset><legend>Equipo (+1 dado y gasta un uso)</legend>${objetos}${botin}</fieldset>` : ""}
    <fieldset><legend>Habilidades (+1 dado, cuestan Sangre: tienes ${s.sangre})</legend>${poderes(s.habilidades, "hab")}${poderes(s.mejoras, "mej") || ""}</fieldset>
    <label class="er-campo"><span>Dados extra</span><input type="number" name="extra" value="0" min="-5" max="10" step="1"></label>
  </div>`;
  const datos = await DialogV2.wait({
    window: { title: `${actor.name} · preparar la tirada`, icon: "fa-solid fa-dice" }, classes: [ID, "er-dialogo"], position: { width: 460 }, content, rejectClose: false,
    buttons: [{ action: "tirar", label: "Tirar", icon: "fa-solid fa-dice", default: true, callback: (ev, boton) => new foundry.applications.ux.FormDataExtended(boton.form).object }]
  });
  if (!datos || typeof datos !== "object") return;
  const marcados = pre => Object.entries(datos).filter(([k, v]) => v && k.startsWith(`${pre}.`)).map(([k]) => Number(k.split(".")[1]));
  return tirar(actor, { atributo: datos.atributo, amenaza: datos.amenaza, equipo: marcados("eq"), botin: Boolean(datos.botin), habilidades: marcados("hab"), mejoras: marcados("mej"), extra: Number(datos.extra) || 0 });
}

/* ───────────── Tirar ───────────── */

export async function tirar(actor, { atributo = "", amenaza = "", equipo = [], botin = false, habilidades = [], mejoras = [], extra = 0, ultimo = false } = {}) {
  const dato = actor.toObject().system, s = actor.system, bloq = new Set(s.bloqueos);
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
  const rJ = await new Roll(`${n}d6`).evaluate();
  const rG = ataque.dados ? await new Roll(`${ataque.dados}d6`).evaluate() : null;
  const carasGM = rG ? caras(rG) : [];
  const especiales = bloq.has("especiales") ? [] : [...dato.habilidades, ...dato.mejoras.filter(h => h.activa)].filter(h => h.tipo === "especial").map(h => ({ nombre: h.nombre, texto: h.texto }));
  const tirada = {
    actor: actor.id, ultimo, atributo: ultimo ? `Último gesto: ${s.ultimoGesto}` : (ATRIBUTOS[atributo] ?? "Sin atributo"),
    umbral: ataque.amenaza?.umbral ?? 4, dados: caras(rJ).map(c => ({ c, origen: "", destino: null })),
    gm: { caras: carasGM, exitos: R.exitosGM(carasGM, { anatema: ataque.amenaza?.anatema }), amenaza: ataque.amenaza?.id ?? "", nombre: ataque.amenaza?.nombre ?? "", garras: Boolean(ataque.amenaza?.garras), otras: Math.max(0, R.activas(m.amenazas).length - 1) },
    usados, bonos: bloq.has("bonos") ? [] : bonos, sinBonos: bloq.has("bonos") && bonos.length > 0, especiales, sinBeber: bloq.has("beber"),
    defensa: 0, absorbido: {}, notas, flashback: null, cerrada: false, resultado: null
  };
  await actor.update(cambios);
  const datos = { content: `<div class="er-tirada"></div>`, speaker: ChatMessage.getSpeaker({ actor }), rolls: rG ? [rJ, rG] : [rJ], sound: CONFIG.sounds.dice, flags: { [ID]: { tirada } } };
  aplicarModo(datos);
  const mensaje = await ChatMessage.create(datos);
  pedir("tiradaHecha", { mensaje: mensaje.id });
  return mensaje;
}

export const ultimoGesto = actor => tirar(actor, { ultimo: true });

/* ───────────── Pintar la tarjeta ───────────── */

const ICONO = { objetivo: "fa-bullseye", amenaza: "fa-skull", defensa: "fa-shield", sangre: "fa-droplet", especial: "fa-star" };

export function htmlTirada(mensaje, t) {
  const actor = game.actors.get(t.actor);
  const mio = Boolean(actor?.isOwner) && !t.cerrada;
  const dado = (d, i) => {
    const ex = R.exitosDado(d.c, t.umbral);
    const clase = d.destino ? "gastado" : ex === 2 ? "critico" : ex ? "exito" : "fallo";
    const titulo = d.destino ? `${d.destino.nombre}` : ex ? (mio ? "Pulsa para gastar este éxito" : `${ex} éxito${ex > 1 ? "s" : ""}`) : "Descartado";
    const dentro = d.destino ? `<i class="fa-solid ${ICONO[d.destino.tipo]}" inert></i>` : d.c;
    return `<button type="button" class="er-dado ${clase}${d.origen ? " bono" : ""}" data-dado="${i}" ${!ex || d.destino || !mio ? "disabled" : ""} data-tooltip="${esc(titulo)}" aria-label="Dado ${d.c}. ${esc(titulo)}">${dentro}</button>`;
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

/** Menú de destinos para un dado, construido con la misión del momento. */
function menuDestinos(mensaje, t, i, ancla) {
  document.querySelector(".er-menu")?.remove();
  const m = mision(), d = t.dados[i], ex = R.exitosDado(d.c, t.umbral), quedan = Math.max(0, t.gm.exitos - t.defensa);
  const vivas = m.amenazas.filter(a => a.valor > 0);
  const soloSinSangre = vivas.length > 0 && vivas.every(a => a.sinSangre);
  const op = [
    ...m.objetivos.filter(o => o.valor > 0).map(o => ({ tipo: "objetivo", id: o.id, texto: `${o.secundario ? "Secundario" : "Objetivo"}: ${o.nombre} (${o.valor}${o.desafio ? `, Desafío ${o.desafio}` : ""})` })),
    ...vivas.map(a => ({ tipo: "amenaza", id: a.id, texto: `Atacar: ${a.nombre} (${a.valor}${a.desafio ? `, Desafío ${a.desafio}` : ""})` })),
    ...(quedan ? [{ tipo: "defensa", texto: `Defenderse (quedan ${quedan} ataques)` }] : []),
    ...(t.sinBeber || soloSinSangre || !vivas.length ? [] : [{ tipo: "sangre", texto: `Beber sangre (+${ex})` }]),
    ...(d.c === 6 ? [...t.especiales.map(e => ({ tipo: "especial", nombre: e.nombre, texto: `ESPECIAL · ${e.nombre}`, ayuda: e.texto })), { tipo: "especial", nombre: "", texto: "Otro ESPECIAL" }] : [])
  ];
  const menu = document.createElement("div");
  menu.className = `${ID} er-menu`;
  menu.setAttribute("role", "menu");
  menu.innerHTML = `<p>Gastar ${ex > 1 ? "este crítico (2 éxitos)" : "este éxito"} en…</p>` + (op.map((o, k) => `<button type="button" role="menuitem" data-k="${k}" ${o.ayuda ? `data-tooltip="${esc(o.ayuda)}"` : ""}><i class="fa-solid ${ICONO[o.tipo]}" inert></i> ${esc(o.texto)}</button>`).join("") || "<p>No hay nada en juego. Abre el Panel de misión.</p>");
  document.body.append(menu);
  const r = ancla.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(r.left - menu.offsetWidth + r.width, window.innerWidth - menu.offsetWidth - 8))}px`;
  menu.style.top = `${Math.min(r.bottom + 4, window.innerHeight - menu.offsetHeight - 8)}px`;
  menu.addEventListener("click", ev => {
    const o = op[ev.target.closest("button[data-k]")?.dataset.k];
    if (o) pedir("asignar", { mensaje: mensaje.id, i, tipo: o.tipo, id: o.id ?? "", nombre: o.nombre ?? "" });
    menu.remove();
  });
  setTimeout(() => document.addEventListener("pointerdown", ev => { if (!menu.contains(ev.target)) menu.remove(); }, { once: true, capture: true }), 0);
  menu.querySelector("button")?.focus();
}

export function escucharTiradas() {
  alRenderizarMensaje((mensaje, html) => {
    const t = mensaje.getFlag(ID, "tirada");
    const hueco = html.querySelector(".er-tirada");
    if (!t || !hueco) return;
    hueco.innerHTML = htmlTirada(mensaje, t);
    pintarRetratos(hueco);
    hueco.addEventListener("click", ev => {
      const dado = ev.target.closest("button[data-dado]");
      if (dado) return menuDestinos(mensaje, mensaje.getFlag(ID, "tirada"), Number(dado.dataset.dado), dado);
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
    let texto = "", nombre = datos.nombre;
    if (datos.tipo === "objetivo" || datos.tipo === "amenaza") {
      await cambiarMision(m => {
        const o = (datos.tipo === "objetivo" ? m.objetivos : m.amenazas).find(x => x.id === datos.id);
        if (!o || o.valor <= 0) return;
        const r = R.aplicarExitos(o, ex, t.absorbido[o.id] ?? 0);
        t.absorbido[o.id] = r.absorbido;
        o.valor = r.valor;
        nombre = o.nombre;
        texto = `${o.nombre}: ${r.absorbe ? `el Desafío absorbe ${r.absorbe}; ` : ""}${ex - r.absorbe ? `−${ex - r.absorbe} → ${o.valor}` : "sin efecto"}`;
        if (o.valor === 0) {
          if (datos.tipo === "amenaza") { o.ataque = 0; texto += o.revive ? ". ¡Rechazada! (volverá con refuerzos)" : ". ¡Destruida!"; }
          else texto += o.secundario ? ". ¡Secundario cumplido! Elige recompensa." : ". ¡Objetivo cumplido!";
        }
      });
      if (!texto) return;
    } else if (datos.tipo === "defensa") {
      t.defensa += ex; nombre = "Defensa"; texto = `Se defiende: −${ex} ataque${ex > 1 ? "s" : ""}`;
    } else if (datos.tipo === "sangre") {
      const antes = actor.system.sangre, ahora = Math.min(R.SANGRE_MAX, antes + ex);
      await actor.update({ "system.sangre": ahora });
      nombre = "Sangre"; texto = `Bebe sangre: +${ahora - antes} (tiene ${ahora})`;
    } else if (datos.tipo === "especial" && d.c === 6) {
      const e = t.especiales.find(x => x.nombre === datos.nombre);
      nombre = e?.nombre || "ESPECIAL"; texto = e ? `ESPECIAL · ${e.nombre}: ${e.texto}` : "ESPECIAL (aplicadlo en el Panel de misión)";
    } else return;
    d.destino = { tipo: datos.tipo, nombre, texto };
    await guardar(msg, t);
  });

  operacion("bono", async (datos, quien) => {
    const { msg, t } = abrir(datos, quien);
    const b = t?.bonos[datos.k];
    if (!b || b.hecho) return;
    const roll = await new Roll(`${b.n}d6`).evaluate();
    mostrar3d(roll, quien);
    b.hecho = true;
    t.dados.push(...caras(roll).map(c => ({ c, origen: b.nombre, destino: null })));
    t.usados.push(`${mas(b.n)}${b.req}`);
    await guardar(msg, t);
  });

  operacion("flashback", async (datos, quien) => {
    const { msg, t, actor } = abrir(datos, quien);
    if (!t || t.flashback || actor.system.flashback || t.dados.some(d => d.destino) || R.totalExitos(t.dados.map(d => d.c), t.umbral) > 2) return;
    const otros = vampiros().filter(v => v.id !== actor.id && !v.system.muerto);
    const quienSale = otros.length ? otros[Math.floor(Math.random() * otros.length)].name : "alguien de F.A.N.G.";
    const roll = await new Roll(`${t.dados.length + 2}d6`).evaluate();
    mostrar3d(roll, quien);
    t.flashback = { contexto: FLASHBACK.contexto[(await d6()) - 1], pregunta: FLASHBACK.preguntas[(await d6()) - 1].replace("[personaje]", quienSale) };
    t.dados = caras(roll).map(c => ({ c, origen: "", destino: null }));
    for (const b of t.bonos) b.hecho = false;
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
    }
    await cambiarMision(m => {
      if (!t.ultimo && !m.actuaron.includes(actor.id)) m.actuaron.push(actor.id);
      const a = m.amenazas.find(x => x.id === t.gm.amenaza);
      if (a && a.valor > 0 && t.gm.caras.length && t.gm.exitos === 0 && a.crece) { a.ataque += 1; r.sube = `${a.nombre} no ha acertado ni una: su Ataque sube a ${a.ataque}.`; }
      if (r.lesion?.derribado && !r.lesion.muerto) m.objetivos.push({ id: nuevoId(), nombre: `Rescatar a ${actor.name}`, valor: 3, max: 3, desafio: 0, secundario: true, premio: `${actor.name} vuelve al combate.`, rescate: actor.id });
    });
    t.cerrada = true; t.resultado = r;
    await guardar(msg, t);
  });
}
