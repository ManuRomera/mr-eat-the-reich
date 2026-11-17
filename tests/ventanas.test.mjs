import test from "node:test";
import assert from "node:assert/strict";
import { escalaDeVentana, MINIMA, REFERENCIA } from "../module/ventanas-core.mjs";

// `alto` es el espacio útil (sin la reserva de la barra de macros, 1,5 × 52 px); `total`, el alto completo de la pantalla.
const pantalla = (ancho, total) => ({ ancho, alto: total - 78, total });

test("si la ventana cabe, no se toca", () => {
  assert.equal(escalaDeVentana(500, 700, pantalla(1920, 1080)), 1);
});

test("el diálogo de tirada (500×900) en un portátil de 15″ se encoge para verse entero y con aire", () => {
  const s = escalaDeVentana(500, 900, pantalla(1280, 650));
  assert(s < 0.7 && s >= 0.5, `escala ${s}`);
  assert(900 * s <= (650 - 78) * 0.92, "no deja aire");
});

test("la hoja-ataúd (1090×920) deja de ocupar toda la pantalla en un portátil de 15″", () => {
  for (const [ancho, total] of [[1440, 780], [1440, 790], [1366, 657], [1512, 860]]) {
    const s = escalaDeVentana(1090, 920, pantalla(ancho, total));
    assert(920 * s <= total * 0.9, `${ancho}×${total}: ${(920 * s).toFixed(0)} px de alto`);
    assert(1090 * s <= ancho * 0.8, `${ancho}×${total}: ${(1090 * s).toFixed(0)} px de ancho`);
  }
});

test("todo se escala en proporción a la pantalla: lo pequeño también se encoge", () => {
  assert(escalaDeVentana(300, 200, pantalla(1366, 657)) < 0.75);
  assert.equal(escalaDeVentana(300, 200, pantalla(REFERENCIA.ancho, REFERENCIA.alto)), 1);
});

test("en pantallas de 1080p o mayores nada se encoge de más", () => {
  assert.equal(escalaDeVentana(500, 700, pantalla(2560, 1300)), 1);
  assert(escalaDeVentana(1090, 920, pantalla(1920, 950)) > 0.9);
});

test("manda la dimensión más ajustada, a lo ancho o a lo alto", () => {
  assert.equal(escalaDeVentana(1600, 400, pantalla(800, 1000)), MINIMA);
  assert(escalaDeVentana(820, 860, pantalla(1366, 650)) < 0.65);
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
