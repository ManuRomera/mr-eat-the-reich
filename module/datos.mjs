/**
 * Datos de juego: los seis vampiros, las amenazas, las localizaciones de París y las tablas de flashback.
 * Fuente única: lo usa el sistema en marcha (Panel de misión) y `scripts/gen-aventura.mjs` para el compendio.
 * Son datos mecánicos y resúmenes propios; el texto del manual no se copia (cada entrada remite a su página).
 */
export const ATRIBUTOS = {
  combate: "Combate", persuasion: "Persuasión", reparacion: "Reparación", investigacion: "Investigación",
  disparo: "Disparo", sigilo: "Sigilo", atemorizar: "Atemorizar"
};
export const AYUDA_ATRIBUTOS = {
  combate: "Matar nazis de cerca.", persuasion: "Influir con mentiras, halagos o carisma.", reparacion: "Reparar o modificar aparatos y estructuras.",
  investigacion: "Descubrir información.", disparo: "Matar nazis a distancia.", sigilo: "Evitar que te detecten.", atemorizar: "Asustar a los nazis para que obedezcan."
};

/** Qué impide la segunda casilla de una lesión. */
export const BLOQUEOS = {
  bonos: "No puedes usar los +", especiales: "No puedes usar ESPECIALES", beber: "No puedes obtener Sangre de nazis",
  gastar: "No puedes gastar Sangre en habilidades", unObjeto: "Solo un objeto por turno", sangria: "Gastas 1 Sangre al empezar tu turno"
};

const eq = (nombre, max, bono = 0, req = "", extra = {}) => ({ nombre, max, usos: max, bono, req, dado: true, nota: "", corchete: 0, ...extra });
const hab = (nombre, tipo, texto, { coste = 0, bono = 0, req = "" } = {}) => ({ nombre, tipo, texto, coste: tipo === "sangre" ? coste || 1 : 0, bono, req, activa: true });
const les = (a, b, efecto = "", { mod = {}, bloqueo = "" } = {}) => [
  { nombre: a, efecto: "", mod: {}, bloqueo: "", marcada: false },
  { nombre: b, efecto, mod, bloqueo, marcada: false }
];
const TODOS = n => Object.fromEntries(Object.keys(ATRIBUTOS).map(k => [k, n]));

