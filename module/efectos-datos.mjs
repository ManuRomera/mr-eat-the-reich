/** Banco de foley y armas. Fuentes, recortes y licencias en assets/audio/EFECTOS-FUENTES.json. */
export const EFECTOS = {
  "sello": [
    "Sello de expediente",
    "stamp"
  ],
  "critico": [
    "Impacto contundente",
    "burst"
  ],
  "lesion": [
    "Herida · impacto orgánico",
    "bone"
  ],
  "derribo": [
    "Cuerpo al suelo",
    "person-falling"
  ],
  "sangre": [
    "Alimentarse · mordisco y sangre",
    "droplet"
  ],
  "sirena": [
    "Alarma antiaérea · refuerzos",
    "bullhorn"
  ],
  "ataud": [
    "Ataúd · impacto de despliegue",
    "box"
  ],
  "objetivo": [
    "Objetivo · cerrojo metálico",
    "flag-checkered"
  ],
  "flashback": [
    "Flashback · transición oscura",
    "clock-rotate-left"
  ],
  "rifle-caza": [
    "Iryna · rifle de caza",
    "crosshairs"
  ],
  "lee-enfield": [
    "Nicole · Lee-Enfield",
    "crosshairs"
  ],
  "m3": [
    "Nicole · M3 · ráfaga corta",
    "gun"
  ],
  "revolver": [
    "Chuck · revólver",
    "gun"
  ],
  "revolver-doble": [
    "Chuck · Betsy y María",
    "gun"
  ],
  "escopeta": [
    "Cosgrave · escopeta recortada",
    "gun"
  ],
  "ametralladora": [
    "Astrid · ametralladora",
    "jet-fighter"
  ],
  "granada": [
    "Astrid · granada de fragmentación",
    "bomb"
  ],
  "dinamita": [
    "Nicole · dinamita",
    "explosion"
  ],
  "lanzacohetes": [
    "Nicole · lanzacohetes",
    "rocket"
  ],
  "humo": [
    "Nicole · granada de humo",
    "cloud"
  ],
  "incendiaria": [
    "Nicole · bomba incendiaria",
    "fire"
  ],
  "sable": [
    "Iryna / Cosgrave · filo de acero",
    "khanda"
  ],
  "garra": [
    "Flint · garras de acero",
    "hand-fist"
  ],
  "lanza": [
    "Astrid · lanza",
    "location-arrow"
  ],
  "runas": [
    "Iryna · runas explosivas",
    "fire-flame-curved"
  ],
  "murcielago": [
    "Murciélago · aleteo cercano",
    "wind"
  ],
  "enjambre": [
    "Murciélagos · enjambre",
    "wind"
  ],
  "ataud-abrir": [
    "Ataúd · abrir compuerta",
    "door-open"
  ],
  "ataud-cerrar": [
    "Ataúd · cerrar compuerta",
    "door-closed"
  ]
};

/**
 * Los únicos efectos que van a la barra de MR- Dirección (con rótulo corto). El resto no desaparece: las armas suenan solas
 * cuando su dueño las usa en una tirada, y todo el banco sigue en la lista «Eat the Reich · Efectos» y en `game.mrEatTheReich.sonar`.
 */
export const EFECTOS_BARRA = { sirena: "Alarma", ataud: "Impacto de ataúd", m3: "Disparos", granada: "Explosión", sangre: "Mordisco", enjambre: "Murciélagos" };

/** Qué efecto le corresponde a un objeto o habilidad por su nombre (el primero que encaje). */
const SONIDO_POR_NOMBRE = [
  [/rifle de caza/i, "rifle-caza"], [/lee.?enfield/i, "lee-enfield"], [/subfusil|m3/i, "m3"], [/rev[oó]lver/i, "revolver-doble"], [/escopeta/i, "escopeta"],
  [/ametralladora/i, "ametralladora"], [/lanzacohetes/i, "lanzacohetes"], [/dinamita/i, "dinamita"], [/humo/i, "humo"], [/incendiari/i, "incendiaria"], [/granada/i, "granada"],
  [/runas/i, "runas"], [/sable|espada/i, "sable"], [/garras/i, "garra"], [/lanza\b/i, "lanza"], [/sirvientes de la noche|murci[eé]lago/i, "enjambre"], [/alas\b/i, "murcielago"],
  [/pistola|rifle|fusil/i, "revolver"], [/ca[ñn][oó]n|tanque|bid[oó]n/i, "granada"]
];
export const sonidoDe = nombre => SONIDO_POR_NOMBRE.find(([re]) => re.test(String(nombre ?? "")))?.[1] ?? "";
