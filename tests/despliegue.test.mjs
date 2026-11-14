import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// despliegue.mjs importa módulos que necesitan Foundry: la tabla se lee del fuente.
const src = fs.readFileSync(new URL("../module/despliegue.mjs", import.meta.url), "utf8");
const ATAUDES = eval(`(${src.match(/export const ATAUDES = (\{[\s\S]*?\n\});/)[1]})`);
const cuantos = eval(src.match(/export const cuantos = (.*);/)[1]);
test("cada punto del Sector 3 tiene decorado y posiciones para 3, 4 y 5 ataúdes", () => {
  assert.deepEqual(Object.keys(ATAUDES).sort(), ["almacenes", "catedral", "cementerio", "hotel", "mausoleo", "sirena"]);
  for (const [clave, v] of Object.entries(ATAUDES)) for (const n of [3, 4, 5]) {
    assert.equal(v[n].length, n, `${clave}-${n}`);
    assert(fs.existsSync(new URL(`../assets/escenas/despliegue/${clave}-${n}.webp`, import.meta.url)), `${clave}-${n}.webp`);
    for (const [x, y, alto] of v[n]) assert(x > 5 && x < 95 && y > 40 && y <= 100 && alto >= 8 && alto <= 55, `${clave}-${n}`);
  }
});
test("el número de ataúdes se ajusta a quienes juegan, entre 3 y 5", () => assert.deepEqual([0, 2, 3, 4, 5, 6].map(cuantos), [3, 3, 3, 4, 5, 5]));