export const VAMPIROS = [
  {
    clave: "iryna", nombre: "Iryna", insignia: "Escuadrón 43",
    concepto: "Ocultista y muerta viviente de la alta sociedad, oveja negra de un clan vampírico de rancio abolengo. Los nazis arrasaron su casa ancestral y a su familia. Paga buena parte de las facturas de F.A.N.G.",
    atributos: { combate: 2, persuasion: 4, reparacion: 2, investigacion: 2, disparo: 3, sigilo: 1, atemorizar: 3 },
    equipo: [
      eq("Rifle de caza exquisito", 5, 1, "posición elevada"), eq("Sable de caballería encantado", 5, 1, "a la carga"), eq("Runas explosivas", 3, 2, "oculto"),
      eq("Cigarrillos sacados de los bolsillos de un ahorcado", 3, 0, "", { dado: false, nota: "Marca un uso para obtener 2 de Sangre." })
    ],
    habilidades: [
      hab("Glamur oscuro", "sangre", "Quienes te rodean quedan hipnotizados por tu belleza antinatural.", { bono: 1, req: "rodeada de belleza" }),
      hab("Sirvientes de la noche", "sangre", "Invocas un enjambre de murciélagos bajo tu control.", { bono: 1, req: "edificios antiguos" }),
      hab("Tiro certero", "especial", "Cuando usas un arma de largo alcance: reduce en 1 el Ataque de una Amenaza.")
    ],
    mejoras: [
      hab("Fuego voraz del infierno", "sangre", "Ignora el Desafío en tu siguiente acción contra una Amenaza."),
      hab("Enervación del alma", "sangre", "Tu próxima tirada gana ESPECIAL: inflige 4 de daño a un Übermensch."),
      hab("Manto de la bestia caída", "sangre", "Combate y Atemorizar suben a 4, los demás atributos bajan a 1 y no puedes usar objetos. Dura hasta completar el Objetivo.", { coste: 2 })
    ],
    lesiones: [
      les("Traje rasgado", "Punción abdominal", "No puedes usar los +", { bloqueo: "bonos" }),
      les("Pelo arruinado", "Disparo en la cabeza", "+2 Combate, −2 Persuasión", { mod: { combate: 2, persuasion: -2 } }),
      les("Hombro herido", "Brazo amputado", "Solo puedes usar un objeto por turno", { bloqueo: "unObjeto" })
    ],
    ultimoGesto: "Hechicerías prohibidas"
  },
  {
    clave: "nicole", nombre: "Nicole", insignia: "Escuadrón 43",
    concepto: "Luchadora de la Résistance y experta en demoliciones, más dura que un pelotón entero. Perdió a su escuadrón en las purgas y recordarlo la enfurece. La mordió su novia vampira, que ya no está. Busca un final glorioso en el campo de batalla.",
    atributos: { combate: 2, persuasion: 2, reparacion: 1, investigacion: 2, disparo: 4, sigilo: 3, atemorizar: 3 },
    equipo: [
      eq("Subfusil M3", 4, 1, "flanquear", { corchete: 1 }), eq("Rifle Lee-Enfield recortado", 4, 1, "corto alcance", { corchete: 2 }),
      eq("Granadas de humo", 3, 1, "avanzar a cubierto", { corchete: 3 }), eq("Bombas incendiarias", 2, 2, "trampa de fuego", { corchete: 4 }),
      eq("Lanzacohetes", 1, 3, "objetivo fortificado", { corchete: 5 }), eq("Dinamita", 1, 3, "demolición", { corchete: 6 })
    ],
    habilidades: [
      hab("Carroñera", "especial", "Tira 1d6 y compáralo con los números entre corchetes de tu equipo: recupera 1 uso de esa arma."),
      hab("Zapadora", "especial", "Cuando uses explosivos: reduce en 1 un Objetivo o el Desafío de una Amenaza."),
      hab("Parpadeo", "sangre", "Implosionas en sombras y reapareces a unos metros.", { bono: 1, req: "infiltración" })
    ],
    mejoras: [
      hab("Enjambre de ratas", "sangre", "Invocas un enjambre de ratas bajo tu control.", { bono: 3, req: "suciedad" }),
      hab("Alimentarse del miedo", "pasiva", "Cuando reduces una Amenaza a 0, ganas 3 de Sangre."),
      hab("Negro absoluto", "sangre", "Sumes la zona en una oscuridad en la que solo tú ves.", { bono: 2, req: "emboscada" })
    ],
    lesiones: [
      les("Aturdida", "Disparo en la cabeza"),
      les("Solo un roce", "Desangrada", "Gastas 1 de Sangre al empezar tu turno", { bloqueo: "sangria" }),
      les("Mano herida", "Brazo mutilado", "Solo puedes usar un objeto por turno", { bloqueo: "unObjeto" })
    ],
    ultimoGesto: "Preparada para explotar"
  },
  {
    clave: "cosgrave", nombre: "Cosgrave", insignia: "F.A.N.G.",
    concepto: "Nigromante de Hackney, adiestrado por su tía. Clínicamente muerto, sigue rondando el East End y huye de la mafia de los muertos vivientes. Más falso que un billete de tres chelines, pero con un encanto arrollador y la manga llena de trucos de magia negra.",
    atributos: { combate: 2, persuasion: 3, reparacion: 3, investigacion: 2, disparo: 2, sigilo: 3, atemorizar: 2 },
    equipo: [
      eq("Espada monstruosa", 4, 1, "ataque sigiloso"), eq("Escopeta recortada", 3, 2, "a quemarropa"), eq("Espectro embotellado", 2, 2, "atraviesa paredes"),
      eq("Frasco robado con el alma de la madre Millicent", 1, 3, "lo que sea")
    ],
    habilidades: [
      hab("Danse macabre", "sangre", "Controlas por completo un cadáver durante un minuto; después se deshace.", { bono: 1, req: "«Hans, ¿estás bien?»" }),
      hab("Maleficio en el bolsillo", "especial", "Reduce en 1 el Ataque de una Amenaza."),
      hab("Fantasmagoría", "sangre", "Conjuras ilusiones de pesadilla a tu alrededor.", { bono: 1, req: "usas tu trasfondo con ingenio" })
    ],
    mejoras: [
      hab("Memoria pútrida", "sangre", "Quitas o implantas recuerdos a alguien a quien miras fijamente.", { bono: 1, req: "nunca estuviste aquí" }),
      hab("Explosión mortífera", "sangre", "Maldices a un nazi cercano: estalla al morir.", { bono: 2, req: "espacios cerrados" }),
      hab("Suerte de muerto", "pasiva", "Después de tirar y antes de descartar, quita éxitos de ataque del GM según tus dados (ver la ficha del manual).")
    ],
    lesiones: [
      les("Dedos cercenados", "Brazo arrancado", "−1 a todos los atributos", { mod: TODOS(-1) }),
      les("Tórax hundido", "Disparo en la frente", "+2 Atemorizar, −2 Persuasión", { mod: { atemorizar: 2, persuasion: -2 } }),
      les("Grimorio estropeado", "Poderes comprometidos", "No puedes gastar Sangre para usar habilidades", { bloqueo: "gastar" })
    ],
    ultimoGesto: "Horda de muertos vivientes"
  },
  {
    clave: "chuck", nombre: "Chuck", insignia: "F.A.N.G.",
    concepto: "Nació en el lado malo del pueblo y ha enterrado a más de un pariente. Le gustan el trabajo honrado, las películas del Oeste, el hígado humano y la llanura abierta. Un buen chico, si pasas por alto lo de comerse a la gente. F.A.N.G. lo sacó de la cárcel tras zamparse al sheriff y a media comisaría.",
    atributos: { combate: 3, persuasion: 1, reparacion: 4, investigacion: 2, disparo: 3, sigilo: 2, atemorizar: 2 },
    equipo: [
      eq("Par de revólveres, Betsy y María", 5, 1, "duelo"), eq("Cinturón de herramientas", 4, 1, "reparación improvisada"),
      eq("Sombrero vaquero", 1, 0, "", { dado: false, nota: "Márcalo para ignorar una Lesión o evitar ser Derribado; el sombrero queda destruido." })
    ],
    habilidades: [
      hab("Escupitajo ácido", "sangre", "Escupes ácido corrosivo.", { bono: 2, req: "contra metal" }),
      hab("Araña escurridiza", "sangre", "Te deslizas por techos y paredes.", { bono: 1, req: "bajo techo" }),
      hab("Devorador de cadáveres", "pasiva", "Después de tirar y antes de descartar, ganas 1 de Sangre por cada «1» que hayas sacado.")
    ],
    mejoras: [
      hab("Arremangarse", "especial", "Cuando superas tú solo un objetivo con Reparación: reduce en 4 una Amenaza."),
      hab("Fluidos corrosivos", "pasiva", "Cuando marcas una Lesión, reduce en 2 la Amenaza a la que te enfrentas."),
      hab("Lengua de látigo", "sangre", "Tu lengua, fuerte y prensil, se extiende cientos de metros.", { bono: 1, req: "inmovilizado" })
    ],
    lesiones: [
      les("Herida superficial", "Acribillado", "Gastas 1 de Sangre al empezar tu turno", { bloqueo: "sangria" }),
      les("Cojeando", "A rastras", "−1 a todos los atributos", { mod: TODOS(-1) }),
      les("Mutilado", "Destripado", "No puedes usar los +", { bloqueo: "bonos" })
    ],
    ultimoGesto: "Tiroteo final"
  },
  {
    clave: "astrid", nombre: "Astrid", insignia: "F.A.N.G.",
    concepto: "Expiloto. Algo la mordió tras estrellarse en una arboleda helada y el espíritu parásito de un depredador salvaje anidó en su corazón. Magia antigua corre por su sangre y los espíritus salvajes la veneran. (Y si eso falla, siempre le queda la ametralladora.)",
    atributos: { combate: 3, persuasion: 1, reparacion: 2, investigacion: 3, disparo: 2, sigilo: 2, atemorizar: 4 },
    equipo: [
      eq("Ametralladora", 4, 1, "enemigos a cubierto"), eq("Lanza", 4, 1, "alguien carga contra ti"),
      eq("Granada de fragmentación", 2, 2, "espacios cerrados"), eq("Grilletes espirituales", 2, 3, "animales")
    ],
    habilidades: [
      hab("Depredadora suprema", "especial", "Reduce en 3 una Amenaza."),
      hab("Resistencia sobrenatural", "especial", "Reduce en 3 el Ataque del GM."),
      hab("Rastro de sangre", "sangre", "Rastreas a un enemigo o buscas algo con el olfato.", { bono: 1, req: "el enemigo huye" })
    ],
    mejoras: [
      hab("Regeneración de pesadilla", "especial", "Elimina una lesión marcada."),
      hab("Espíritu de la tormenta", "sangre", "Lanzas objetos como un fantasma.", { bono: 2, req: "algo afilado y pesado" }),
      hab("Atadura fantasmal", "sangre", "Reduce en 1 un Objetivo o el Desafío de una Amenaza hasta el final de la ronda.")
    ],
    lesiones: [
      les("Espíritus intimidados", "Espíritus exorcizados", "No puedes usar ESPECIALES", { bloqueo: "especiales" }),
      les("Símbolos estropeados", "Sombras sangrantes", "+2 Sigilo, +2 Atemorizar", { mod: { sigilo: 2, atemorizar: 2 } }),
      les("Cojeando", "Pierna rota", "−1 a todos los atributos", { mod: TODOS(-1) })
    ],
    ultimoGesto: "Desata a los espíritus"
  },
  {
    clave: "flint", nombre: "Flint", insignia: "XIII Escuadrón Ataúd",
    concepto: "Nacido en una cueva de la que lo echaron los nazis. Mitad murciélago, mitad humano, todo pesadilla. Un cazador monstruoso con sed de sangre. Puede que hable… o no (quizá solo sea tímido).",
    atributos: { combate: 4, persuasion: 2, reparacion: 2, investigacion: 2, disparo: 1, sigilo: 3, atemorizar: 3 },
    equipo: [eq("Garras de acero", 4, 1, "emboscada"), eq("Gancho de escalada", 3, 3, "tres pisos o más")],
    habilidades: [
      hab("Apetito voraz", "especial", "Cuando estás en combate cuerpo a cuerpo: obtienes 3 de Sangre."),
      hab("Sentir el latido", "sangre", "Ves el latido de los seres vivos a través de paredes y objetos.", { bono: 1, req: "cobertura gruesa" }),
      hab("Proyectil improvisado", "sangre", "Arrojas algo largo y pesado a una distancia increíble.", { bono: 1, req: "aerodinámico" }),
      hab("Alas", "sangre", "Puedes volar.", { bono: 1, req: "combate aéreo" })
    ],
    mejoras: [
      hab("Chillido infernal", "sangre", "Reduce en 1 el Desafío de una Amenaza.", { coste: 2 }),
      hab("Armadura de huesos", "pasiva", "Después de tirar y antes de descartar, quita 1 éxito de ataque del GM por cada «1» que hayas sacado."),
      hab("Forma de babosa", "sangre", "Te filtras por las grietas y te deslizas bajo las puertas.", { bono: 1, req: "¡está en las paredes!" })
    ],
    lesiones: [
      les("Dientes rotos", "Mandíbula rota", "No puedes obtener Sangre de nazis", { bloqueo: "beber" }),
      les("Asustado", "Aterrado", "+2 Investigación, −2 Combate", { mod: { investigacion: 2, combate: -2 } }),
      les("Alas perforadas", "Destripado", "No puedes usar los +", { bloqueo: "bonos" })
    ],
    ultimoGesto: "Forma final"
  }
];

