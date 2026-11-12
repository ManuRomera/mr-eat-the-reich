/** Diagnóstico legible y copiable (Configuración → Ajustes → Diagnóstico). */
import { ID, ARTE, mision, vampiros } from "../mesa.mjs";
import { ApplicationV2, diagnostico } from "../compat.mjs";
import { ConMemoria } from "../memoria.mjs";

const existe = async src => { try { return (await fetch(src, { method: "HEAD", cache: "no-store" })).ok; } catch { return false; } };
const IMAGENES = ["libro/portada.webp", "libro/mapa.webp", "libro/iryna.webp", "libro/flint.webp", "retratos/iryna.webp", "retratos/werhund.webp", "libro/pag-50.webp", "escenas/sirena.webp", "amenazas/patrulla.webp", "audio/musica/accion.ogg", "audio/sfx/sello.ogg"];

export async function informe() {
  const faltan = (await Promise.all(IMAGENES.map(async r => [r, await existe(`${ARTE}/${r}`)]))).filter(([, ok]) => !ok).map(([r]) => r);
  const pack = game.packs.get(`${ID}.aventura`);
  const m = mision();
  const comprobaciones = [
    { ok: Boolean(pack?.index.size), texto: `Compendio de la misión: ${pack?.index.size ?? 0} aventura(s)` },
    { ok: !faltan.length, texto: faltan.length ? `Faltan archivos (los de libro/ y retratos/ se sacan de tu PDF con «npm run arte»): ${faltan.join(", ")}` : "Imágenes, escenas y audio en su sitio" },
    { ok: vampiros().length > 0, texto: `Vampiros en el mundo: ${vampiros().length}`, aviso: true },
    { ok: game.actors.some(a => a.type === "amenaza"), texto: `Amenazas en el mundo: ${game.actors.filter(a => a.type === "amenaza").length}`, aviso: true },
    { ok: game.scenes.filter(s => s.getFlag(ID, "escena")).length >= 20, texto: `Escenas de la misión en el mundo: ${game.scenes.filter(s => s.getFlag(ID, "escena")).length}/20`, aviso: true },
    { ok: Boolean(game.modules.get("mr-direccion")?.active), texto: game.modules.get("mr-direccion")?.active ? "MR- Dirección activo: la misión está en su barra" : "MR- Dirección no está activo (opcional)", aviso: true },
    { ok: Boolean(game.users.activeGM), texto: game.users.activeGM ? "Hay un GM conectado" : "No hay GM conectado: no se pueden gastar éxitos ni mover la misión", aviso: true }
  ];
  const datos = { ...diagnostico(), mundo: game.world.id, usuario: { gm: game.user.isGM }, mision: m, dado3d: Boolean(game.dice3d),
    ajustes: Object.fromEntries(["derribo", "importada", "lupa"].map(k => [k, game.settings.get(ID, k)])) };
  return { comprobaciones, datos };
}

export class PanelDiagnostico extends ConMemoria(ApplicationV2) {
  static MEMORIA = "diagnostico";
  static DEFAULT_OPTIONS = { id: "er-diagnostico", classes: ["mr-eat-the-reich", "er-dialogo"], position: { width: 560, height: "auto" }, window: { title: "Diagnóstico", icon: "fa-solid fa-stethoscope" } };
  #json = "";
  static abrir() { return (foundry.applications.instances.get("er-diagnostico") ?? new PanelDiagnostico()).render({ force: true }); }

  async _renderHTML() {
    const { comprobaciones, datos } = await informe();
    this.#json = JSON.stringify(datos, null, 2);
    const bien = comprobaciones.every(c => c.ok || c.aviso);
    const filas = comprobaciones.map(c => `<li class="${c.ok ? "ok" : c.aviso ? "aviso" : "mal"}"><i class="fa-solid ${c.ok ? "fa-circle-check" : c.aviso ? "fa-circle-info" : "fa-triangle-exclamation"}"></i> ${foundry.utils.escapeHTML(c.texto)}</li>`).join("");
    return `<div class="er-dialogo-cuerpo"><p class="er-diag-resumen ${bien ? "ok" : "mal"}">${bien ? "Todo en orden." : "Hay cosas que revisar."}</p>
      <ul class="er-diag-lista">${filas}</ul>
      <label class="er-campo"><span>Para copiar cuando haya que contar un fallo</span><textarea readonly rows="8">${foundry.utils.escapeHTML(this.#json)}</textarea></label>
      <div class="er-fila-botones"><button type="button" class="er-boton er-boton-suave" data-diag="actualizar"><i class="fa-solid fa-rotate"></i> Actualizar</button>
      <button type="button" class="er-boton" data-diag="copiar"><i class="fa-solid fa-copy"></i> Copiar</button></div></div>`;
  }

  _replaceHTML(html, el) {
    el.innerHTML = html;
    el.querySelector("[data-diag=actualizar]")?.addEventListener("click", () => this.render());
    el.querySelector("[data-diag=copiar]")?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(this.#json); ui.notifications.info("Diagnóstico copiado."); } catch { el.querySelector("textarea")?.select(); }
    });
  }
}
