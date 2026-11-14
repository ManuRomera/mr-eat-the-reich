/**
 * module/datos.mjs → _data/aventura.json: un documento Adventure con los seis vampiros, las amenazas,
 * los diarios (reglas resumidas, localizaciones, seguridad), las tablas de flashback y el mapa de París con notas.
 * Los textos son resúmenes propios con remisión a la página del manual; no se copia el libro.
 */
import fs from "node:fs/promises";
import { EFECTOS_BARRA } from "../module/efectos-datos.mjs";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { VAMPIROS, AMENAZAS, LOCALIZACIONES, FLASHBACK, PREMIOS_SECUNDARIO, BOTIN_EJEMPLOS, ATRIBUTOS, AYUDA_ATRIBUTOS, PISTAS, MOTIVOS, MUSICA_LUGAR, EFECTOS } from "../module/datos.mjs";

import { AUDIO, TEMAS_PERSONAJE } from "../module/banda-sonora-datos.mjs";

const manifiesto = JSON.parse(await fs.readFile("system.json"));
const ID = manifiesto.id, R = `systems/${ID}/assets`;
const uid = t => createHash("sha1").update(t).digest("hex").slice(0, 16);
const STATS = { coreVersion: "13.351", systemId: ID, systemVersion: manifiesto.version, createdTime: 0, modifiedTime: 0, lastModifiedBy: null, compendiumSource: null, duplicateSource: null };
const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const carpeta = (nombre, tipo, color, orden) => ({ _id: uid(`carpeta-${tipo}-${nombre}`), name: nombre, type: tipo, color, sorting: "m", sort: orden, folder: null, description: "", flags: {} });
const folders = [carpeta("Vampiros de F.A.N.G.", "Actor", "#b3124b", 0), carpeta("Fuerzas de ocupación", "Actor", "#2c4a52", 1), carpeta("Übermenschen", "Actor", "#5a2a7a", 2), carpeta("Sector 3 · La caída", "Scene", "#1f6f78", 1), carpeta("Sector 2 · El asalto", "Scene", "#5a2a7a", 2), carpeta("Sector 1 · La torre", "Scene", "#b3124b", 3)];
const F = Object.fromEntries(folders.map(f => [f.name, f._id]));

/* ───────── Actores ───────── */
// Encuadre de la cara dentro de la lámina a página completa (centro como fracción y zoom).
const CARA = { iryna: [0.47, 0.27, 2.3], nicole: [0.38, 0.28, 2.3], cosgrave: [0.45, 0.24, 2.4], chuck: [0.37, 0.27, 2.3], astrid: [0.4, 0.24, 2.4], flint: [0.5, 0.6, 2.2], "rust-witch": [0.42, 0.24, 2.4], damonenblut: [0.43, 0.25, 2.3], werhund: [0.43, 0.33, 2.2], vampirjager: [0.5, 0.45, 1.3] };
const FORRO = { iryna: "#ff4f93", nicole: "#ff8a3c", cosgrave: "#3fd0b4", chuck: "#6fd45c", astrid: "#ffa3c4", flint: "#35b8a0" };
const retrato = k => (CARA[k] ? { retrato: { x: CARA[k][0], y: CARA[k][1], z: CARA[k][2] } } : {});
const token = (nombre, src, extra = {}) => ({ name: nombre, displayName: 30, actorLink: false, disposition: -1, width: 1, height: 1, texture: { src, fit: "cover" }, ...extra });

