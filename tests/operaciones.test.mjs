/** Simula las operaciones del GM sobre una tarjeta de tirada (gastar éxitos, bonos, flashback, cerrar turno) con un Foundry de pega. */
import test from "node:test";
import assert from "node:assert/strict";

const clase = class { static DEFAULT_OPTIONS = {}; };
const get = (o, r) => r.split(".").reduce((x, k) => x?.[k], o);
const set = (o, r, v) => { const ks = r.split("."), u = ks.pop(); ks.reduce((x, k) => (x[k] ??= {}), o)[u] = v; return o; };
const ajustes = {};
globalThis.foundry = {
  applications: { api: { ApplicationV2: clase, HandlebarsApplicationMixin: B => B, DialogV2: clase }, sheets: { ActorSheetV2: clase }, apps: { DocumentSheetConfig: clase },
    handlebars: { renderTemplate() {}, loadTemplates() {} }, ux: { TextEditor: { implementation: {} } }, instances: new Map() },
  utils: { escapeHTML: String, deepClone: structuredClone, randomID: () => Math.random().toString(36).slice(2, 10), setProperty: set, getProperty: get,
    mergeObject: (a, b) => ({ ...a, ...b }) }
};
globalThis.Hooks = { on() {}, once() {}, callAll() {} };
globalThis.CONFIG = { Dice: { randomUniform: () => 0.5 }, sounds: {} };
const mensajes = new Map();
const actor = {
  id: "a1", name: "Iryna", isOwner: true, testUserPermission: () => true,
  system: { sangre: 2, flashback: false, muerto: false, derribado: false, lesiones: [[{ nombre: "A", marcada: false }, { nombre: "B", marcada: false }], [{ nombre: "C", marcada: false }, { nombre: "D", marcada: false }], [{ nombre: "E", marcada: false }, { nombre: "F", marcada: false }]] },
  toObject() { return { system: structuredClone(this.system) }; },
  async update(c) { for (const [k, v] of Object.entries(c)) set({ system: this.system }, k, v); }
};
let d6 = 3;
globalThis.Roll = class { constructor(f) { this.n = Number(f.split("d")[0]); } async evaluate() { this.total = d6; this.dice = [{ results: Array.from({ length: this.n }, () => ({ result: d6 })) }]; return this; } };
globalThis.game = {
  actors: { get: () => actor, filter: () => [actor] }, users: { activeGM: { isSelf: true }, get: () => ({ isGM: true }) }, user: { isGM: true, id: "u" },
  messages: { get: id => mensajes.get(id) }, dice3d: null, socket: { emit() {}, on() {} },
  settings: { get: (_, k) => (k === "derribo" ? 3 : ajustes[k]), set: async (_, k, v) => { ajustes[k] = structuredClone(v); } }
};
const { ID, MISION_INICIAL, mision, pedir } = await import("../module/mesa.mjs");
ajustes.mision = structuredClone(MISION_INICIAL);
const { escucharTiradas } = await import("../module/tirada.mjs");
escucharTiradas();

const crear = (t, id = "m1") => {
  const m = { id, flags: { [ID]: { tirada: structuredClone(t) } }, getFlag: (_, k) => m.flags[ID][k], async update(c) { m.flags[ID].tirada = structuredClone(c[`flags.${ID}.tirada`]); } };
  mensajes.set(id, m); return m;
};
const tirada = (extra = {}) => ({
  actor: "a1", ultimo: false, atributo: "Disparo", umbral: 4, usados: [], bonos: [{ nombre: "Rifle", n: 1, req: "alto", hecho: false }], especiales: [{ nombre: "Tiro", texto: "x" }],
  dados: [6, 5, 4, 2, 1].map(c => ({ c, origen: "", destino: null })), defensa: 0, absorbido: {}, notas: [], flashback: null, cerrada: false, resultado: null, sinBonos: false, sinBeber: false,
  gm: { caras: [6, 4, 4], exitos: 3, amenaza: "x1", nombre: "Escuadrón", garras: false, otras: 0 }, ...extra
});
const amenaza = (o = {}) => ({ id: "x1", nombre: "Escuadrón", valor: 6, max: 6, ataque: 3, inicial: 3, desafio: 1, revive: true, crece: true, ...o });
const op = async (nombre, datos) => { await pedir(nombre, datos); await new Promise(r => setTimeout(r, 5)); };

