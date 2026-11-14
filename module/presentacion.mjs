/** Presentación sincronizada con ajustes de mundo y audio nativo de Foundry. Solo publica el GM activo. */
import { ID, RUTA, mision, cambiarMision } from "./mesa.mjs";
import { ApplicationV2, HandlebarsApplicationMixin } from "./compat.mjs";
import { AUDIO, VERSION_CONTENIDO } from "./banda-sonora-datos.mjs";
import { PERSONAJES, ESTADO_INICIAL, TIEMPOS, estadoSeguro, siguienteEstado, reparto, claveSonido, bloquearMusica } from "./presentacion-core.mjs";
import { sonar } from "./escenas.mjs";
import { crearVistaPresentacion } from "./presentacion-vista.mjs";

const versionada = ruta => `${RUTA}/${ruta}?v=${VERSION_CONTENIDO}`;
const activoGM = () => game.user.isGM && game.users.activeGM?.isSelf;
const lista = () => game.playlists.find(p => p.getFlag(ID, "clave") === "presentacion");
export const escenaPresentacion = () => game.scenes.find(s => s.getFlag(ID, "presentacion") === true);
export const presentacionActiva = () => game.scenes.active?.getFlag(ID, "presentacion") === true;
export const estadoPresentacion = () => estadoSeguro(game.settings.get(ID, "presentacionEstado"));
const todos = () => { const b = mision().banquillo ?? []; return reparto(game.actors.contents, game.users.contents).map(p => ({ ...p, juega: !b.includes(p.actorId) })); };
const roster = () => todos().filter(p => p.juega);
const sonando = () => (lista()?.sounds ?? []).some(s => s.playing);
let preparando = null, cola = Promise.resolve(), activando = false, vista = null, saliendo = false;
let control = null, generacion = 0;
const vigente = turno => turno === generacion && presentacionActiva() && activoGM();
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));
const enqueue = fn => (cola = cola.catch(() => {}).then(fn));
const fallo = e => { console.error(`${ID} | Presentación`, e); ui.notifications.error("No se pudo completar la presentación. Puedes reintentarlo desde su panel."); };

export function asegurarPresentacion() {
  if (!activoGM()) return Promise.resolve();
  if (!preparando) preparando = preparar().finally(() => { preparando = null; });
  return preparando;
}

async function preparar() {
  let pl = lista();
  if (!pl) pl = await Playlist.create({ name: "F.A.N.G. · Presentación", mode: -1, sorting: "m", flags: { [ID]: { clave: "presentacion" } } });
  const tracks = [{ clave: "sala", name: "Sala de despliegue · The Complex", path: versionada(AUDIO.presentacion.ruta) },
    ...PERSONAJES.map(p => ({ clave: p.id, name: `${p.nombre} · ${AUDIO[`pj-${p.id}`].obra}`, path: versionada(AUDIO[`pj-${p.id}`].ruta) }))];
  const nuevas = [], cambios = [];
  for (const t of tracks) {
    const s = pl.sounds.find(s => s.getFlag(ID, "presentacionTema") === t.clave);
    if (!s) nuevas.push({ name: t.name, path: t.path, volume: .5, repeat: true, fade: 700, flags: { [ID]: { presentacionTema: t.clave } } });
    else if (s.path !== t.path || s.name !== t.name || !s.repeat)
      cambios.push({ _id: s.id, name: t.name, path: t.path, repeat: true });
  }
  if (nuevas.length) await pl.createEmbeddedDocuments("PlaylistSound", nuevas);
  if (cambios.length) await pl.updateEmbeddedDocuments("PlaylistSound", cambios);
  const sala = pl.sounds.find(s => s.getFlag(ID, "presentacionTema") === "sala");
  let escena = escenaPresentacion();
  if (!escena) escena = await Scene.create({ name: "F.A.N.G. · Sala de despliegue", width: 1920, height: 1080, padding: 0,
    grid: { type: 0, size: 100, distance: 1, units: "" }, tokenVision: false, navigation: true, navOrder: -100,
    background: { src: versionada("assets/escenas/presentacion.webp") },
    thumb: versionada("assets/escenas/presentacion-thumb.webp"),
    playlist: pl.id, playlistSound: sala.id,
    flags: { [ID]: { presentacion: true, escena: "presentacion" } } });
  else {
    const delta = {};
    if (escena._source.playlist !== pl.id) delta.playlist = pl.id;
    if (escena._source.playlistSound !== sala.id) delta.playlistSound = sala.id;
    const src = versionada("assets/escenas/presentacion.webp");
    if (escena.background?.src?.startsWith(`${RUTA}/assets/escenas/`) && escena.background.src !== src) delta["background.src"] = src;
    if (Object.keys(delta).length) await escena.update(delta);
  }
  return escena;
}