const actores = [
  ...VAMPIROS.map((v, i) => ({
    _id: uid(`vampiro-${v.clave}`), name: v.nombre, type: "vampiro", img: `${R}/libro/${v.clave}.webp`, folder: F["Vampiros de F.A.N.G."], sort: i * 100,
    system: { concepto: v.concepto, insignia: v.insignia, atributos: v.atributos, sangre: 0, equipo: v.equipo, habilidades: v.habilidades, mejoras: v.mejoras.map(m => ({ ...m, activa: false })), lesiones: v.lesiones, ultimoGesto: v.ultimoGesto },
    prototypeToken: token(v.nombre, `${R}/retratos/${v.clave}.webp`, { actorLink: true, disposition: 1 }),
    ownership: { default: 0 }, flags: { [ID]: { clave: v.clave, forro: FORRO[v.clave], ...retrato(v.clave) } }, _stats: STATS
  })),
  ...AMENAZAS.map((a, i) => {
    const { clave, nombre, arte, ...system } = a;
    return {
      _id: uid(`amenaza-${clave}`), name: nombre, type: "amenaza", img: arte ? `${R}/libro/${arte}.webp` : `${R}/amenazas/${clave}.webp`, folder: F[a.uber ? "Übermenschen" : "Fuerzas de ocupación"], sort: i * 100,
      system, prototypeToken: token(nombre, arte ? `${R}/retratos/${arte}.webp` : `${R}/amenazas/${clave}-token.webp`),
      ownership: { default: 0 }, flags: { [ID]: { clave, ...retrato(arte) } }, _stats: STATS
    };
  })
];

/* ───────── Diarios ───────── */
const pagina = (clave, nombre, html, n, nivel = 1) => ({ _id: uid(`pag-${clave}`), name: nombre, type: "text", title: { show: true, level: nivel }, sort: n * 100, text: { format: 1, content: html }, ownership: { default: -1 }, flags: {} });
const diario = (clave, nombre, pages, sort, permiso) => ({ _id: uid(`diario-${clave}`), name: nombre, pages, sort, folder: null, ownership: { default: permiso }, flags: { [ID]: { clave } }, _stats: STATS });
const lamina = (clave, nombre, n, orden) => ({ _id: uid(`pag-${clave}`), name: nombre, type: "image", title: { show: true, level: 3 }, sort: orden * 100, src: `${R}/libro/pag-${n}.webp`, image: { caption: `Eat the Reich, p. ${n}` }, ownership: { default: -1 }, flags: {} });
const EXTRA = { palacio: [53], opera: [59], zepelin: [64], transmision: [61] };
const lista = xs => `<ul>${xs.map(x => `<li>${x}</li>`).join("")}</ul>`;

