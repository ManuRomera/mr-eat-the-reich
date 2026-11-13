# Validación de la versión 0.5.0

- Sintaxis de todos los módulos JavaScript: correcta.
- `node tests/contenido.mjs`: migración idempotente de 36 pistas, conservación de música externa, fondos y atrezo; ningún token se coloca automáticamente.
- `node tests/presentacion.mjs`: preparación sin duplicados, seis protagonistas, vuelta a sala, cola de pulsaciones, recarga, permisos, prioridad sobre otra lista y conservación de efectos.
- `node tests/presentacion-vista.mjs`: imagen original, nombres seguros, cancelación de cambio pendiente al pulsar Siguiente, conexión tardía y retirada de la vista al salir.
- Paquete musical validado con el esquema real de MR Dirección 0.5.1, sin errores ni avisos.
- Huellas de las 30 grabaciones procesadas verificadas. Los seis MP3 coinciden byte a byte con los aportados por el director y los que estaban instalados.
- Instalador probado sobre una copia temporal: copia de seguridad, bloqueo de cambios propios antes de copiar, verificación final e instalación repetida sin cambios; archivos de packs y worlds intactos.

Estas son pruebas de código, archivos y simulación. No se ha arrancado una sesión real ni se ha hecho una prueba visual o multicliente en Foundry. Conviene comprobar la presentación desde una ventana de jugador tras instalarla y ajustar el volumen a las voces de la mesa.
