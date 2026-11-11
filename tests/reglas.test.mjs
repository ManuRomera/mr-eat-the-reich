import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../module/reglas.mjs";
import { VAMPIROS, AMENAZAS, LOCALIZACIONES, ATRIBUTOS } from "../module/datos.mjs";

test("ejemplo del manual: Iryna 6,5,4,2,2,1 contra 6,4,1", () => {
  assert.equal(R.totalExitos([6, 5, 4, 2, 2, 1]), 4);
  assert.equal(R.exitosGM([6, 4, 1]), 2);
  assert.equal(R.exitosGM([6, 4, 1], { anatema: true }), 3);
  assert.equal(R.totalExitos([6, 5, 4], 5), 3, "contra Rust-Witch el 4 no cuenta");
});

test("ataque del GM: la mayor + 1 por cada amenaza adicional; las de 0 no cuentan", () => {
  const a = [{ id: "i", valor: 6, ataque: 3 }, { id: "p", valor: 4, ataque: 2 }];
  assert.equal(R.reservaAtaque(a).dados, 4);
  assert.equal(R.reservaAtaque(a, "p").dados, 3);
  assert.equal(R.reservaAtaque([{ ...a[0], valor: 0, ataque: 0 }, a[1]]).dados, 2);
  assert.equal(R.reservaAtaque([]).dados, 0);
});

test("el Desafío absorbe los primeros éxitos de la acción", () => {
  const r = R.aplicarExitos({ valor: 6, desafio: 1 }, 2);
  assert.deepEqual([r.valor, r.absorbido], [5, 1]);
  assert.equal(R.aplicarExitos({ valor: 5, desafio: 1 }, 1, r.absorbido).valor, 4);
});

test("refuerzos: revive a la mitad, crece, y los «solo» se retiran", () => {
  const { amenazas } = R.refuerzos([
    { nombre: "Infantería", valor: 0, ataque: 0, inicial: 3, revive: true, crece: true },
    { nombre: "Policía", valor: 4, ataque: 2, inicial: 2, revive: true, crece: true },
    { nombre: "Tanque", valor: 0, ataque: 0, inicial: 6, revive: false, crece: false },
    { nombre: "Paracas", valor: 6, ataque: 3, inicial: 3, revive: true, crece: true, refuerzoValor: 2 }
  ], () => 5);
  assert.deepEqual(amenazas.map(a => [a.nombre, a.valor, a.ataque]), [["Infantería", 5, 2], ["Policía", 4, 3], ["Paracas", 8, 4]]);
});

test("lesiones: primera casilla, luego segunda, luego otra columna; seis = muerte", () => {
  let l = VAMPIROS[0].lesiones;
  let r = R.marcarLesion(l, 1); assert.deepEqual(r.marcadas, ["Traje rasgado"]);
  r = R.marcarLesion(r.lesiones, 2); assert.deepEqual(r.marcadas, ["Punción abdominal"]);
  assert.ok(R.bloqueos(r.lesiones).has("bonos"));
  r = R.marcarLesion(r.lesiones, 1); assert.equal(r.columna, 1);
  r = R.marcarLesion(r.lesiones, 4, true); assert.equal(r.marcadas.length, 1);
  assert.equal(R.atributosEfectivos(VAMPIROS[0].atributos, r.lesiones).combate, 4);
  r = R.marcarLesion(r.lesiones, 6, true); assert.ok(r.muerto);
});

test("el último uso de un objeto de varios usos da un dado más", () => {
  assert.equal(R.dadosObjeto({ usos: 3, max: 4 }), 1);
  assert.equal(R.dadosObjeto({ usos: 1, max: 4 }), 2);
  assert.equal(R.dadosObjeto({ usos: 1, max: 1 }), 1);
  assert.equal(R.dadosObjeto({ usos: 0, max: 4 }), 0);
});

test("datos coherentes", () => {
  assert.equal(VAMPIROS.length, 6);
  for (const v of VAMPIROS) {
    assert.deepEqual(Object.keys(v.atributos), Object.keys(ATRIBUTOS), v.nombre);
    assert.equal(v.lesiones.length, 3);
  }
  const claves = new Set(AMENAZAS.map(a => a.clave));
  for (const l of LOCALIZACIONES) for (const e of l.enemigos) assert.ok(claves.has(e.clave), `${l.nombre}: ${e.clave}`);
});