const reglas = [
  pagina("turno", "En tu turno", `<p><em>Resumen de mesa; las reglas completas están en el manual, pp. 30-41.</em></p>
    <ol><li><strong>Elige un atributo</strong> según lo que haces y coge tantos dados como su valor. Si ninguno encaja, 2 dados.</li>
    <li><strong>Suma equipo y habilidades:</strong> +1 dado por cada objeto (gasta un uso) y por cada habilidad (paga su Sangre). El último uso de un objeto que empezó con varios «explota»: +1 dado más.</li>
    <li><strong>Tirad los dos:</strong> tú, tu reserva; el GM, el Ataque de la amenaza a la que te enfrentas, +1 dado por cada otra amenaza en juego.</li>
    <li><strong>Descartad del 1 al 3.</strong> Cada 4 o 5 es un éxito. Tus 6 son críticos: valen dos éxitos (los del GM, no).</li>
    <li><strong>Gasta tus éxitos uno a uno</strong> —pulsando cada dado de la tarjeta— y añade un detalle a la escena con cada uno: avanzar un Objetivo, atacar una Amenaza, defenderte (quita dados de ataque del GM), beber sangre nazi (+1 Sangre) o activar un ESPECIAL (solo con un 6).</li>
    <li><strong>Los +:</strong> si lo que cuentas cumple el requisito de un objeto o habilidad que has usado, tira sus dados de bonificación desde la tarjeta.</li>
    <li><strong>Termina el turno.</strong> Si al GM le quedan ataques sin defender, sufres una lesión.</li></ol>
    <h2>Los atributos</h2>${lista(Object.entries(ATRIBUTOS).map(([k, n]) => `<strong>${n}.</strong> ${AYUDA_ATRIBUTOS[k]}`))}
    <p>Tú mandas en los detalles: no preguntes si hay una puerta, di que la echas abajo. Lo único que no narras son los actos de los personajes con nombre de los demás. La mesa puede vetar cualquier detalle.</p>`, 0),
  pagina("sangre", "Sangre, lesiones y muerte", `<p><em>Manual, pp. 35-37.</em></p>
    <ul><li><strong>Sangre:</strong> empiezas con 0 y el máximo es 10. Se comparte libremente entre vampiros al alcance del brazo.</li>
    <li><strong>Lesión:</strong> con 1 o 2 ataques sin defender, tira 1d6 y marca la primera casilla libre de esa columna (si está llena, otra).</li>
    <li><strong>Derribado:</strong> con 3 o más (ajustable a 4 en los ajustes del sistema), marcas todas las casillas libres de la columna y quedas fuera de combate hasta que te rescaten: aparece un objetivo secundario para ello.</li>
    <li><strong>La segunda casilla</strong> de cada columna trae una penalización; la hoja la aplica o te la recuerda.</li>
    <li><strong>Curar</strong> una lesión cuesta 3 de Sangre, en cualquier momento.</li>
    <li><strong>Muerte:</strong> con las seis marcadas llega tu último gesto de resistencia: 8 dados, repártelos como quieras y despídete.</li></ul>`, 1),
  pagina("objetivos", "Objetivos, amenazas y refuerzos", `<p><em>Manual, pp. 37-39.</em></p>
    <ul><li><strong>Objetivo:</strong> valor de 2 a 12; cada éxito le quita 1. A 0, cumplido: quien quitó el último punto cuenta cómo, y la escena termina.</li>
    <li><strong>Amenaza:</strong> tiene valor y Ataque. A 0 deja de atacar… hasta que lleguen refuerzos.</li>
    <li><strong>Desafío:</strong> absorbe ese número de éxitos de cada acción antes de que empiecen a contar.</li>
    <li><strong>Refuerzos (fin de ronda):</strong> cada amenaza a 0 vuelve con 1d6 y la mitad de su Ataque inicial; cada amenaza activa sube 1 su Ataque. Si el GM no saca ni un éxito contra ti, el Ataque de esa amenaza sube 1.</li>
    <li><strong>«Solo» y Übermenschen:</strong> no usan refuerzos; a 0 quedan eliminados. Beber la sangre de un Übermensch desbloquea una Mejora.</li>
    <li><strong>Objetivos secundarios</strong> (la mitad del principal). Al cumplir uno, elige: ${PREMIOS_SECUNDARIO.join("; ").toLowerCase()}.</li>
    <li><strong>Retirada:</strong> cread un objetivo «¡Escapar!»; al cumplirlo volvéis a una localización que no esté más cerca de la torre.</li></ul>`, 2),
  pagina("botin", "Botín y flashbacks", `<p><em>Manual, pp. 39-41.</em></p>
    <p><strong>Botín.</strong> Una vez por Objetivo puedes quedarte algo: apúntalo en el hueco de botín de tu hoja con un requisito de bonificación pactado con el GM. Funciona como un objeto de 3 usos. Solo uno a la vez.</p>
    ${lista(BOTIN_EJEMPLOS.map(esc))}
    <p><strong>Flashback.</strong> Una vez por sesión, si sacas 2 éxitos o menos, la tarjeta te ofrece un flashback: te hace una pregunta sobre una misión pasada de F.A.N.G., la respondes con una escena breve y repites la tirada con 2 dados más.</p>
    <p>Contextos: @UUID[RollTable.${uid("tabla-contexto")}]{Flashback · ¿dónde fue?}. Preguntas: @UUID[RollTable.${uid("tabla-preguntas")}]{Flashback · la pregunta}.</p>`, 3)
];

const lugarHtml = l => `<p><em>Sector ${l.sector} · manual, p. ${l.pagina}.</em></p><p>${esc(l.resumen)}</p>
  <p><strong>Objetivo:</strong> ${esc(l.objetivo.nombre)} (${l.objetivo.valor}${l.objetivo.desafio ? `, Desafío ${l.objetivo.desafio}` : ""})</p>
  ${l.secundarios.length ? `<p><strong>Objetivos secundarios:</strong></p>${lista(l.secundarios.map(s => `${esc(s.nombre)} (${s.valor}). ${esc(s.premio)}`))}` : ""}
  <p><strong>Enemigos:</strong></p>${lista(l.enemigos.map(e => { const a = AMENAZAS.find(x => x.clave === e.clave); return `@UUID[Actor.${uid(`amenaza-${e.clave}`)}]{${esc(e.alias || a.nombre)}}${e.n > 1 ? ` ×${e.n}` : ""}${e.alias ? ` (como ${esc(a.nombre)})` : ""}${e.nota ? ` — ${esc(e.nota)}` : ""}`; }))}
  ${l.botin.length ? `<p><strong>Botín:</strong></p>${lista(l.botin.map(esc))}` : ""}
  <p class="er-pista">Panel de misión → Preparar la escena → <strong>${esc(l.nombre)}</strong> → Cargar. La página siguiente es la del manual. Escena: @UUID[Scene.${uid(`escena-${l.clave}`)}]{${esc(l.nombre)}}.</p>`;

