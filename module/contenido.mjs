/** Actualización no destructiva de música, decorado y atrezo; nunca reimporta la misión. */
import { ID, RUTA } from "./mesa.mjs";
import { AUDIO, MUSICA_LUGAR, TEMAS_PERSONAJE, MOTIVOS, VERSION_CONTENIDO } from "./banda-sonora-datos.mjs";

import { EFECTOS, EFECTOS_BARRA } from "./efectos-datos.mjs";
import { repararCatalogo, podarCatalogo } from "./direccion-contenido.mjs";

import { asegurarPresentacion } from "./presentacion.mjs";

const DIR = "mr-direccion";
const raizAudio = `${RUTA}/assets/audio/`;
const versionada = ruta => `${RUTA}/${ruta}?v=${VERSION_CONTENIDO}`;
const fuente = clave => versionada(AUDIO[clave].ruta);
const gestionada = ruta => typeof ruta === "string" &&
  (ruta.startsWith(`${raizAudio}musica/`) || ruta.startsWith(`${raizAudio}personajes/`));
const director = () => Boolean(game.users.activeGM?.isSelf);
const l = clave => game.i18n.localize(clave);
let pendiente = Promise.resolve();

// ready y la importación pueden coincidir: se serializan para no duplicar documentos.
export function actualizarContenido() {
  pendiente = pendiente.catch(() => {}).then(actualizar);
  return pendiente;
}

async function actualizar() {
  if (!director()) return;
  const lista = game.playlists.find(p => p.getFlag(ID, "clave") === "musica");
  if (!lista) return; // En un mundo vacío debe terminar primero la importación.
  await actualizarAudio(lista);
  await actualizarEfectos();
  await actualizarDireccion();
  await actualizarPlaza();
  await asegurarAtaud();
  await asegurarPresentacion();
  if (game.settings.get(ID, "contenidoVersion") !== VERSION_CONTENIDO)
    await game.settings.set(ID, "contenidoVersion", VERSION_CONTENIDO);
}

async function actualizarAudio(lista) {
  const existentes = new Map(lista.sounds.map(s => [s.getFlag(ID, "clave"), s]));
  const cambios = [], nuevas = [];
  let orden = 0;
  for (const [clave, a] of Object.entries(AUDIO)) {
    const sonido = existentes.get(clave);
    const datos = { name: `${a.titulo} · ${a.obra}`, path: fuente(clave),
      repeat: !a.personaje, sort: orden++ * 100000 };
    if (!sonido) nuevas.push({ ...datos, volume: 0.5, playing: false, flags: { [ID]: { clave } } });
    else if (gestionada(sonido.path)) {
      const delta = { _id: sonido.id };
      for (const [k, v] of Object.entries(datos)) if (sonido[k] !== v) delta[k] = v;
      if (Object.keys(delta).length > 1) cambios.push(delta);
    }
  }
  if (cambios.length) await lista.updateEmbeddedDocuments("PlaylistSound", cambios);
  if (nuevas.length) await lista.createEmbeddedDocuments("PlaylistSound", nuevas);
  const sonidos = new Map(lista.sounds.map(s => [s.getFlag(ID, "clave"), s]));
  const manda = Boolean(game.modules.get(DIR)?.active && game.modules.get(DIR)?.api);
  for (const escena of game.scenes) {
    if (escena.flags?.[ID]?.presentacion) continue;
    const clave = MUSICA_LUGAR[escena.getFlag(ID, "escena")];
    const sonido = sonidos.get(clave);
    if (!sonido) continue;
    const anterior = escena.getFlag(ID, "musica"), actual = escena._source;
    // Mantener las listas externas elegidas por el director.
    if ((actual.playlist && actual.playlist !== lista.id) ||
        (anterior?.playlist && anterior.playlist !== lista.id)) continue;
    const enlace = { playlist: lista.id, playlistSound: sonido.id };
    const delta = {};
    if (anterior?.playlist !== enlace.playlist || anterior?.playlistSound !== enlace.playlistSound)
      delta[`flags.${ID}.musica`] = enlace;
    const nativo = manda ? { playlist: null, playlistSound: null } : enlace;
    if ((actual.playlist ?? null) !== nativo.playlist) delta.playlist = nativo.playlist;
    if ((actual.playlistSound ?? null) !== nativo.playlistSound) delta.playlistSound = nativo.playlistSound;
    if (Object.keys(delta).length) await escena.update(delta);
  }
  if (manda && lista.sounds.some(s => s.playing)) await lista.stopAll();
}

async function actualizarEfectos() {
  const lista = game.playlists.find(p => p.getFlag(ID, "clave") === "sfx");
  if (!lista) return;
  const nuevas = [], cambios = [];
  for (const [clave, [label]] of Object.entries(EFECTOS)) {
    const path = versionada(`assets/audio/sfx/${clave}.ogg`);
    const s = lista.sounds.find(s => s.getFlag(ID, "clave") === clave);
    if (!s) nuevas.push({ name: label, path, repeat: false, volume: .55, fade: 0, flags: { [ID]: { clave } } });
    else if (s.path?.startsWith(`${RUTA}/assets/audio/sfx/`) && (s.path !== path || s.name !== label || s.repeat))
      cambios.push({ _id: s.id, name: label, path, repeat: false, fade: 0 });
  }
  if (nuevas.length) await lista.createEmbeddedDocuments("PlaylistSound", nuevas);
  if (cambios.length) await lista.updateEmbeddedDocuments("PlaylistSound", cambios);
}