test("gastar éxitos: el Desafío absorbe, la defensa descuenta y el objetivo baja", async () => {
  ajustes.mision = { ...structuredClone(MISION_INICIAL), amenazas: [amenaza()], objetivos: [{ id: "o1", nombre: "Salir", valor: 6, max: 6, desafio: 0 }] };
  const m = crear(tirada());
  await op("asignar", { mensaje: "m1", i: 0, tipo: "amenaza", id: "x1" });       // 6 = 2 éxitos; el desafío 1 absorbe 1
  assert.equal(mision().amenazas[0].valor, 5);
  await op("asignar", { mensaje: "m1", i: 1, tipo: "defensa" });
  await op("asignar", { mensaje: "m1", i: 2, tipo: "objetivo", id: "o1" });
  assert.equal(m.flags[ID].tirada.defensa, 1);
  assert.equal(mision().objetivos[0].valor, 5);
  await op("asignar", { mensaje: "m1", i: 3, tipo: "objetivo", id: "o1" });       // un 2 no cuenta
  assert.equal(mision().objetivos[0].valor, 5);
  await op("asignar", { mensaje: "m1", i: 0, tipo: "objetivo", id: "o1" });       // ese dado ya está gastado
  assert.equal(mision().objetivos[0].valor, 5);
});

test("amenaza a 0: ataque a 0; ESPECIAL solo con un 6; la sangre sube", async () => {
  ajustes.mision = { ...structuredClone(MISION_INICIAL), amenazas: [amenaza({ valor: 1, desafio: 0 })], objetivos: [] };
  const m = crear(tirada());
  await op("asignar", { mensaje: "m1", i: 1, tipo: "amenaza", id: "x1" });
  assert.deepEqual([mision().amenazas[0].valor, mision().amenazas[0].ataque], [0, 0]);
  await op("asignar", { mensaje: "m1", i: 2, tipo: "especial", nombre: "Tiro" });  // un 4 no es crítico
  assert.equal(m.flags[ID].tirada.dados[2].destino, null);
  await op("asignar", { mensaje: "m1", i: 0, tipo: "especial", nombre: "Tiro" });
  assert.match(m.flags[ID].tirada.dados[0].destino.texto, /ESPECIAL/);
  await op("asignar", { mensaje: "m1", i: 2, tipo: "sangre" });
  assert.equal(actor.system.sangre, 3);
});

test("bono: tira sus dados una sola vez", async () => {
  const m = crear(tirada());
  await op("bono", { mensaje: "m1", k: 0 });
  assert.equal(m.flags[ID].tirada.dados.length, 6);
  await op("bono", { mensaje: "m1", k: 0 });
  assert.equal(m.flags[ID].tirada.dados.length, 6);
});

test("flashback: solo con 2 éxitos o menos y una vez por sesión", async () => {
  actor.system.flashback = false;
  let m = crear(tirada());
  await op("flashback", { mensaje: "m1" });
  assert.equal(m.flags[ID].tirada.flashback, null, "con éxitos de sobra no se puede");
  m = crear(tirada({ dados: [2, 1, 3].map(c => ({ c, origen: "", destino: null })) }));
  await op("flashback", { mensaje: "m1" });
  assert.ok(m.flags[ID].tirada.flashback);
  assert.equal(m.flags[ID].tirada.dados.length, 5);
  assert.equal(actor.system.flashback, true);
});

test("cerrar: 3 ataques sin defender derriban, marcan la columna y crean el rescate", async () => {
  actor.system.flashback = false; d6 = 3;
  ajustes.mision = { ...structuredClone(MISION_INICIAL), amenazas: [amenaza()], objetivos: [] };
  const m = crear(tirada());
  await op("cerrar", { mensaje: "m1" });
  const t = m.flags[ID].tirada;
  assert.ok(t.cerrada);
  assert.equal(t.resultado.quedan, 3);
  assert.equal(t.resultado.lesion.derribado, true);
  assert.ok(actor.system.lesiones[1].every(l => l.marcada));
  assert.equal(actor.system.derribado, true);
  assert.ok(mision().objetivos.some(o => o.rescate === "a1"));
  assert.deepEqual(mision().actuaron, ["a1"]);
  await op("cerrar", { mensaje: "m1" });                                            // ya cerrada: no repite
  assert.equal(mision().objetivos.filter(o => o.rescate).length, 1);
});

test("cerrar: cero éxitos del GM sube su Ataque; defendido del todo no hiere", async () => {
  actor.system.derribado = false; actor.system.lesiones.forEach(c => c.forEach(l => (l.marcada = false)));
  ajustes.mision = { ...structuredClone(MISION_INICIAL), amenazas: [amenaza()], objetivos: [] };
  crear(tirada({ gm: { caras: [1, 2, 3], exitos: 0, amenaza: "x1", nombre: "Escuadrón", garras: false, otras: 0 } }));
  await op("cerrar", { mensaje: "m1" });
  assert.equal(mision().amenazas[0].ataque, 4);
  assert.ok(actor.system.lesiones.flat().every(l => !l.marcada));
  ajustes.mision = { ...structuredClone(MISION_INICIAL), amenazas: [amenaza()], objetivos: [] };
  crear(tirada({ defensa: 3 }));
  await op("cerrar", { mensaje: "m1" });
  assert.ok(actor.system.lesiones.flat().every(l => !l.marcada));
});