const mision = [
  pagina("estructura", "Cómo va la misión", `<p><em>Manual, pp. 42-49.</em></p>
    <ol><li><strong>Los ataúdes.</strong> Los vampiros caen sobre un punto del Sector 3 que eligen ellos. Sube de 2 a 4 los Objetivos de esa primera escena para que todos tengan su entrada, y aprovéchala para enseñar Objetivos, Amenazas y Sangre.</li>
    <li><strong>El avance.</strong> Ellos eligen por dónde; cada localización es una escena de acción. Con 2 o 3 por sector va bien. Si un sitio no da juego, pasad de largo.</li>
    <li><strong>Los Übermenschen.</strong> Son las peleas que importan: preságialos antes de que aparezcan y, si los esquivan, que los sigan.</li>
    <li><strong>El clímax.</strong> Torre, zepelín, cazavampiros, el Werhund… y Hitler, que no dice ni una palabra.</li>
    <li><strong>El epílogo.</strong> Un par de frases por jugador sobre qué hace su vampiro después de la guerra.</li></ol>
    <p>En jornadas (3 horas): al empezar la tercera hora, que estén entrando en el Sector 1. Recorta, regala un camión blindado, lo que haga falta.</p>`, 0),
  lamina("manual-42", "Manual · la misión (p. 42)", 42, 0.2), lamina("manual-43", "Manual · el avance (p. 43)", 43, 0.4), lamina("manual-61", "Manual · enemigos comunes (p. 61)", 61, 0.6),
  ...[3, 2, 1].flatMap((s, k) => LOCALIZACIONES.filter(l => l.sector === s).flatMap((l, i) => {
    const orden = 1 + k * 20 + i;
    return [pagina(`lugar-${l.clave}`, l.nombre, lugarHtml(l), orden, 2), ...[l.pagina, ...(EXTRA[l.clave] ?? [])].map((n, j) => lamina(`manual-${l.clave}-${n}`, `${l.nombre} · manual p. ${n}`, n, orden + 0.1 * (j + 1)))];
  }))
];

const seguridad = [pagina("seguridad", "Antes de empezar", `<p><em>Manual, pp. 6-9 y 68-69. Léelo: lo que sigue es solo un recordatorio.</em></p>
  <ul><li><strong>Expectativas:</strong> es un festín de sangre exagerado; terror solo desde el punto de vista de los nazis.</li>
  <li><strong>Líneas y velos:</strong> acordadlos antes y apuntadlos en <em>Seguridad en la sesión</em> (el escudo de los controles de escena).</li>
  <li><strong>Tarjeta X, Pausa y Velo:</strong> en ese mismo panel; llegan a toda la mesa y son anónimas.</li>
  <li><strong>Calibrad la maldad:</strong> qué es parte del juego sin discusión, qué puede enfrentar a los personajes, qué solo hacen los villanos y qué no hace nadie.</li>
  <li><strong>Daños colaterales:</strong> decidid si no se muestran o si se asumen sin recrearse.</li>
  <li><strong>Hitler no habla.</strong> Y nadie interpreta saludos ni insultos: se dice que ocurren.</li></ul>`, 0)];

const journal = [
  diario("reglas", "Eat the Reich · Cómo se juega", reglas, 0, 2),
  diario("mision", "París · La misión y sus localizaciones", mision, 1, 0),
  diario("seguridad", "Seguridad y tono", seguridad, 2, 2)
];

