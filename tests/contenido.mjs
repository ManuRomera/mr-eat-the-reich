/** Comprobación de migraciones sin servidor: node tests/contenido.mjs */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { AUDIO, MUSICA_LUGAR, TEMAS_PERSONAJE, MOTIVOS_LUGAR, VERSION_CONTENIDO } from "../module/banda-sonora-datos.mjs";
const ID = "mr-eat-the-reich", RUTA = `systems/${ID}`;
const code = (await fs.readFile(new URL("../module/contenido.mjs", import.meta.url), "utf8")).replace(/^import .*;\n/gm, "");
const mod = await import(`data:text/javascript;base64,${Buffer.from(
  `const ID=${JSON.stringify(ID)}, RUTA=${JSON.stringify(RUTA)}, AUDIO=${JSON.stringify(AUDIO)}, MUSICA_LUGAR=${JSON.stringify(MUSICA_LUGAR)}, TEMAS_PERSONAJE=${JSON.stringify(TEMAS_PERSONAJE)}, MOTIVOS_LUGAR=${JSON.stringify(MOTIVOS_LUGAR)}, asegurarPresentacion=async()=>{} , VERSION_CONTENIDO=${JSON.stringify(VERSION_CONTENIDO)};\n${code}`
).toString("base64")}`);
let writes = 0, nextId = 0, tokenCount = 0;
const settings = new Map([["mr-direccion.global", { motifs: [
  { id: "accion", music: { src: `${RUTA}/assets/audio/musica/accion.ogg` } },
  { id: "custom", music: { src: "worlds/custom/track.mp3" } }
] }]]);
const flag = (obj, key) => obj.flags?.[ID]?.[key];
const scene = (key, custom = false) => ({
  id: key, flags: { [ID]: { escena: key, musica: { playlist: custom ? "custom" : "list", playlistSound: "old" } },
    "mr-direccion": { config: { music: { src: custom ? "worlds/custom/track.mp3" : `${RUTA}/assets/audio/musica/noche.ogg` },
      motifs: ["accion"], reading: { uuid: "JournalEntry.1234567890123456" }, figures: [] } } },
  _source: { playlist: custom ? "custom" : "list", playlistSound: "old", background: { src: custom ? "worlds/custom/picture.webp" : `${RUTA}/assets/escenas/sirena.webp` } },
  grid: { size: 100 }, tokens: [],
  getFlag(scope, key) { return this.flags[scope]?.[key]; },
  async setFlag(scope, key, value) { writes++; (this.flags[scope] ??= {})[key] = value; },
  async update(delta) {
    writes++;
    for (const [key, value] of Object.entries(delta)) {
      if (key === `flags.${ID}.musica`) this.flags[ID].musica = value;
      else if (key === "background.src") this._source.background.src = value;
      else this._source[key] = value;
    }
  },
  async createEmbeddedDocuments(type, docs) { assert.equal(type, "Token"); tokenCount += docs.length; return docs; }
});
const scenes = Object.keys(MUSICA_LUGAR).map(k => scene(k));
const custom = scene("sirena", true); scenes.push(custom);
const list = { id: "list", sounds: Object.keys(AUDIO).slice(0, 18).map(key => ({
  id: key, path: `${RUTA}/assets/audio/musica/${key}.ogg`, name: "Old", volume: .23,
  repeat: true, sort: 0, getFlag: () => key
})), getFlag: () => "musica",
  async updateEmbeddedDocuments(type, updates) { for (const d of updates) { writes++; Object.assign(this.sounds.find(s => s.id === d._id), d); } },
  async createEmbeddedDocuments(type, docs) { for (const d of docs) { writes++; this.sounds.push({ ...d, id: `s${++nextId}`, getFlag: () => d.flags[ID].clave }); } },
  async stopAll() { for (const s of this.sounds) s.playing = false; }
};
globalThis.foundry = { utils: { deepClone: structuredClone } };
globalThis.game = { user: { isGM: true }, users: { activeGM: { isSelf: true } },
  i18n: { localize: k => k }, actors: [], folders: [], scenes, playlists: [list],
  modules: new Map([["mr-direccion", { active: true, api: {} }]]),
  settings: { get: (s, k) => settings.get(`${s}.${k}`), set: async (s, k, v) => { writes++; settings.set(`${s}.${k}`, v); } }
};
globalThis.Folder = { create: async d => { writes++; const f = { ...d, id: "props", getFlag: (_, k) => d.flags[ID][k] }; game.folders.push(f); return f; } };
globalThis.Actor = { create: async d => { writes++; const a = { ...d, id: "coffin", getFlag: (_, k) => d.flags[ID][k],
  getTokenDocument: async patch => ({ toObject: () => ({ ...d.prototypeToken, ...patch }) }) }; game.actors.push(a); return a; } };