async function publicar(patch) {
  await game.settings.set(ID, "presentacionEstado", siguienteEstado(estadoPresentacion(), { ...patch, instante: Date.now() }));
}

async function pararExterna() {
  for (const p of game.playlists) {
    if (p.id === lista()?.id || p.flags?.[ID]?.clave === "sfx" || p.channel === "interface") continue;
    for (const s of p.sounds) {
      if (!s.playing || s.flags?.["mr-direccion"]?.ch === "fx") continue;
      await p.stopSound(s);
    }
  }
}

async function tocar(clave) {
  const pl = lista(), sonido = pl?.sounds.find(s => s.getFlag(ID, "presentacionTema") === clave);
  if (!sonido) throw new Error(`Falta el tema de presentación: ${clave}`);
  const volumen = Math.min(1, Math.max(0, Number(game.settings.get(ID, "presentacionVolumen")) || 0));
  await sonido.update({ volume: volumen, fade: 700, "flags.mr-direccion.ch": "music" });
  const otros = pl.sounds.filter(s => s.playing && s.id !== sonido.id);
  await Promise.all(otros.map(s => s.update({ fade: 700 })));
  await Promise.all([sonido.playing ? Promise.resolve() : pl.playSound(sonido), ...otros.map(s => pl.stopSound(s))]);
}

async function cerrarActual() {
  const turno = generacion;
  if (!vigente(turno)) return false;
  if (!estadoPresentacion().personaje) return true;
  await publicar({ fase: "cerrando" }); sonar("ataud-cerrar", .45);
  await esperar(TIEMPOS.cierre);
  if (!vigente(turno)) return false;
  await publicar({ fase: "salida" });
  await tocar("sala");
  await esperar(TIEMPOS.fundido);
  if (!vigente(turno)) return false;
  await publicar({ personaje: "", fase: "sala" });
  return true;
}

async function entrar(personaje = "") {
  const escena = await asegurarPresentacion();
  if (!escena) return;
  let anterior = estadoPresentacion().anterior;
  if (!presentacionActiva()) {
    anterior = game.scenes.active?.id ?? "";
    activando = true;
    try { await escena.activate(); } finally { activando = false; }
    await publicar({ escena: escena.id, anterior, personaje: "", activa: true, fase: "sala" });
  } else if (!await cerrarActual()) return;
  const turno = generacion;
  await pararExterna();
  if (!vigente(turno)) return;
  if (!personaje) {
    await publicar({ escena: escena.id, anterior, personaje: "", activa: true, fase: "sala" });
    await tocar("sala"); return;
  }
  await publicar({ escena: escena.id, anterior, personaje, activa: true, fase: "entrada" });
  await tocar(personaje);
  await esperar(TIEMPOS.entrada);
  if (!vigente(turno)) return;
  await publicar({ fase: "abriendo" });
  if (!vigente(turno)) return;
  sonar("ataud-abrir", .45);
  await esperar(TIEMPOS.apertura);
  if (!vigente(turno)) return;
  await publicar({ fase: "abierto" });
}