/* ───────── Tablas ───────── */
const tabla = (clave, nombre, filas) => ({
  _id: uid(`tabla-${clave}`), name: nombre, img: "icons/svg/d6-grey.svg", description: "", formula: "1d6", replacement: true, displayRoll: true, folder: null, sort: 0,
  results: filas.map((t, i) => ({ _id: uid(`res-${clave}-${i}`), type: "text", name: "", description: t, text: t, img: "icons/svg/d6-grey.svg", weight: 1, range: [i + 1, i + 1], drawn: false, flags: {} })),
  ownership: { default: 2 }, flags: {}, _stats: STATS
});
const tables = [tabla("contexto", "Flashback · ¿dónde fue?", FLASHBACK.contexto), tabla("preguntas", "Flashback · la pregunta", FLASHBACK.preguntas)];

/* ───────── Música y efectos ───────── */
// El catálogo resuelve Ogg y MP3. No se publica una partitura con archivos ausentes.
const hay = k => Boolean(AUDIO[k] && existsSync(AUDIO[k].ruta));
const audioDe = k => `systems/${ID}/${AUDIO[k].ruta}?v=${manifiesto.version}`;
const ALTERNATIVA = { climax: "accion", sorpresa: "accion", persecucion: "accion", zepelin: "fiesta", catedral: "funeral", muerte: "funeral", cripta: "misterio", noche: "calma", guerra: "miedo", opera: "accion", vampiros: "miedo", fiesta: "accion", funeral: "calma", misterio: "calma", sigilo: "misterio", miedo: "misterio", calma: "misterio" };
const pista = k => (hay(k) ? k : hay(ALTERNATIVA[k]) ? ALTERNATIVA[k] : Object.keys(PISTAS).find(hay));
const faltan = Object.keys(PISTAS).filter(k => !hay(k));
if (faltan.length) throw new Error(`Faltan archivos de la partitura: ${faltan.join(", ")}`);
const sonido = (lista, clave, nombre, ruta, extra = {}) => ({ _id: uid(`son-${lista}-${clave}`), name: nombre, description: "", path: ruta, channel: lista === "musica" ? "music" : "interface", playing: false, pausedTime: null, repeat: lista === "musica", volume: 0.55, fade: lista === "musica" ? 2500 : 0, sort: 0, flags: { [ID]: { clave } }, ...extra });
const playlists = [
  { _id: uid("lista-musica"), name: "Eat the Reich · Música de escena", description: "Partitura por situaciones del manual. Créditos y licencias en assets/audio/CREDITOS.md.", channel: "music", mode: -1, playing: false, fade: 2500, folder: null, sorting: "a", sort: 0,
    sounds: Object.entries(PISTAS).filter(([k]) => hay(k)).map(([k, [titulo, obra]], i) => sonido("musica", k, `${titulo} — ${obra}`, audioDe(k), { sort: i * 100, repeat: !AUDIO[k].personaje })), ownership: { default: 0 }, flags: { [ID]: { clave: "musica" } }, _stats: STATS },
  { _id: uid("lista-sfx"), name: "Eat the Reich · Efectos", description: "Foley y disparos CC0. Fuentes en assets/audio/CREDITOS.md.", channel: "interface", mode: -1, playing: false, folder: null, sorting: "a", sort: 1,
    sounds: Object.entries(EFECTOS).map(([k, [nombre]], i) => sonido("sfx", k, nombre, `${R}/audio/sfx/${k}.ogg`, { sort: i * 100, volume: 0.7 })), ownership: { default: 0 }, flags: { [ID]: { clave: "sfx" } }, _stats: STATS }
];
const musicaDe = clave => ({ playlist: playlists[0]._id, playlistSound: uid(`son-musica-${pista(MUSICA_LUGAR[clave])}`) });