globalThis.ui = { notifications: { warn() {}, error() {} } };

await Promise.all([mod.actualizarContenido(), mod.actualizarContenido()]);
assert.equal(list.sounds.length, 36);
assert.equal(game.actors.length, 1);
assert.equal(game.actors[0].type, "objeto");
assert.equal(game.actors[0].prototypeToken.sight.enabled, false);
assert.equal(game.actors[0].prototypeToken.ring.enabled, false);
assert.equal(game.actors[0].prototypeToken.actorLink, false);
assert.equal(tokenCount, 0, "La actualización no coloca ataúdes en ninguna escena");
assert.equal(list.sounds[0].volume, .23);
assert.equal(custom._source.playlist, "custom");
assert.equal(custom._source.background.src, "worlds/custom/picture.webp");
assert.equal(custom.flags["mr-direccion"].config.music.src, "worlds/custom/track.mp3");
assert.equal(settings.get("mr-direccion.global").motifs[1].music.src, "worlds/custom/track.mp3");
for (const s of scenes.slice(0, 20)) {
  assert.equal(s._source.playlistSound, null);
  const sound = list.sounds.find(a => a.id === s.flags[ID].musica.playlistSound);
  assert.equal(sound.getFlag(ID, "clave"), MUSICA_LUGAR[s.flags[ID].escena]);
  for (const tema of TEMAS_PERSONAJE) assert(s.flags["mr-direccion"].config.motifs.includes(tema.id));
  assert.equal(s.flags["mr-direccion"].config.reading.uuid, "JournalEntry.1234567890123456");
}
assert(scenes[1]._source.background.src.includes("sirena-limpia.webp"));
const count = writes;
await mod.actualizarContenido();
assert.equal(writes, count, "Recarga idempotente");
game.modules.clear();
await mod.actualizarContenido();
for (const s of scenes.slice(0, 20)) assert.equal(s._source.playlistSound, s.flags[ID].musica.playlistSound);
globalThis.canvas = { ready: true, scene: scenes[1], dimensions: { sceneRect: { x: 0, y: 0, width: 1920, height: 1080 } } };
await mod.colocarAtaud(); await mod.colocarAtaud();
assert.equal(tokenCount, 2, "El GM puede colocar varias copias");
game.user.isGM = false;
await mod.colocarAtaud(); assert.equal(tokenCount, 2);
game.users.activeGM.isSelf = false;
const noWrites = writes;
await mod.actualizarContenido(); assert.equal(writes, noWrites);

const pack = JSON.parse(await fs.readFile(new URL("../content/direccion-es.json", import.meta.url), "utf8"));
assert.equal(pack.settings.motifs.length, 22);
for (const t of TEMAS_PERSONAJE) assert(pack.settings.motifs.some(m => m.id === t.id && m.music.src.includes("personajes/")));
assert.equal(new Set(pack.scenes.map(s => s.music.src)).size, 20);
for (const a of Object.values(AUDIO)) await fs.access(new URL(`../${a.ruta}`, import.meta.url));
console.log("OK: 36 pistas, seis motivos, 20 escenas, migración sin duplicados, listas externas, fondo limpio, atrezo sin despliegue automático y permisos.");
