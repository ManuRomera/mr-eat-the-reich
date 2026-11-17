/** Cálculo puro de la escala de una ventana (sin Foundry: se prueba en tests/ventanas.test.mjs). */
export const MARGEN = 8;       // píxeles que se dejan libres alrededor de la ventana
export const MINIMA = 0.55;    // por debajo de esto el texto deja de leerse: lo que no quepa se desplaza por dentro

/**
 * Escala con la que una ventana de `ancho` × `alto` píxeles cabe entera en la vista.
 * `manual` es el porcentaje elegido en Ajustes (0 = automático): si lo hay, manda tal cual (entre 50 % y 150 %).
 */
export function escalaDeVentana(ancho, alto, vista, manual = 0) {
  if (manual > 0) return Math.min(1.5, Math.max(0.5, manual / 100));
  if (!(ancho > 0) || !(alto > 0)) return 1;
  const s = Math.min(1, (vista.ancho - MARGEN) / ancho, (vista.alto - MARGEN) / alto);
  return Math.max(MINIMA, Math.floor(s * 100) / 100);
}