/* ───────── Escenas ───────── */
const ANCHO = 4000, ALTO = 2473, PT = ANCHO / 1125; // el mapa ocupa 1125 pt a doble página; la 49 empieza en x=557
const marcaJson = JSON.parse(await fs.readFile("content/marca.json").catch(() => "null"));
const nota = (clave, x, y, texto, extra = {}) => ({ _id: uid(`nota-${clave}`), entryId: journal[1]._id, pageId: null, x, y, elevation: 0, sort: 0, texture: { src: "icons/svg/skull.svg", tint: "#ffffff" }, iconSize: 60, text: texto, fontFamily: "Signika", fontSize: 40, textAnchor: 1, textColor: "#ffffff", global: true, flags: {}, ...extra });
const notes = LOCALIZACIONES.map(l => {
  const [pag, x, y] = l.mapa ?? [48, 325, 170];   // la sala de transmisión no sale en el mapa: va junto al zepelín
  return nota(l.clave, Math.round((x + (pag === 49 ? 557 : 0)) * PT), Math.round((y - 1) * PT), l.nombre, { pageId: uid(`pag-lugar-${l.clave}`), flags: { [ID]: { ir: l.clave } } });
});
const escenaBase = { padding: 0, backgroundColor: "#0c1026", grid: { type: 0, size: 100, distance: 1, units: "" }, tokenVision: false, fog: { exploration: false }, drawings: [], lights: [], sounds: [], templates: [], walls: [], regions: [], tokens: [], ownership: { default: 0 }, _stats: STATS };
const scenes = [
  { ...escenaBase, _id: uid("escena-paris"), name: "París, 1943", folder: null, sort: 0, navigation: true, navOrder: 0, navName: "París",
    background: { src: `${R}/libro/mapa.webp` }, thumb: `${R}/libro/mapa-thumb.webp`, width: ANCHO, height: ALTO, initial: { x: ANCHO / 2, y: ALTO / 2, scale: 0.35 },
    tiles: [], notes, journal: journal[1]._id, ...musicaDe("paris"), flags: { [ID]: { escena: "paris", musica: musicaDe("paris") } } },
  ...LOCALIZACIONES.map((l, i) => ({
    ...escenaBase, _id: uid(`escena-${l.clave}`), name: l.nombre, folder: folders.find(f => f.type === "Scene" && f.name.startsWith(`Sector ${l.sector}`))._id, sort: (i + 1) * 100, navigation: false, navOrder: i + 1, navName: l.nombre,
    background: { src: `${R}/escenas/${l.clave === "sirena" ? "sirena-limpia" : l.clave}.webp` }, thumb: `${R}/escenas/${l.clave === "sirena" ? "sirena-limpia" : l.clave}-thumb.webp`, width: 1920, height: 1080, initial: { x: 960, y: 540, scale: 0.6 },
    journal: journal[1]._id, journalEntryPage: uid(`pag-lugar-${l.clave}`), ...musicaDe(l.clave),
    notes: [
      nota(`volver-${l.clave}`, 90, 90, "Volver al mapa de París", { texture: { src: "icons/svg/city.svg", tint: "#ffffff" }, iconSize: 48, fontSize: 28, flags: { [ID]: { ir: "paris" } } }),
      nota(`leer-${l.clave}`, 190, 90, `Leer: ${l.nombre}`, { pageId: uid(`pag-lugar-${l.clave}`), texture: { src: "icons/svg/book.svg", tint: "#ffffff" }, iconSize: 48, fontSize: 28 }),
      nota(`manual-${l.clave}`, 290, 90, `El manual (p. ${l.pagina})`, { pageId: uid(`pag-manual-${l.clave}-${l.pagina}`), texture: { src: "icons/svg/eye.svg", tint: "#ffffff" }, iconSize: 48, fontSize: 28 })
    ],
    tiles: marcaJson ? [{ _id: uid(`tile-marca-${l.clave}`), texture: { src: `${R}/marca/mr-marca.webm`, scaleX: 1, scaleY: 1, tint: "#ffffff", fit: "fill" }, x: marcaJson.x, y: marcaJson.y, width: marcaJson.w, height: marcaJson.h, elevation: 0, sort: 10, rotation: 0, alpha: 1, hidden: false, locked: true, video: { loop: true, autoplay: true, volume: 0 }, flags: {} }] : [],
    flags: { [ID]: { escena: l.clave, musica: musicaDe(l.clave) } }
  }))
];

