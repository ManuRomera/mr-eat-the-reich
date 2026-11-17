/**
 * Ajuste del texto de la caja de la hoja-ataúd (sin Foundry: lo usa la hoja y se prueba en el arnés con todos los
 * vampiros, pestañas y tamaños de texto). La caja tiene forma de ataúd y el texto se ciñe a ella; si lo de una pestaña
 * no cabe, se encoge la letra poco a poco y, si aun así no cabe, la caja se desplaza por dentro: nada queda fuera sin poder verse.
 */
export const SUELO = 0.72;   // hasta aquí encoge la letra con el texto a tamaño normal o menor

/**
 * Encoge la letra del forro hasta que quepa. Con el texto agrandado en Accesibilidad (`escalaTexto` > 1) no baja del tamaño normal:
 * quien lo agranda quiere leerlo grande, así que lo que no quepa se desplaza en vez de volverse pequeño.
 * Devuelve `{ ajuste, desborda }`.
 */
export function ajustarForro(forro, escalaTexto = 1) {
  if (!forro) return { ajuste: 1, desborda: false };
  const suelo = escalaTexto > 1 ? Math.min(1, Math.max(0.55, 1 / escalaTexto)) : SUELO;
  const sobra = () => forro.scrollHeight > forro.clientHeight + 1;
  let f = 1;
  forro.style.setProperty("--er-ajuste", f);
  while (sobra() && f > suelo + 0.001) forro.style.setProperty("--er-ajuste", (f = Math.round((f - 0.03) * 100) / 100));
  const desborda = sobra();
  return desborda ? { ajuste: f, desborda, fuera: elementosFuera(forro) } : { ajuste: f, desborda };
}

/** Qué elementos quedan por debajo de la caja (para el informe del arnés). */
export function elementosFuera(forro) {
  const limite = forro.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(forro).paddingBottom) || 0);
  return [...forro.querySelectorAll(".tab.active *")]
    .filter(el => (!el.children.length || el.matches("button")) && el.getClientRects().length)
    .filter(el => el.getBoundingClientRect().bottom > limite + 1)
    .map(el => `${el.tagName.toLowerCase()}${el.classList.length ? "." + el.classList[0] : ""} «${el.textContent.trim().slice(0, 28)}»`);
}