/**
 * Amenazas. revive: vuelve con refuerzos al caer a 0; crece: +1 Ataque al final de cada ronda.
 * («Solo» en el manual = ni revive ni crece.) umbral: cara mínima de éxito de los jugadores contra ella.
 */
const am = (clave, nombre, valor, ataque, extra = {}) => ({ clave, nombre, valor, ataque, desafio: 0, revive: true, crece: true, uber: false, umbral: 4, anatema: false, garras: false, sinDolor: false, sinSangre: false, refuerzoValor: 0, rasgos: "", presagio: "", sabor: "", descripcion: "", pagina: 61, arte: "", ...extra });
const SOLO = { revive: false, crece: false };

export const AMENAZAS = [
  am("patrulla", "Patrulla policial", 4, 2, { descripcion: "Un grupo de agentes con pistolas, porras y esposas." }),
  am("infanteria", "Escuadrón de infantería", 6, 3, { descripcion: "Diez soldados con fusiles y subfusiles." }),
  am("blindado", "Vehículo blindado", 4, 2, { desafio: 1, ...SOLO, descripcion: "Transporte de tropas de acero con una ametralladora atornillada arriba." }),
  am("infanteria-blindada", "Infantería blindada", 6, 3, { desafio: 1, descripcion: "Placas de acero y cuero endurecido: cuesta tumbarlos." }),
  am("motoristas", "Escuadrón de motoristas", 10, 3, { ...SOLO, rasgos: "<b>Chocar y arder:</b> mientras se enfrenten a ellos, todos los vampiros tienen este ESPECIAL: inflige 3 de daño al escuadrón.", descripcion: "Pilotos expertos en motos rápidas. Si los desmontas, siguen a pie." }),
  am("francotiradores", "Equipo de francotiradores", 3, 6, { desafio: 2, ...SOLO, descripcion: "Tiradores y observadores en posiciones ocultas." }),
  am("paracaidistas", "Escuadrón de paracaidistas", 6, 3, { refuerzoValor: 2, rasgos: "<b>Despliegue rápido:</b> cuando los refuerzos suben su Ataque, suma también +2 a su Amenaza.", descripcion: "Saltan de los aviones para caer encima de los vampiros." }),
  am("tanque", "Tanque", 8, 6, { desafio: 2, ...SOLO, descripcion: "Un tanque que ruge y retumba, con un cañón en la torreta." }),
  am("cazavampiros", "Escuadra de Vampirjäger", 8, 6, { anatema: true, arte: "vampirjager", rasgos: "<b>Anatema:</b> cada 6 en sus dados de ataque cuenta como 2 éxitos.", descripcion: "Cinco cazadores con balas de plata, agua bendita, estacas y bombas incendiarias." }),
  am("quema-arte", "Brigada quema-arte", 4, 4, { pagina: 58, descripcion: "Como una patrulla, pero con lanzallamas." }),
  am("einherjar", "Einherjar", 7, 3, { pagina: 55, sinDolor: true, sinSangre: true, rasgos: "<b>Sin dolor:</b> cada 1 en los dados de ataque del GM sube en 1 su Desafío. <b>Sin sangre:</b> no se puede beber Sangre mientras solo te enfrentes a ellos.", descripcion: "Armaduras encantadas y momias guerreras animadas por magia nazi." }),
  am("stahlsoldat", "Stahlsoldat", 6, 4, { uber: true, desafio: 2, revive: false, pagina: 53, rasgos: "<b>Arrancando:</b> gana Ataque con los refuerzos como cualquiera, pero queda destruido cuando su Amenaza llega a 0.", presagio: "Pancartas de los avances de guerra; silbidos y chirridos; persianas de acero que se cierran de golpe.", sabor: "Lejía, barniz, gasolina.", descripcion: "Mitad hombre, mitad máquina: garras neumáticas, pistola de dispersión y una pulgada de blindaje." }),
  am("rust-witch", "Rust-Witch", 10, 6, { uber: true, ...SOLO, umbral: 5, pagina: 56, arte: "rust-witch", rasgos: "<b>Aura de desgracia:</b> contra ella los jugadores descartan del 1 al 4 (solo el 5 y el 6 son éxitos). <b>Maldición del óxido:</b> al final de cada ronda, elige un PJ: una pieza de su equipo, al azar, queda inservible.", presagio: "Carroñeros en el cielo, un tanque abandonado e inútil, un caza que se desploma.", sabor: "Ruda, caramelos masticables y tónica.", descripcion: "Bruja de la entropía: las máquinas fallan y el metal se oxida a su paso." }),
  am("damonenblut", "Dämonenblut", 12, 4, { uber: true, ...SOLO, desafio: 1, pagina: 59, arte: "damonenblut", presagio: "Carteles con su cara de galán, cuernos y dientes por el suelo y las paredes, público encogido de miedo.", sabor: "Un tarro de grasa de pollo con una colilla apagada.", descripcion: "Franz Vogel, estrella de cine con corazón de demonio: cuernos, garras e icor negro." }),
  am("werhund", "Werhund", 10, 5, { uber: true, ...SOLO, desafio: 1, garras: true, pagina: 64, arte: "werhund", rasgos: "<b>Garras desgarradoras:</b> al marcar una lesión suya, marca todas las casillas libres de esa columna. <b>Regeneración:</b> su Desafío no se puede reducir de ningún modo.", presagio: "Luna llena, aullidos por toda la ciudad, cadáveres de soldados que no habéis matado vosotros.", sabor: "Sudor, carne, cuero barato.", descripcion: "El primer hombre lobo nazi. Hasta un vampiro debería temer esas garras." })
];