/* ───────── Paquete para MR- Dirección ───────── */
// El JSON versionado conserva la selección contextual de motivos de cada localización.
const curado = JSON.parse(await fs.readFile("content/direccion-es.json", "utf8"));
const src = (carpeta, k) => ({ src: carpeta === "musica" ? audioDe(k) : `${R}/audio/${carpeta}/${k}.ogg?v=${manifiesto.version}` });
const direccion = {
  schema: 1, id: ID, title: "Eat the Reich · La misión", version: manifiesto.version, author: "Manu Romera", license: "Uso privado",
  settings: {
    fade: 3.5,
    motifs: Object.entries(MOTIVOS).filter(([k]) => hay(k)).map(([k, icon]) => ({ id: k, label: curado.settings?.motifs?.find(m => m.id === k)?.label ?? PISTAS[k][0], icon, music: src("musica", k) })).concat(TEMAS_PERSONAJE.map(t => ({ ...t, music: src("musica", t.id) }))),
    effects: Object.entries(EFECTOS_BARRA).map(([k, label]) => ({ id: k, label, icon: EFECTOS[k][1], sound: src("sfx", k) })),
    markers: { milestones: AMENAZAS.filter(a => a.uber).map(a => ({ id: a.clave, label: `${a.nombre} ha caído`, public: true })), clocks: [{ id: "amanecer", label: "Hasta el amanecer", segments: 6, public: true, announce: true, phrases: ["La noche se acaba."] }] }
  },
  scenes: [{ clave: "presentacion", nombre: "F.A.N.G. · Sala de despliegue", pagina: uid("pag-estructura"), enemigos: [], thumb: `${R}/escenas/presentacion-thumb.webp`, sinMusica: true },
    { clave: "paris", nombre: "París, 1943", pagina: uid("pag-estructura"), enemigos: [], thumb: `${R}/libro/mapa-thumb.webp` },
    ...LOCALIZACIONES.map(l => ({ clave: l.clave, nombre: l.nombre, pagina: uid(`pag-lugar-${l.clave}`), enemigos: l.enemigos, thumb: `${R}/escenas/${l.clave === "sirena" ? "sirena-limpia" : l.clave}-thumb.webp` }))].map((e, i) => ({
    ref: { flag: [ID, "escena", e.clave] }, order: i, name: e.nombre, reading: { uuid: `JournalEntry.${journal[1]._id}.JournalEntryPage.${e.pagina}` }, music: e.sinMusica ? null : src("musica", pista(MUSICA_LUGAR[e.clave])),
    motifs: curado.scenes?.find(c => c.ref?.flag?.[2] === e.clave)?.motifs ?? null, cues: [], ambient: null, figures: e.enemigos.map(x => ({ ref: { uuid: `Actor.${uid(`amenaza-${x.clave}`)}` }, label: x.alias || AMENAZAS.find(a => a.clave === x.clave).nombre })),
    handouts: [], notes: "", thumb: e.thumb, stage: ["paris", "presentacion"].includes(e.clave) ? { mode: "none" } : { mode: "horizon", eye: 0.5 }
  }))
};
await fs.mkdir("content", { recursive: true });
await fs.writeFile("content/direccion-es.json", JSON.stringify(direccion, null, 2) + "\n");

const aventura = {
  _id: uid("aventura"), name: "Eat the Reich · La misión", img: `${R}/libro/portada.webp`,
  caption: "París, 1943. Un escuadrón de vampiros, un objetivo: beberse a Hitler.",
  description: "<p>Los seis vampiros de F.A.N.G., las fuerzas de ocupación y los Übermenschen, el mapa de París con sus localizaciones, las reglas resumidas y las tablas de flashback.</p>",
  actors: actores, combats: [], items: [], journal, scenes, tables, macros: [], cards: [], playlists, folders, sort: 0, flags: { [ID]: { version: manifiesto.version } }, _stats: STATS
};
await fs.mkdir("_data", { recursive: true });
await fs.writeFile("_data/aventura.json", JSON.stringify([aventura], null, 1));
console.log(`aventura: ${actores.length} actores, ${journal.reduce((n, j) => n + j.pages.length, 0)} páginas, ${tables.length} tablas, ${scenes.length} escenas, ${notes.length} calaveras en el mapa, ${playlists[0].sounds.length} pistas y ${playlists[1].sounds.length} efectos`);
