/** Datos y decisiones puras de la presentación; se prueban sin Foundry. */
export const PERSONAJES = Object.freeze([
  { id: "iryna", nombre: "Iryna", titulo: "La aristócrata de la noche", color: "#e13e8b" },
  { id: "nicole", nombre: "Nicole", titulo: "La demolición tiene nombre", color: "#e85e4b" },
  { id: "cosgrave", nombre: "Cosgrave", titulo: "Las deudas sobreviven a la muerte", color: "#55b7a5" },
  { id: "chuck", nombre: "Chuck", titulo: "Un buen hombre. Un mal apetito.", color: "#e1b64b" },
  { id: "astrid", nombre: "Astrid", titulo: "La depredadora ancestral", color: "#bed879" },
  { id: "flint", nombre: "Flint", titulo: "Lo que acecha bajo el mundo", color: "#ba64bf" }
]);
export const TIEMPOS = Object.freeze({ entrada: 1500, apertura: 2800, cierre: 2600, fundido: 1100 });
export const ESTADO_INICIAL = Object.freeze({ fase: "sala", instante: 0, escena: "", anterior: "", personaje: "", activa: false, revision: 0 });
export function estadoSeguro(raw = {}) {
  raw ??= {};
  return { fase: ["sala", "entrada", "abriendo", "abierto", "cerrando", "salida"].includes(raw.fase) ? raw.fase : (raw.personaje ? "abierto" : "sala"),
    instante: Number.isFinite(raw.instante) ? raw.instante : 0, escena: typeof raw.escena === "string" ? raw.escena : "",
    anterior: typeof raw.anterior === "string" ? raw.anterior : "",
    personaje: PERSONAJES.some(p => p.id === raw.personaje) ? raw.personaje : "",
    activa: raw.activa === true, revision: Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0 };
}
export function siguienteEstado(raw, patch) {
  const previo = estadoSeguro(raw);
  return estadoSeguro({ ...previo, ...patch, revision: previo.revision + 1 });
}
export function reparto(actors, users, scope = "mr-eat-the-reich") {
  return PERSONAJES.map(p => {
    const jugadores = users.filter(u => !u.isGM);
    const asignado = (u, a) => u.character?.id === a.id || u.characterId === a.id;
    const candidatos = actors.filter(a => a.type === "vampiro" &&
      (a.flags?.[scope]?.clave === p.id || a.name?.toLocaleLowerCase() === p.nombre.toLocaleLowerCase()));
    const actor = candidatos.find(a => jugadores.some(u => asignado(u, a))) ??
      candidatos.find(a => jugadores.some(u => Number(a.ownership?.[u.id]) >= 3)) ?? candidatos[0];
    const directos = actor ? jugadores.filter(u => asignado(u, actor)) : [];
    const owners = directos.length ? directos : actor ? jugadores.filter(u => Number(actor.ownership?.[u.id]) >= 3) : [];
    return { ...p, actorId: actor?.id ?? "", jugador: owners.map(u => u.name).join(" / "),
      boton: owners.map(u => u.name).join(" / ") || p.nombre };
  });
}
export const claveSonido = estado => estadoSeguro(estado).personaje || "sala";
export function bloquearMusica(escenaActiva, playlist, cambios, scope = "mr-eat-the-reich") {
  if (!escenaActiva?.flags?.[scope]?.presentacion || cambios?.playing !== true) return false;
  if (["presentacion", "sfx"].includes(playlist?.flags?.[scope]?.clave) || playlist?.channel === "interface") return false;
  return true;
}
