import test from "node:test";
import assert from "node:assert/strict";
import { escalaDeVentana, MINIMA } from "../module/ventanas-core.mjs";

const pantalla = (ancho, alto) => ({ ancho, alto });

test("si la ventana cabe, no se toca", () => {
  assert.equal(escalaDeVentana(500, 700, pantalla(1920, 1080)), 1);
});

test("el diálogo de tirada (500×900) en un portátil de 15″ se encoge lo justo para verse entero", () => {
  const s = escalaDeVentana(500, 900, pantalla(1280, 650));
  assert(s < 0.75 && s > 0.6, `escala ${s}`);
  assert(900 * s <= 650 - 8 + 0.01, "no cabe en alto");
});

test("manda la dimensión más ajustada, a lo ancho o a lo alto", () => {
  assert.equal(escalaDeVentana(1600, 400, pantalla(800, 1000)), MINIMA);
  assert(escalaDeVentana(820, 860, pantalla(1366, 650)) < 0.8);
});

test("nunca baja del mínimo legible: lo que no quepa se desplaza por dentro", () => {
  assert.equal(escalaDeVentana(500, 3000, pantalla(1280, 650)), MINIMA);
});

test("la escala elegida en Ajustes manda sobre la automática, entre el 50 % y el 150 %", () => {
  assert.equal(escalaDeVentana(500, 900, pantalla(1280, 650), 100), 1);
  assert.equal(escalaDeVentana(500, 900, pantalla(1280, 650), 75), 0.75);
  assert.equal(escalaDeVentana(500, 900, pantalla(1280, 650), 20), 0.5);
  assert.equal(escalaDeVentana(500, 900, pantalla(1280, 650), 400), 1.5);
});

test("tamaños no válidos no rompen nada", () => {
  assert.equal(escalaDeVentana(0, 0, pantalla(1280, 650)), 1);
  assert.equal(escalaDeVentana(NaN, 500, pantalla(1280, 650)), 1);
});