export function iniciarPresentacion() {
  if (!activoGM()) return Promise.resolve(ui.notifications.warn("Solo el director activo puede iniciar la presentación."));
  return enqueue(() => entrar()).catch(fallo);
}
export function presentarPersonaje(clave) {
  if (!activoGM()) return Promise.resolve();
  const id = String(clave).toLowerCase().replace(/^pj-/, "");
  if (!PERSONAJES.some(p => p.id === id)) return Promise.resolve();
  return enqueue(() => entrar(id)).catch(fallo);
}
export function siguientePresentacion() {
  if (!activoGM() || !presentacionActiva()) return Promise.resolve();
  return enqueue(async () => { if (!await cerrarActual()) return; await publicar({ personaje: "", activa: true, fase: "sala" }); await tocar("sala"); }).catch(fallo);
}
export function terminarPresentacion() {
  if (!activoGM() || !presentacionActiva()) return Promise.resolve();
  return enqueue(async () => {
    if (!presentacionActiva()) return;
    // Al salir, la mesa va al mapa de París (o, si no está importado, a la escena de la que se vino).
    const anterior = game.scenes.find(s => s.getFlag(ID, "escena") === "paris") ?? game.scenes.get(estadoPresentacion().anterior) ?? game.scenes.find(s => !s.getFlag(ID, "presentacion"));
    if (presentacionActiva() && !await cerrarActual()) return;
    await publicar({ personaje: "", activa: false, fase: "sala" });
    await lista()?.stopAll();
    control?.close();
    if (anterior && !anterior.getFlag(ID, "presentacion")) {
      saliendo = true;
      try { await anterior.activate(); } finally { saliendo = false; }
    }
  }).catch(fallo);
}

function refrescar() {
  const estado = estadoPresentacion();
  const visible = estado.activa && globalThis.canvas?.scene?.id === estado.escena && presentacionActiva();
  vista?.render(estado, roster(), visible);
  if (control?.rendered) control.render({ force: true });
}

class PanelPresentacion extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = { id: "er-presentacion-control", classes: [ID, "er-presentacion-control"],
    window: { title: "F.A.N.G. · Presentación de jugadores", resizable: true }, position: { width: 500, height: "auto" },
    actions: { iniciar: () => iniciarPresentacion(), siguiente: () => siguientePresentacion(), terminar: () => terminarPresentacion(),
      personaje: (ev, b) => presentarPersonaje(b.dataset.personaje),
      juega: (ev, b) => { const id = b.dataset.id; return cambiarMision(m => { m.banquillo = m.banquillo.includes(id) ? m.banquillo.filter(x => x !== id) : [...m.banquillo, id]; if (m.turno === id) m.turno = ""; }); },
      musica: () => alternarMusica() } };
  static PARTS = { contenido: { template: `${RUTA}/templates/apps/presentacion.hbs` } };
  async _prepareContext() {
    const s = estadoPresentacion();
    const ocupado = !["sala", "abierto"].includes(s.fase);
    const faseTexto = ({ entrada: "Ataúd cerrado · preparando apertura", abriendo: "Abriendo compuerta…", abierto: "Personaje presentado · compuerta abierta", cerrando: "Cerrando compuerta…", salida: "Recuperando la sala…", sala: "Sala de despliegue lista" })[s.fase];
    return { ocupado, faseTexto, suena: sonando(), filas: todos().map(p => ({ ...p, seleccionada: s.personaje === p.id, img: `${RUTA}/assets/retratos/${p.id}.webp` })),
      enSala: presentacionActiva(), personaje: s.personaje, volumen: Math.round((Number(game.settings.get(ID, "presentacionVolumen")) || 0) * 100) };
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("[data-er-pres-volumen]")?.addEventListener("change", e => {
      if (!activoGM()) return;
      const value = Math.min(1, Math.max(0, Number(e.target.value) / 100));
      enqueue(async () => { await game.settings.set(ID, "presentacionVolumen", value);
        for (const s of lista()?.sounds ?? []) if (s.playing) await s.update({ volume: value }); }).catch(fallo);
    });
  }
}
/** Para o reanuda la música de la sala (o el tema del personaje presentado). Para quien dirige sin MR- Dirección. */
function alternarMusica() {
  if (!activoGM() || !presentacionActiva()) return Promise.resolve();
  return enqueue(async () => {
    if (sonando()) for (const s of lista().sounds) { if (s.playing) await lista().stopSound(s); }
    else await tocar(estadoPresentacion().personaje || "sala");
    if (control?.rendered) control.render({ force: true });
  }).catch(fallo);
}
export function abrirPresentacion() {
  if (!game.user.isGM) return;
  control ??= new PanelPresentacion(); control.render({ force: true });
}

