/** Instalación del contenido: en un mundo vacío, el GM activo importa la misión la primera vez; después, desde Configuración. */
import { ID } from "./mesa.mjs";
import { DialogV2 } from "./compat.mjs";

const PACK = `${ID}.aventura`;

function mundoVacio() {
  const sin = ["actors", "items", "journal", "playlists", "macros", "tables", "cards"].every(c => !game[c]?.size);
  return sin && game.scenes.contents.every(s => (!s.background?.src || s.background.src.startsWith("nue/")) && !s.tokens.size);
}

export async function importarAventura({ confirmar = false } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Solo quien dirige importa la misión.");
  const pack = game.packs.get(PACK);
  if (!pack?.index.size) return ui.notifications.error("No encuentro el compendio de la misión. Compílalo con «npm run build» con Foundry cerrado.");
  if (confirmar && !mundoVacio()) {
    const ok = await DialogV2.confirm({
      window: { title: "Importar la misión", icon: "fa-solid fa-file-import" },
      content: "<p>Este mundo ya tiene contenido. Al importar se <b>sobrescriben</b> los vampiros, amenazas, diarios y el mapa de Eat the Reich que hayas cambiado a mano.</p>",
      yes: { label: "Importar", icon: "fa-solid fa-file-import" }, no: { label: "Cancelar" }, rejectClose: false
    });
    if (!ok) return;
  }
  ui.notifications.info("Eat the Reich: importando vampiros, amenazas, diarios y el mapa de París…");
  await (await pack.getDocuments())[0].import({ dialog: false });
  await game.settings.set(ID, "importada", true);
  await game.scenes.find(s => s.getFlag(ID, "escena") === "paris")?.activate();
  return true;
}

async function bienvenida() {
  if (!game.user.isGM || game.settings.get(ID, "bienvenida") === game.system.version) return;
  await game.settings.set(ID, "bienvenida", game.system.version);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Comandante Slate" }), whisper: [game.user.id],
    content: `<div class="er-tc er-parte"><header class="er-tc-cab"><div><strong>MR- Eat the Reich ${game.system.version}</strong><span>París, 1943</span></div></header>
      <p>Reparte los seis vampiros (clic derecho → Configurar propiedad). Abre el <b>Panel de misión</b> (botón en el directorio de Actores o en los controles de escena), carga una localización del Sector 3 y que alguien pulse un atributo de su hoja.</p>
      <p>Cada éxito de la tarjeta se gasta pulsando su dado: Objetivo, Amenaza, Defensa, Sangre o un ESPECIAL con los seises. Al terminar el turno, los ataques sin defender marcan la lesión solos.</p>
      <p><b>El mapa:</b> doble clic en una calavera te lleva al decorado de esa localización (Mayús + doble clic abre su diario, con la página del manual). Cada escena trae su pieza de música clásica.</p>
      <p class="er-tc-nota">Líneas, velos y Tarjeta X: icono del escudo en los controles de escena.</p></div>`
  });
}

export function registrarInicio() {
  Hooks.on("renderSettings", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html[0];
    const sitio = raiz?.querySelector("section.settings");
    if (!sitio || raiz.querySelector(".er-ajustes") || !game.user.isGM) return;
    const sec = document.createElement("section");
    sec.className = "er-ajustes flexcol";
    sec.innerHTML = `<h4 class="divider">Eat the Reich</h4>
      <button type="button" data-er="mision"><i class="fa-solid fa-crosshairs" inert></i> Panel de misión</button>
      <button type="button" data-er="importar"><i class="fa-solid fa-file-import" inert></i> Importar la misión</button>`;
    sec.addEventListener("click", ev => {
      const a = ev.target.closest("button[data-er]")?.dataset.er;
      if (a === "mision") game.mrEatTheReich.abrirMision();
      if (a === "importar") importarAventura({ confirmar: true });
    });
    sitio.after(sec);
  });
  Hooks.once("ready", async () => {
    if (game.users.activeGM?.isSelf && !game.settings.get(ID, "importada") && mundoVacio()) {
      try { await importarAventura(); }
      catch (e) { console.error(`${ID} | la importación automática ha fallado`, e); ui.notifications.error("La importación automática ha fallado. Puedes hacerla desde Configuración → Eat the Reich."); }
    }
    await bienvenida();
  });
}
