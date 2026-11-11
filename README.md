<p align="center">
  <a href="https://github.com/ManuRomera"><img alt="Manu Romera · Digital RPG Design" src="https://raw.githubusercontent.com/ManuRomera/ManuRomera/main/badges/mr-firma.svg" height="28"></a>
</p>

# MR- Eat the Reich

Sistema **no oficial y de uso privado** para jugar a *EAT THE REICH* (Grant Howitt y Will Kirkby; Rowan, Rook and Decard) en Foundry VTT 13.
No está publicado: lee [NOTICE.md](NOTICE.md) antes de compartirlo con nadie.

## Qué hace

- **Hoja de vampiro.** Pulsa un atributo para tirar. Casillas de uso del equipo (la gris es el último uso: explota y da un dado más), botín, Sangre, habilidades, mejoras que se desbloquean, lesiones con su penalización aplicada (atributos que cambian, «no puedes usar los +»…) y el último gesto de resistencia. Botón **Editar** para crear vampiros propios.
- **Panel de misión** (directorio de Actores o controles de escena). Objetivos, Amenazas, turnos y ronda. Carga cualquiera de las 19 localizaciones de París con su objetivo y sus enemigos, o arrastra amenazas. **Fin de ronda** aplica los refuerzos.
- **La tirada, en una tarjeta.** Tu reserva contra los dados de ataque del GM (la amenaza mayor + 1 por cada otra). Cada éxito se gasta pulsando su dado: Objetivo, Amenaza, Defensa, Sangre o un ESPECIAL con los seises; el Desafío se descuenta solo. Los dados de bonificación (+) y el flashback se tiran desde la tarjeta. Al terminar el turno, los ataques sin defender tiran y marcan la lesión, y derriban si toca.
- **Reglas propias de los enemigos** automatizadas: «Solo», Anatema (Vampirjäger), Aura de desgracia (Rust-Witch), Sin dolor y Sin sangre (Einherjar), garras del Werhund, despliegue rápido de los paracaidistas.
- **Compendio «La misión».** Los seis vampiros, 15 amenazas, reglas resumidas, localizaciones, tablas de flashback y el mapa de París con notas. Se importa solo en un mundo vacío.
- **Lo de siempre:** ventanas con memoria, accesibilidad en la cabecera (tamaño, modo oscuro, alto contraste, fuente legible, sin movimiento), encuadre de retratos, lupa, seguridad en la sesión (líneas, velos, Pausa, Velo y Tarjeta X anónimos), diagnóstico y créditos en Ajustes.

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
