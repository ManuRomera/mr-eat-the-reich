/** MR- Eat the Reich · punto de entrada. Aquí solo se registran piezas y hooks; la lógica vive en `module/`. */
import { ApplicationV2, DocumentSheetConfig, anadirHerramienta, diagnostico } from "./module/compat.mjs";
import { ID, registrarAjustes, escucharSocket, mision, cambiarMision } from "./module/mesa.mjs";
import { MODELOS } from "./module/modelos.mjs";
import { HojaVampiro, HojaAtaud, HojaAmenaza } from "./module/hojas.mjs";
import { PanelMision, registrarMision, cargarLocalizacion, finDeRonda } from "./module/apps/mision.mjs";
import { escucharTiradas, dialogoTirada, tirar, ultimoGesto } from "./module/tirada.mjs";
import { registrarAccesibilidad, temaVentana } from "./module/accesibilidad.mjs";
import { pintarRetratos, repintarRetratos } from "./module/retrato.mjs";
import { PanelSeguridad, registrarSeguridad } from "./module/apps/seguridad.mjs";
import { PanelDiagnostico } from "./module/apps/diagnostico.mjs";
import { registrarLupa } from "./module/lupa.mjs";
import { registrarInicio, importarAventura } from "./module/inicio.mjs";
import { registrarEscenas, sonar, musica } from "./module/escenas.mjs";
import { registrarDireccionMR } from "./module/direccion-mr.mjs";

Hooks.once("init", () => {
  Object.assign(CONFIG.Actor.dataModels, MODELOS);
  CONFIG.Actor.typeLabels = { vampiro: "Vampiro", amenaza: "Amenaza" };
  DocumentSheetConfig.registerSheet(Actor, ID, HojaAtaud, { types: ["vampiro"], makeDefault: true, label: "Eat the Reich · Ataúd" });
  DocumentSheetConfig.registerSheet(Actor, ID, HojaVampiro, { types: ["vampiro"], makeDefault: false, label: "Eat the Reich · Ficha clásica (rectangular, con edición)" });
  DocumentSheetConfig.registerSheet(Actor, ID, HojaAmenaza, { types: ["amenaza"], makeDefault: true, label: "Eat the Reich · Amenaza" });

  registrarAjustes();
  registrarAccesibilidad();
  registrarLupa();
  registrarSeguridad();
  registrarMision();
  registrarInicio();
  registrarEscenas();
  registrarDireccionMR();
  game.settings.registerMenu(ID, "diagnosticoMenu", {
    name: "Diagnóstico", label: "Comprobar el sistema",
    hint: "Comprueba el compendio, las imágenes y el estado de la misión, y deja un informe copiable.",
    icon: "fa-solid fa-stethoscope",
    type: class extends ApplicationV2 { async render() { PanelDiagnostico.abrir(); return this; } }, restricted: false
  });

  game.mrEatTheReich = {
    abrirMision: () => PanelMision.abrir(), abrirSeguridad: () => PanelSeguridad.abrir(), abrirDiagnostico: () => PanelDiagnostico.abrir(),
    dialogoTirada, tirar, ultimoGesto, mision, cambiarMision, cargarLocalizacion, finDeRonda, importarAventura, diagnostico, sonar, musica
  };
});

Hooks.once("ready", () => {
  escucharSocket();
  escucharTiradas();
  PanelSeguridad.iniciar();
  console.info(`MR- Eat the Reich ${game.system.version} · Foundry ${game.version}`);
});

/** Los vampiros son personajes de jugador: token enlazado y amistoso. */
Hooks.on("preCreateActor", (actor, datos) => {
  if (actor.type === "vampiro") actor.updateSource({ prototypeToken: { actorLink: true, disposition: 1, ...(datos.prototypeToken ?? {}) } });
});

Hooks.on("updateActor", (actor, cambios) => {
  const f = cambios.flags?.[ID];
  if ("img" in cambios || (f && ("retrato" in f || "-=retrato" in f))) repintarRetratos();
});

Hooks.on("renderActorDirectory", (app, html) => {
  const raiz = html instanceof HTMLElement ? html : html[0];
  pintarRetratos(raiz);
  const acciones = raiz?.querySelector(".header-actions");
  if (!acciones || acciones.querySelector(".er-boton-panel")) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "er-boton-panel";
  b.innerHTML = `<i class="fa-solid fa-crosshairs" inert></i><span>Panel de misión</span>`;
  b.addEventListener("click", () => PanelMision.abrir());
  acciones.append(b);
});

/** Los diarios del sistema se visten de expediente. */
Hooks.on("renderJournalEntrySheet", app => {
  if (app.document.getFlag(ID, "clave") || app.document.pack?.startsWith(`${ID}.`)) app.element.classList.add(ID, "er-diario");
});

/** Las ventanas del sistema siguen el modo claro/oscuro elegido en Accesibilidad. */
Hooks.on("renderApplicationV2", app => { if (app.element?.classList.contains(ID)) temaVentana(app.element); });

Hooks.on("getSceneControlButtons", controles => {
  anadirHerramienta(controles, "tokens", { name: "erMision", title: "Panel de misión", icon: "fa-solid fa-crosshairs", onChange: () => PanelMision.abrir() });
  anadirHerramienta(controles, "tokens", { name: "erSeguridad", title: "Seguridad en la sesión", icon: "fa-solid fa-shield-heart", onChange: () => PanelSeguridad.abrir() });
});
