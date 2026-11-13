/** Reparación idempotente: devuelve un catálogo completo sin pisar recursos externos del director. */
export function repararCatalogo(actual = [], esperado = [], campo = "music") {
  const base = new Map(esperado.map(x => [x.id, x]));
  const vistos = new Set();
  const items = actual.filter(x => x?.id && !vistos.has(x.id) && vistos.add(x.id)).map(x => {
    const d = base.get(x.id), ref = x[campo];
    if (!d) return x;
    const propia = ref?.src?.startsWith("systems/mr-eat-the-reich/assets/audio/");
    const valida = ref && (ref.src || ref.uuid || ref.name || ref.flag || ref.sceneFlag);
    if (valida && !propia) return x; // uuid, lista externa o archivo del mundo elegido a mano.
    return { ...x, ...d };
  });
  for (const d of esperado) if (!vistos.has(d.id)) items.push(d);
  return items;
}
