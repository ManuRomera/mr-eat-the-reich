/**
 * MR- Dirección (módulo hermano, opcional): se le entrega el paquete de la misión —las 20 escenas con su lectura, su música,
 * los estados de ánimo (motivos), los efectos y el reparto de enemigos— para dirigir desde su barra con fundido cruzado.
 * Sin el módulo, el sistema funciona igual: la música va por la lista de reproducción y el Panel de misión.
 */
import { ID } from "./mesa.mjs";

export const MOD = "mr-direccion";
export const MANIFIESTO = "https://github.com/ManuRomera/mr-direccion/releases/latest/download/module.json";
export const api = () => { const m = game.modules.get(MOD); return m?.active ? m.api ?? null : null; };

let registrado = false;
async function registrar(a) {
  if (!a?.registerPack || registrado) return false;
  try {
    a.registerPack(await (await fetch(`systems/${ID}/content/direccion-es.json`)).json());
    return (registrado = true);
  } catch (e) { console.error(`${ID} | no se pudo registrar el paquete de MR- Dirección`, e); return false; }
}

/**
 * Quién pone la música: si MR- Dirección está activo, manda él (se desenlaza la pista nativa de cada escena y se para nuestra lista);
 * si no, las escenas recuperan su pista para que suene sola al activarlas.
 */
async function repartirMusica() {
  if (!game.users.activeGM?.isSelf) return;
  const manda = Boolean(api());
  for (const s of game.scenes) {
    if (!s.flags?.[ID]?.escena) continue;
    // Escenas importadas con una versión anterior no llevan el flag: se guarda su enlace actual antes de soltarlo.
    let m = s.flags[ID].musica;
    if (!m && s._source.playlistSound) { m = { playlist: s._source.playlist, playlistSound: s._source.playlistSound }; await s.setFlag(ID, "musica", m); }
    if (!m) continue;
    const quiere = manda ? { playlist: null, playlistSound: null } : m;
    if ((s._source.playlist ?? null) !== quiere.playlist || (s._source.playlistSound ?? null) !== quiere.playlistSound) await s.update(quiere);
  }
  if (manda) await game.playlists.find(p => p.flags?.[ID]?.clave === "musica")?.stopAll();
}

export function registrarDireccionMR() {
  game.settings.register(ID, "avisoDireccion", { scope: "world", config: false, type: Boolean, default: false });
  Hooks.on("mrDireccion.ready", a => registrar(a));
  Hooks.once("ready", async () => {
    if (!game.user.isGM) return;
    await registrar(api());
    await repartirMusica();
    if (!api() && !game.settings.get(ID, "avisoDireccion")) {
      await game.settings.set(ID, "avisoDireccion", true);
      ui.notifications.info(`Con el módulo MR- Dirección tendrás una barra para dirigir la misión (escenas, música con fundido, motivos y efectos). Manifiesto: ${MANIFIESTO}`, { permanent: true });
    }
  });
}
