# Presentación de jugadores · Sala de despliegue

1. Actualiza desde Sistemas de juego en la pantalla inicial de Foundry. Abre el mundo; el GM activo añadirá una escena y una lista de presentación sin reimportar la aventura.
2. Asigna cada vampiro a su jugador mediante **Configurar propiedad**, o elige su personaje en la configuración del usuario.
3. En **Configuración → Eat the Reich → Presentación de jugadores**, o en el icono de identificación de los controles de escena, abre el panel.
4. Pulsa **Entrar en la sala**. Todos verán cinco ataúdes metálicos enteros en una máquina de lanzamiento oscura y sonará The Complex.
5. Pulsa el nombre del jugador: aparece en primer plano la ilustración original recortada dentro del ataúd metálico, cerrado en primer plano. La tapa tarda 2,8 segundos en abrirse y permanece visible junto al personaje. Su canción acompaña la presentación.
6. **Siguiente** y **Entrar en la sala** cierran primero la compuerta durante 2,6 segundos y después desvanecen el conjunto durante 1,1 segundos, recuperando la sala y su música. Selecciona al siguiente jugador cuando estés preparado.
7. **Salir de la presentación** detiene esta lista y activa la escena que había antes, o la primera escena disponible si se entró directamente desde la navegación. También puedes activar otra escena con normalidad.

La sala muestra cinco ataúdes, como se pidió. El panel ofrece los seis vampiros del manual para que puedas utilizar cualquier reparto de cinco; quien no tenga propietario aparece con el nombre de su personaje. Los nombres de jugadores no se incrustan en las imágenes: se leen de los usuarios y pueden cambiarse sin regenerar arte.

La selección se guarda como estado de mundo, por lo que una persona que se conecte tarde o recargue verá el personaje actualmente presentado. Solo el GM activo publica cambios. El audio usa documentos nativos de Foundry y el volumen global de música de cada cliente sigue siendo efectivo. El navegador puede pedir un primer clic para desbloquear el sonido.

Mientras esta escena está activa se impide que otra lista o MR Dirección inicien música en paralelo; los efectos de MR Dirección siguen funcionando. La prioridad se libera al activar otra escena. Si usas una macro de leitmotiv del sistema durante esta escena, se abre la presentación de ese personaje.

## Macros opcionales

Estas llamadas se ejecutan como macros de tipo Script del GM:

```js
game.mrEatTheReich.abrirPresentacion();
await game.mrEatTheReich.iniciarPresentacion();
await game.mrEatTheReich.presentarPersonaje("iryna");
await game.mrEatTheReich.siguientePresentacion();
await game.mrEatTheReich.terminarPresentacion();
```

Son acciones independientes: usa solo la llamada que necesites en cada macro.

Las seis imágenes de primer plano son las originales de Will Kirkby ya incluidas en tu sistema. No se redibujan ni se cambian sus rasgos. La sala de lanzamiento es arte nuevo. Este paquete mantiene el uso privado y los avisos del sistema.

Los mundos nuevos activan esta escena tras la primera importación automática. Una actualización no cambia por sorpresa la escena activa de un mundo que ya se estaba jugando.
