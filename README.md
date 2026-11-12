<p align="center">
  <img src="docs/img/banner.webp" alt="MR- Eat the Reich · sistema no oficial de uso privado para Foundry VTT" width="100%">
</p>

<p align="center">
  <a href="https://github.com/ManuRomera"><img alt="Manu Romera · Digital RPG Design" src="https://raw.githubusercontent.com/ManuRomera/ManuRomera/main/badges/mr-firma.svg" height="28"></a>
  <img alt="Versión 0.2.0" src="https://img.shields.io/badge/versi%C3%B3n-0.2.0-d81557?style=for-the-badge&labelColor=10132b">
  <img alt="Foundry VTT 13 y 14" src="https://img.shields.io/badge/Foundry_VTT-13_%E2%80%93_14-ff3d8b?style=for-the-badge&labelColor=10132b">
  <img alt="Repositorio privado, uso personal" src="https://img.shields.io/badge/uso-privado-1f6f78?style=for-the-badge&labelColor=10132b">
  <img alt="En español" src="https://img.shields.io/badge/idioma-espa%C3%B1ol-f2c230?style=for-the-badge&labelColor=10132b">
</p>

# MR- Eat the Reich

Sistema **no oficial y de uso privado** para jugar a *EAT THE REICH* (Grant Howitt y Will Kirkby; Rowan, Rook and Decard) en Foundry VTT 13.
No está publicado: lee [NOTICE.md](NOTICE.md) antes de compartirlo con nadie.

## Qué hace

- **La hoja es un ataúd abierto.** La ventana no es un rectángulo: son la tapa, con el vampiro a cuerpo entero, y la caja, con la hoja dentro y el texto ceñido a su forma. Cuatro pestañas (Acción, Poderes, Heridas, Dosier), forro del color de cada personaje y la letra que se encoge sola si algo no cabe. El tamaño se ajusta a la pantalla (o se fija en Ajustes). La ficha rectangular sigue ahí para editar («editar la ficha» en Dosier) y como alternativa en *Hoja → Ficha clásica*.
- **Marcas punk.** Nada de cajitas perfectas: casillas torcidas y X a rotulador rojo sangre que se salen del hueco para usos gastados, lesiones y casillas; vistos para las mejoras, gotas y salpicones para la Sangre, nombres tachados. Se generan con `npm run punk`.
- **Panel de misión** (directorio de Actores o controles de escena). Objetivos, Amenazas, turnos y ronda. Carga cualquiera de las 19 localizaciones con su objetivo y sus enemigos, o arrastra amenazas. **Fin de ronda** aplica los refuerzos. Desde ahí también se pone la música.
- **La tirada, en una tarjeta.** El resultado va estampado en grande, con los dados debajo. Cada éxito se gasta pulsando su dado: Objetivo, Amenaza, Defensa, Sangre o un ESPECIAL con los seises; el Desafío se descuenta solo. Los dados de bonificación (+) y el flashback se tiran desde la tarjeta. Al terminar el turno, los ataques sin defender tiran y marcan la lesión, y derriban si toca.
- **París en 20 escenas.** El mapa del manual con una calavera por localización: **doble clic** y vas a su decorado a pantalla completa (16:9); Mayús + doble clic abre su diario. En cada decorado, tres notas: volver al mapa, leer el resumen y **la página del manual** de ese sitio.
- **Banda sonora de música clásica** contra tanto punk: 18 piezas de dominio público (Paganini, Saint-Saëns, Grieg, Músorgski, Wagner en la Ópera, Offenbach, Chopin, Satie, Holst, Chaikovski…), una por escena y por estado de ánimo, en bucle sin costura. Y **efectos**: el golpe del resultado, críticos, lesiones, derribos, sorbos de sangre, la sirena de los refuerzos y los ataúdes cayendo.
- **MR- Dirección** (opcional, recomendado): el sistema le entrega la misión entera —escenas, lectura, música con fundido cruzado, nueve motivos, efectos, reparto de enemigos, un hito por Übermensch y el reloj «Hasta el amanecer».
- **Reglas propias de los enemigos** automatizadas: «Solo», Anatema (Vampirjäger), Aura de desgracia (Rust-Witch), Sin dolor y Sin sangre (Einherjar), garras del Werhund, despliegue rápido de los paracaidistas.
- **Lo de siempre:** ventanas con memoria, accesibilidad en la cabecera (tamaño, modo oscuro, alto contraste, fuente legible, sin movimiento), encuadre de retratos, lupa, seguridad en la sesión, diagnóstico y créditos en Ajustes.

## De dónde sale cada cosa

| Qué | Origen | ¿En el repo? |
|---|---|---|
| Retratos, mapa y páginas del manual (`assets/libro`, `assets/retratos`) | Tu PDF, con `npm run arte` | No (copyright de Will Kirkby y RR&D) |
| Decorados de las 19 localizaciones y 11 amenazas (`assets/escenas`, `assets/amenazas`) | Generados con Codex para este sistema, sin usar el arte del libro como referencia; firmados con la marca MR | Sí |
| Música (`assets/audio/musica`) | Grabaciones de dominio público o CC0 de Wikimedia Commons; ver `assets/audio/CREDITOS.md` | Sí |
| Efectos (`assets/audio/sfx`) | Sintetizados con `tools/audio.py sfx` | Sí |

## Ponerlo en marcha

```bash
npm run arte -- "/ruta/a/tu/Eat_the_Reich.pdf"
```

```bash
npm run build
```

`arte` saca las ilustraciones de tu PDF a `assets/` (no se versionan). `build` genera `_data/aventura.json` y compila el compendio; **Foundry tiene que estar cerrado**. Después crea un mundo con el sistema «MR- Eat the Reich» (ya hay uno de pruebas: `etr-pruebas`).

## Qué queda manual

- Los efectos de los ESPECIALES y de las habilidades pasivas (Devorador de cadáveres, Armadura de huesos, Suerte de muerto, Fluidos corrosivos, Alimentarse del miedo): la tarjeta los anuncia y cuenta los «1»; los números se ajustan con los +/− del Panel de misión o en la hoja.
- La Maldición del óxido de Rust-Witch (el parte de refuerzos la recuerda).
- Las recompensas de los objetivos secundarios.

## Dudas de transcripción

- **Nicole, «Disparo en la cabeza»:** la ficha traducida no trae efecto. Está vacío; se rellena en Editar.
- **Cosgrave, «Suerte de muerto»:** la ficha traducida dice «por cada dado que tiraste», que anularía siempre el ataque. Se ha dejado remitiendo al manual.
- **Derribo:** el manual dice 3 ataques en una página y 4 en otra. Por defecto 3; se cambia en Ajustes.

## Comprobaciones

```bash
npm test
```

Sin Foundry: `tests/arnes.html` pinta las plantillas reales con el CSS de Foundry (instrucciones en el propio archivo).
**No se ha probado en un Foundry real** (ni v13 ni v14, ni con Dice So Nice): es lo primero que hay que hacer.