/** mapa: posición del rótulo en el mapa a doble página (página del PDF 48 o 49, x, y en puntos). */
const loc = (clave, nombre, sector, pagina, mapa, objetivo, extra = {}) => ({ clave, nombre, sector, pagina, mapa, objetivo, enemigos: [], secundarios: [], botin: [], resumen: "", ...extra });
const ob = (nombre, valor, desafio = 0) => ({ nombre, valor, desafio });
const en = (clave, n = 1, alias = "", nota = "") => ({ clave, n, alias, nota });

export const LOCALIZACIONES = [
  loc("sirena", "Plaza de la Sirena", 3, 50, [49, 363, 597], ob("Salir de la zona de caída y ponerse a cubierto", 6), { enemigos: [en("patrulla", 2)], resumen: "Barrio elegante de bistrós y boutiques alrededor de una fuente." }),
  loc("almacenes", "Los grandes almacenes", 3, 50, [49, 227, 608], ob("Encontrar la salida del laberinto de plantas", 6), { enemigos: [en("infanteria", 1, "", "os busca"), en("blindado", 1, "", "espera fuera")], resumen: "Varias plantas de género alemán, escaleras mecánicas y dependientes a la carrera." }),
  loc("cementerio", "Cementerio", 3, 50, [49, 312, 509], ob("Arruinar el funeral", 6), { enemigos: [en("infanteria", 1, "", "pillados por sorpresa, pero armados")], resumen: "Camposanto nuevo, solo para alemanes, en pleno funeral militar con salva de honor." }),
  loc("hotel", "Hôtel L'Étoile", 3, 51, [49, 240, 509], ob("Hacer una entrada como es debido", 6), { enemigos: [en("patrulla", 2, "Oficiales tomando una copa")], resumen: "Hotel de lujo para las familias del mando; el bar del sexto piso tiene uno de los últimos pianos de cola de París." }),
  loc("mausoleo", "Mausoleo", 3, 51, [49, 142, 559], ob("Entrar en el laberinto subterráneo (y salir)", 6, 1), { enemigos: [en("infanteria-blindada", 1, "", "muy asustados")], resumen: "Entrada a túneles y criptas olvidadas: buen sitio para perderse de vista, malo para orientarse." }),
  loc("catedral", "Catedral de Saint-Médard", 3, 51, [49, 230, 455], ob("Abrir un hueco en el cerco y salir", 8), { enemigos: [en("infanteria", 2), en("francotiradores", 1, "", "en el edificio de enfrente")], botin: ["Una cruz especialmente grande (++saltar vallas)"], resumen: "Vidrieras, bancos de roble y un gran altar. El suelo sagrado no hace nada a los vampiros; las balas que entran por las ventanas, sí." }),
  loc("palacio", "Palacio de la Tecnología Alemana", 2, 52, [49, 140, 376], ob("Asaltar el pabellón y salir por el otro lado", 9), { enemigos: [en("stahlsoldat")], secundarios: [{ ...ob("Arreglar la plataforma de armas", 5), premio: "Da acceso, sin ocupar botín, a: Plataforma de armas cuadrúpeda (+ignorar el fuego enemigo) y Torreta de microondas (+++antitanque)." }], botin: ["Prototipo de lanzarrayos (++++bien calibrado antes de disparar)", "Bidón de combustible experimental (++sobre algo inflamable)"], resumen: "Sala de exposiciones con pilas experimentales, aleaciones nuevas y una plataforma de armas de cuatro patas, apagada." }),
  loc("metro", "Estación de metro", 2, 53, [49, 98, 439], ob("Atajar por los túneles del metro", 10), { enemigos: [en("infanteria-blindada", 2, "", "buscan vampiros"), en("motoristas", 1, "", "si ponéis un tren en marcha")], resumen: "No circulan trenes, pero los túneles llegan a casi cualquier parte… y bajo tierra es fácil acabar acorralado." }),
  loc("garaje", "Garaje de coches de lujo", 2, 54, [48, 450, 578], ob("Robar algo llamativo y salir pitando", 8), { enemigos: [en("infanteria", 1, "Infantería en vehículo blindado", "en persecución"), en("francotiradores", 1, "", "en una azotea")], botin: ["Deportivo italiano descapotable (++maniobras)", "Berlina alemana de importación (++volantazos)", "Cacharro francés (++pasar desapercibido)"], resumen: "Coches caros de diplomáticos y expatriados: aguantan poco, corren mucho." }),
  loc("cerdo-negro", "El Cerdo Negro", 2, 54, [48, 300, 539], ob("Despistar a los nazis escondiéndose en el bar", 6), { enemigos: [en("patrulla", 2), en("infanteria", 1, "Infantería en vehículo blindado", "llega de camino")], secundarios: [{ ...ob("Hacer equipo con la Resistencia", 4), premio: "Da acceso, sin ocupar botín, a: Escuadrón guerrillero (+maniobra de flanqueo)." }], resumen: "Bar de sótanos encadenados y humo; escondite de la Resistencia, avisada de vuestra llegada." }),
  loc("museo", "Museo de la Guerra Europea", 2, 55, [48, 456, 475], ob("Cruzar el museo antes de que os desborden los no-muertos", 8, 1), { enemigos: [en("einherjar"), en("patrulla", 1, "Guardias del museo")], botin: ["Arco largo, una obra maestra (++asesino silencioso)", "Cañón cargado que aún funciona (+++objetivo inmóvil)", "Momia guerrera traidora (+vendaje bien prieto)", "El caballo no-muerto de Napoleón (+pisotear)"], resumen: "Mil años de armas en vitrinas polvorientas… que un brujo nazi acaba de animar." }),
  loc("parque", "Parque de atracciones", 2, 56, [48, 372, 633], ob("Cruzar la feria que se derrumba, perseguidos por la bruja", 10, 1), { enemigos: [en("rust-witch", 1, "", "os echa la noria encima"), en("patrulla", 1, "Tripulación del tanque", "lo han abandonado")], resumen: "Feria de luces con la tercera noria más grande de Europa, encendida y sin nadie al mando." }),
  loc("galeria", "Galería de arte censurado", 2, 58, [48, 450, 413], ob("Atravesar la galería rápido y con violencia", 8), { enemigos: [en("infanteria", 1, "Infantería en vehículo blindado", "revientan la pared"), en("quema-arte")], secundarios: [{ ...ob("Localizar un Van Gogh perdido (o algo así)", 4), premio: "Sin ventaja mecánica: tenéis un Van Gogh." }], resumen: "Arte «degenerado» mal colgado y, esta noche, la mayor quema de cuadros que se recuerda." }),
  loc("opera", "La Ópera", 2, 58, [48, 175, 587], ob("Correr por los pasillos hacia Hitler sin hacer caso al Übermensch", 4), { enemigos: [en("damonenblut")], resumen: "Wagner a medio segundo acto, puertas cerradas y un galán de cine que ejecuta a alguien del público por cada nota fallada." }),
  loc("deposito", "Depósito de armas y vehículos", 1, 62, [48, 292, 387], ob("Atravesar el aparcamiento", 8), { enemigos: [en("motoristas", 1, "", "a toda velocidad entre coberturas"), en("infanteria", 1, "", "de guardia"), en("tanque", 1, "", "sale del hangar cuando cae un enemigo")], secundarios: [{ ...ob("Asaltar el depósito de municiones", 4), premio: "Cada jugador recupera todos los usos de sus armas de fuego, granadas y similares." }], botin: ["El Volkswagen negro blindado de tus sueños (++ametralladoras frontales)"], resumen: "Semiorugas, coches de mando y todoterrenos de los oficiales." }),
  loc("jardin", "Jardín temático nazi", 1, 62, [48, 374, 313], ob("Guerra relámpago en la fiesta del jardín", 8), { enemigos: [en("infanteria", 1, "Oficiales borrachos"), en("francotiradores", 2)], resumen: "Una postal austriaca al pie de la torre, con el alto mando de banquete. Mucha cobertura para vosotros… y para los tiradores." }),
  loc("torre", "La Torre Eiffel", 1, 63, [48, 240, 293], ob("Subir a lo alto de la Torre Eiffel", 8, 1), { enemigos: [en("infanteria-blindada", 1, "", "os esperan"), en("paracaidistas", 1, "", "caen arriba y por los lados")], resumen: "Ascensores, focos y antenas de última tecnología alemana. Arriba, amarrado, el zepelín." }),
  loc("zepelin", "El zepelín del Führer", 1, 63, [48, 363, 213], ob("Llegar a la sala de transmisión de Hitler", 6, 1), { enemigos: [en("cazavampiros")], resumen: "Mármol, seda, oro y caoba en el aire, cuadros sin mérito y tesoros saqueados." }),
  loc("transmision", "Sala de transmisión de Hitler", 1, 64, null, ob("Acabar con el Werhund", 10, 1), { enemigos: [en("werhund")], resumen: "Decorado de pancartas, atril y brasero para retransmitir en directo vuestra muerte. Si el Werhund cae, Hitler queda a vuestra merced. Hitler no habla: no tiene voz." })
];