export function registrarPresentacion() {
  game.settings.register(ID, "presentacionEstado", { scope: "world", config: false, type: Object, default: { ...ESTADO_INICIAL }, onChange: refrescar });
  game.settings.register(ID, "presentacionVolumen", { scope: "world", config: false, type: Number, default: .5 });
  game.settings.registerMenu(ID, "presentacionPanel", { name: "Presentación de jugadores", label: "Abrir sala de despliegue",
    hint: "Cinco cápsulas en la sala; presenta cada personaje con su ilustración y canción originales.", icon: "fa-solid fa-id-card", restricted: true, type: PanelPresentacion });
  Hooks.once("ready", () => {
    vista = crearVistaPresentacion(document, RUTA);
    if (game.user.isGM) {
      const boton = document.createElement("button"); boton.type = "button";
      boton.className = "er-pres-control-rapido"; boton.textContent = "Control de presentación";
      boton.addEventListener("click", abrirPresentacion); vista.root.append(boton);
    }
    refrescar();
    // Al recargar, Foundry puede restaurar la pista nativa de sala. Se reconcilia con el personaje compartido.
    if (activoGM() && presentacionActiva()) enqueue(async () => {
      await asegurarPresentacion(); await pararExterna();
      const s = estadoPresentacion(), escena = escenaPresentacion();
      const personaje = s.activa && s.escena === escena.id ? s.personaje : "";
      if (!s.activa || s.escena !== escena.id) await publicar({ escena: escena.id, personaje, activa: true, fase: personaje ? "abierto" : "sala" });
      else if (personaje && s.fase !== "abierto") await publicar({ fase: "abierto" });
      await tocar(personaje || "sala");
    }).catch(fallo);
  });
  Hooks.on("canvasReady", () => refrescar());
  Hooks.on("updateUser", () => refrescar());
  Hooks.on("updatePlaylistSound", s => { if (s.parent?.getFlag(ID, "clave") === "presentacion" && control?.rendered) control.render({ force: true }); });
  Hooks.on("eatthereich.mision", () => { if (control?.rendered) control.render({ force: true }); });
  Hooks.on("updateActor", () => refrescar());
  Hooks.on("preUpdatePlaylistSound", (s, cambios) => {
    if (saliendo || s.flags?.["mr-direccion"]?.ch === "fx") return;
    if (bloquearMusica(game.scenes.active, s.parent, cambios)) return false;
  });
  Hooks.on("preCreatePlaylistSound", (s, datos) => {
    if (saliendo || datos.flags?.["mr-direccion"]?.ch === "fx") return;
    if (bloquearMusica(game.scenes.active, s.parent, datos)) return false;
  });
  Hooks.on("updateScene", (escena, cambios) => {
    if (!activoGM() || cambios.active !== true || activando) return;
    generacion++; // Abandonar la escena cancela una apertura/cierre que siguiera esperando.
    if (escena.getFlag(ID, "presentacion")) {
      enqueue(async () => { await pararExterna(); await publicar({ escena: escena.id, personaje: "", activa: true, fase: "sala" }); await tocar("sala"); }).catch(fallo);
    } else {
      // Al salir de la sala se calla siempre su música (aunque el estado compartido se hubiera perdido) y suena la de la escena nueva:
      // Foundry intenta arrancarla antes de que cambie la escena activa y el bloqueo de la presentación la frena.
      enqueue(async () => {
        if (estadoPresentacion().activa) await publicar({ activa: false, personaje: "", fase: "sala" });
        for (const s of lista()?.sounds ?? []) if (s.playing) await lista().stopSound(s);
        const pista = escena.playlistSound;
        if (pista && !pista.playing) await escena.playlist.playSound(pista);
      }).catch(fallo);
    }
  });
}
