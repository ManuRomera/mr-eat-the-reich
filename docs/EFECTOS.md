# Efectos de la misión · 0.6.0

En MR Dirección, abre **Efectos**: el catálogo se repara automáticamente al entrar como GM activo. Incluye 29 efectos, sin reimportar la aventura. Los motivos musicales vuelven a estar disponibles completos en todas las localizaciones.

| Personaje | Armas y efectos disponibles |
|---|---|
| Iryna | Rifle de caza, sable, runas explosivas, murciélago y enjambre |
| Nicole | Ráfaga de M3, Lee-Enfield, humo, bomba incendiaria, lanzacohetes y dinamita |
| Cosgrave | Escopeta recortada y filo de acero |
| Chuck | Revólver y disparo doble de Betsy y María |
| Astrid | Ametralladora, granada de fragmentación y lanza |
| Flint | Garras de acero |

También se reemplazan las nueve señales de partida: sello de expediente, impacto contundente, herida, cuerpo al suelo, alimentación, alarma antiaérea, impacto del ataúd, cerrojo de objetivo y transición oscura. Hay compuertas de apertura y cierre, usadas automáticamente en la presentación.

Los disparos no se asignan automáticamente a cualquier tirada: el máster los activa en el momento narrativo adecuado. Las compuertas respetan el ajuste general de efectos del sistema. Sin MR Dirección puedes reproducirlos desde **Listas de reproducción → Eat the Reich · Efectos**, o mediante una macro de Script del GM:

```js
game.mrEatTheReich.sonar("murcielago", 0.55);
```

Las fuentes son grabaciones/foley CC0. El Lee-Enfield usa una grabación identificada de ese rifle; el M3 es una ráfaga diseñada a partir de disparos grabados, con cadencia aproximada de 450 disparos por minuto. Los efectos mágicos y algunos explosivos son mezclas, no registros certificados de esos objetos. Autores, enlaces y componentes de cada archivo: **assets/audio/EFECTOS-FUENTES.json** y **assets/audio/CREDITOS.md**.
