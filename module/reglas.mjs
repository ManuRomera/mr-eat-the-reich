/** Reglas puras del Havoc Engine (sin Foundry): se prueban con `npm test`. */
export const SANGRE_MAX = 10;
export const COSTE_CURAR = 3;
/** Ataques sin defender a partir de los cuales el vampiro cae derribado. */
export const DERRIBO = 3;
export const DADOS_ULTIMO_GESTO = 8;

/** Éxitos de un dado de jugador: 4-5 uno, 6 dos (crítico). `umbral` sube a 5 contra Rust-Witch. */
export const exitosDado = (cara, umbral = 4) => (cara >= 6 ? 2 : cara >= umbral ? 1 : 0);
export const totalExitos = (caras, umbral = 4) => caras.reduce((s, c) => s + exitosDado(c, umbral), 0);

/** Éxitos del GM: 4+ uno; el 6 no vale doble salvo Anatema. */
export const exitosGM = (caras, { anatema = false } = {}) => caras.reduce((s, c) => s + (c >= 6 && anatema ? 2 : c >= 4 ? 1 : 0), 0);

export const activas = amenazas => amenazas.filter(a => a.valor > 0 && a.ataque > 0);

/** Dados de ataque del GM: el Ataque de la amenaza enfrentada (o la mayor) + 1 por cada otra amenaza en juego. */
export function reservaAtaque(amenazas, idEnfrentada = null) {
  const vivas = activas(amenazas);
  if (!vivas.length) return { dados: 0, amenaza: null };
  const amenaza = vivas.find(a => a.id === idEnfrentada) ?? vivas.reduce((m, a) => (a.ataque > m.ataque ? a : m));
  return { dados: amenaza.ataque + vivas.length - 1, amenaza };
}

/** Aplica éxitos a un Objetivo o Amenaza: el Desafío absorbe los primeros de cada acción. */
export function aplicarExitos({ valor, desafio = 0 }, exitos, absorbido = 0) {
  const absorbe = Math.min(exitos, Math.max(0, desafio - absorbido));
  return { valor: Math.max(0, valor - (exitos - absorbe)), absorbido: absorbido + absorbe, absorbe };
}

/** Fin de ronda. `d6` es una función que devuelve 1-6. Devuelve la lista nueva y un parte legible. */
export function refuerzos(amenazas, d6) {
  const parte = [];
  const lista = [];
  for (const a of amenazas) {
    if (a.valor <= 0) {
      if (!a.revive) { parte.push(`${a.nombre}: fuera de juego.`); continue; }
      const valor = d6(), ataque = Math.ceil(a.inicial / 2);
      lista.push({ ...a, valor, ataque });
      parte.push(`${a.nombre}: llegan refuerzos (Amenaza ${valor}, Ataque ${ataque}).`);
    } else if (a.crece) {
      const valor = a.valor + (a.refuerzoValor || 0);
      lista.push({ ...a, valor, ataque: a.ataque + 1 });
      parte.push(`${a.nombre}: se acercan (Ataque ${a.ataque + 1}${a.refuerzoValor ? `, Amenaza ${valor}` : ""}).`);
    } else lista.push({ ...a });
  }
  return { amenazas: lista, parte };
}

/**
 * Marca una lesión. `lesiones` = 3 columnas (1-2, 3-4, 5-6) de 2 casillas {marcada}.
 * Si la columna está llena se pasa a la siguiente con hueco. `todas` marca todas las libres de la columna.
 */
export function marcarLesion(lesiones, d6, todas = false) {
  const copia = lesiones.map(c => c.map(l => ({ ...l })));
  let col = Math.ceil(d6 / 2) - 1;
  if (copia[col].every(l => l.marcada)) col = [1, 2].map(k => (col + k) % 3).find(c => copia[c].some(l => !l.marcada)) ?? -1;
  if (col < 0) return { lesiones: copia, columna: -1, marcadas: [], muerto: true };
  const marcadas = [];
  for (const l of copia[col]) {
    if (l.marcada) continue;
    l.marcada = true;
    marcadas.push(l.nombre);
    if (!todas) break;
  }
  return { lesiones: copia, columna: col, marcadas, muerto: copia.every(c => c.every(l => l.marcada)) };
}

/** Atributos con los modificadores de las lesiones marcadas (nunca por debajo de 0). */
export function atributosEfectivos(base, lesiones) {
  const out = { ...base };
  for (const l of lesiones.flat()) {
    if (!l.marcada) continue;
    for (const [k, n] of Object.entries(l.mod ?? {})) if (k in out) out[k] += n;
  }
  for (const k of Object.keys(out)) out[k] = Math.max(0, out[k]);
  return out;
}

export const bloqueos = lesiones => new Set(lesiones.flat().filter(l => l.marcada && l.bloqueo).map(l => l.bloqueo));

/** Dados que aporta usar un objeto: 1, más 1 si es su último uso y empezó con más de uno. */
export const dadosObjeto = ({ usos, max }) => (usos <= 0 ? 0 : 1 + (usos === 1 && max > 1 ? 1 : 0));