export const FLASHBACK = {
  contexto: ["A bordo de un avión en caída libre", "Rescatando prisioneros de guerra en plena tormenta", "Asesinando a un general nazi en la ópera", "Sacando a un espía de detrás de las líneas enemigas", "Robando una máquina de cifrado de un submarino", "Saboteando un arsenal enemigo con explosivos improvisados"],
  preguntas: [
    "Salvaste a [personaje] de una muerte segura. ¿Qué o quién quería matarlo?",
    "Reclutaste a [personaje] para F.A.N.G. ¿Qué tuviste que hacer para convencerlo?",
    "Le debes la vida a [personaje]. ¿Cómo te salvó?",
    "[personaje] te enseñó unos cuantos trucos. ¿Cuál fue el más importante?",
    "No quieres que [personaje] te vea fracasar así. ¿Qué esperas de él?",
    "No quieres que [personaje] te vea fracasar así. ¿Qué espera de ti?"
  ]
};

export const PREMIOS_SECUNDARIO = ["Reducir 1d6 un Objetivo principal", "Reducir 1d6 una Amenaza", "Ganar 1d6 de Sangre", "Reducir en 2 el Ataque de una Amenaza", "Reducir en 1 el Desafío de una Amenaza u Objetivo", "Conseguir un equipo inusual o poderoso"];

export const BOTIN_EJEMPLOS = ["Subfusil (+flanquear)", "Rifle (+largo alcance)", "Pistola (+espacios cerrados)", "Ametralladora (+enemigos a cubierto)", "Granadas de fragmentación (+espacios cerrados)", "Coche blindado (+bajo fuego pesado)", "Coche de lujo (+abrir camino)", "Tanque (+aplastar edificios)"];
