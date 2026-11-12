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

export function registrarDireccionMR() {
  game.settings.register(ID, "avisoDireccion", { scope: "world", config: false, type: Boolean, default: false });
  Hooks.on("mrDireccion.ready", a => registrar(a));
  Hooks.once("ready", async () => {
    if (!game.user.isGM) return;
    await registrar(api());
    if (!api() && !game.settings.get(ID, "avisoDireccion")) {
      await game.settings.set(ID, "avisoDireccion", true);
      ui.notifications.info(`Con el módulo MR- Dirección tendrás una barra para dirigir la misión (escenas, música con fundido, motivos y efectos). Manifiesto: ${MANIFIESTO}`, { permanent: true });
    }
  });
}