async function actualizarDireccion() {
  if (!game.modules.get(DIR)?.active) return;
  const global = game.settings.get(DIR, "global") ?? {};
  const motivos = [...Object.entries(MOTIVOS).map(([id, icon]) => ({ id, label: AUDIO[id].titulo, icon, music: { src: fuente(id) } })),
    ...TEMAS_PERSONAJE.map(t => ({ ...t, music: { src: fuente(t.id) } }))];
  // A la barra van solo unos pocos efectos; el resto se retira del catálogo guardado (salvo lo que el director haya reasignado).
  const efectos = Object.entries(EFECTOS_BARRA).map(([id, label]) => ({ id, label, icon: EFECTOS[id][1],
    sound: { src: versionada(`assets/audio/sfx/${id}.ogg`) } }));
  const retirados = Object.keys(EFECTOS).filter(id => !(id in EFECTOS_BARRA));
  const nextGlobal = { ...global, motifs: repararCatalogo(global.motifs ?? [], motivos),
    effects: repararCatalogo(podarCatalogo(global.effects ?? [], retirados), efectos, "sound").map(e => (e.id in EFECTOS_BARRA && e.sound?.src?.startsWith(`${RUTA}/assets/audio/sfx/`) ? { ...e, label: EFECTOS_BARRA[e.id] } : e)) };
  if (JSON.stringify(global) !== JSON.stringify(nextGlobal)) await game.settings.set(DIR, "global", nextGlobal);
  for (const escena of game.scenes) {
    const clave = escena.getFlag(ID, "escena"), pista = MUSICA_LUGAR[clave];
    const config = escena.getFlag(DIR, "config");
    if (!pista || !config) continue;
    const next = foundry.utils.deepClone(config);
    let cambia = false;
    if (gestionada(next.music?.src) && next.music.src !== fuente(pista)) {
      next.music = { src: fuente(pista) }; cambia = true;
    }
    // Las listas explícitas de 0.5.0 recuperan el catálogo completo.
    if (Array.isArray(next.motifs)) {
      const ids = new Set(next.motifs);
      for (const id of motivos.map(t => t.id)) if (!ids.has(id)) {
        next.motifs.push(id); ids.add(id); cambia = true;
      }
    }
    if (clave === "sirena" && next.thumb?.startsWith(`${RUTA}/assets/escenas/`)) {
      const thumb = versionada("assets/escenas/sirena-limpia-thumb.webp");
      if (next.thumb !== thumb) { next.thumb = thumb; cambia = true; }
    }
    if (cambia) await escena.setFlag(DIR, "config", next);
  }
}

async function actualizarPlaza() {
  for (const escena of game.scenes) {
    if (escena.getFlag(ID, "escena") !== "sirena") continue;
    const actual = escena.background?.src ?? escena._source.background?.src;
    const src = versionada("assets/escenas/sirena-limpia.webp");
    if (actual?.startsWith(`${RUTA}/assets/escenas/`) && !actual.includes("/despliegue/") && actual !== src)
      await escena.update({ "background.src": src, thumb: versionada("assets/escenas/sirena-limpia-thumb.webp") });
  }
}

export const actorAtaud = () => game.actors.find(a => a.type === "objeto" && a.getFlag(ID, "clave") === "ataud-metalico");

export function datosAtaud(folder) {
  const img = versionada("assets/atrezo/ataud-metalico.png");
  return { name: l("ER.Coffin.Name"), type: "objeto", folder, img,
    flags: { [ID]: { clave: "ataud-metalico" } }, ownership: { default: 0 },
    system: { descripcion: l("ER.Coffin.Description"), notas: "" },
    prototypeToken: { name: l("ER.Coffin.Name"), actorLink: false, disposition: 0,
      width: 1.5, height: 2, displayName: 0, displayBars: 0, lockRotation: false,
      texture: { src: img }, sight: { enabled: false }, ring: { enabled: false },
      bar1: { attribute: null }, bar2: { attribute: null } }
  };
}

async function asegurarAtaud() {
  if (actorAtaud()) return;
  let carpeta = game.folders.find(f => f.type === "Actor" && f.getFlag(ID, "clave") === "atrezo");
  if (!carpeta) carpeta = await Folder.create({ name: l("ER.Coffin.Folder"), type: "Actor", color: "#d81557", flags: { [ID]: { clave: "atrezo" } } });
  await Actor.create(datosAtaud(carpeta.id));
  // Su posición la decide el grupo: no se coloca automáticamente ningún token.
}

/** Atajo del GM: coloca una copia en el centro de la escena, que luego se puede mover. */
export async function colocarAtaud(actor = actorAtaud()) {
  if (!game.user.isGM) return;
  const lienzo = globalThis.canvas, escena = lienzo?.scene;
  if (!lienzo?.ready || !escena) return ui.notifications.warn(l("ER.Coffin.OpenScene"));
  if (!actor) return ui.notifications.warn(l("ER.Coffin.Reload"));
  const rect = lienzo.dimensions.sceneRect, grid = escena.grid.size || 100;
  const token = await actor.getTokenDocument({ x: rect.x + rect.width / 2 - grid * 0.75,
    y: rect.y + rect.height / 2 - grid, hidden: false });
  return escena.createEmbeddedDocuments("Token", [token.toObject()]);
}

export function registrarContenido() {
  game.settings.register(ID, "contenidoVersion", { scope: "world", config: false, type: String, default: "" });
  Hooks.on("importAdventure", adventure => {
    if (adventure.pack !== `${ID}.aventura`) return;
    actualizarContenido().catch(errorContenido);
  });
}

export function errorContenido(error) {
  console.error(`${ID} | No se pudo actualizar el contenido`, error);
  ui.notifications.error(l("ER.Content.Error"));
}
