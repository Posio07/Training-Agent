# Exploración visual · IFBB Pro Agent

Tres direcciones sin reglas de estilo previas, cada una un universo propio. Todas usan los **mismos datos y eventos**, con la forma de los reales de la app, y no tocan nada de `ifbb-pro-agent/`.

- Abrir: `index.html` (enlaza a las tres) o directo `forja/`, `arcade/`, `zine/`. Todo con rutas relativas, sin build.
- Cada mock trae un mini menú: `inicio · rutina · sesion · top · resumen` (`top` arranca la sesión en el momento del top set).
- Los descansos corren 6× más rápido para poder recorrer el mock; `?vel=1` los deja en tiempo real.
- Toca la pantalla una vez antes de esperar sonido o vibración (restricción del navegador).
- Las fuentes vienen de Google Fonts por CDN; si no hay conexión caen a fuentes del sistema.

`_comun/nucleo.js` es la única pieza compartida: una sesión de ejemplo (Torso A, 5 ejercicios, 16 series) que copia la forma de `sessionStore.js` y `core-v2/sesion.js` (series `top` / `backoff` / `normal`, `repsLabel`, descansos 180 / 150 / 150 / 75 s, `markDone`, regla A5, récord por 1RM Epley, discos por lado), un emisor de eventos, el sintetizador de sonido (WebAudio, sin archivos) y la háptica. Cada dirección se suscribe a los eventos y los traduce a su lenguaje.

## Eventos reales que disparan todo

| Evento del mock | Equivalente en la app |
| --- | --- |
| `serie` | `SS.markDone` + `workoutRow` al registrar una serie (peso, reps) |
| `descanso` / `tick` / `descansoFin` | cronómetro de descanso (`restLabel` → segundos; tono + `vibrate([200,100,200])` al llegar a cero) |
| `record` | `mostrarRecord`: top set con 1RM Epley mayor al mejor previo (`vibrate([90,70,90])`) |
| `a5` | `DOLOR.corregirBackoffs`: back-off demasiado pesado queda como serie normal |
| `ejercicio` | todas las series de un ejercicio hechas |
| `fin` | `SS.complete`: series hechas/total, tonelaje, tiempo, récords, delta contra la última vez |

Las etiquetas de evidencia (E4, DEC-002, DEC-024, DEC-033, E2 de Singer et al. 2024 para el piso de descanso) salen del registro de reglas; en los mocks son solo rótulos, no cambian ninguna regla.

## Forja

La sesión es un trozo de metal que se forja. Cada serie es un martillazo: el botón se aplasta, la pantalla tiembla, saltan chispas con rebote y suena un golpe metálico; el lingote de arriba se calienta con cada serie y el fondo se pone más naranja. El descanso es enfriar: la pantalla se vuelve azul acero, el cronómetro es una temperatura que baja de 1200 °C y sube vapor; al llegar a cero suena una campana y vuelve el fuego. El top set no se toca, **se carga**: hay que mantener el botón mientras vibra, tiembla y se pone al rojo blanco, y al soltar cae el martillazo mayor, con onda de choque, destello, 380 chispas y una placa de acero que cae con rebote con el récord. Funciona para quien entrena porque convierte el esfuerzo en algo físico y pesado, con tipografía enorme legible a un metro de distancia, un solo botón gigante por pantalla y feedback inmediato en cada toque. Dispara: `serie` (martillazo, calor), `descanso/tick` (enfriar), `descansoFin` (campana), `record` (placa y fanfarria), `fin` (el tonelaje se estampa con un contador y un sello de nota).

## Arcade

La sesión es un nivel y cada ejercicio es un enemigo pixelado único (se genera una criatura simétrica distinta a partir del nombre). Atacar resta una barra de vida y suelta un número de daño con tu peso × reps; las series seguidas hacen combo y suman puntos (el tonelaje es la puntuación). El descanso es "recargando energía" con el reloj gigante en pixel y estrellas que aceleran; termina con READY? y FIGHT!. El top set es un **jefe**: aparece una alarma WARNING, hay un mini juego de timing para el golpe crítico, congelado de impacto, K.O. a pantalla completa y, si hay récord, NEW HIGH SCORE con 1RM e iniciales que se escriben como en una máquina de salón. El resumen es STAGE CLEAR con estrellas, rango S/A/B/C y bono por récord. Funciona porque entrenar ya es "subir la carga y no fallar", y los juegos llevan décadas enseñando a querer una barra más llena: progreso visible, metas por ejercicio y recompensa inmediata. Dispara: `serie` (golpe, daño, combo), `ejercicio` (enemigo derrotado), `descanso/tick` (energía), `a5` ("PARRY!"), `record` (high score), `fin` (rango y puntuación).

## Zine

La sesión es un cuaderno de papel hecho a mano, en colores riso (rosa, azul, amarillo) con letras recortadas tipo secuestro y sombras desalineadas. Cada serie se **estampa** con un sello de goma que cae del cielo, aplasta y deja el peso × reps con tinta, manchas y confeti de papel. El descanso es una bomba de dibujos animados con una mecha que se consume y chispa por el camino; la cara de la bomba se pone nerviosa y suda cuanto menos tiempo queda; al llegar a cero no explota, sino que revienta en confeti con "¡A la carga!". El top set es un **cartón de rasca**: hay que rascar la lámina plateada con el dedo (con ruido y vibración) para descubrir tu carga; al revelarse cae un sello gigante que dice RÉCORD y llueven trofeos. El resumen es un recibo que se imprime línea por línea, con el tonelaje y un álbum de stickers por ejercicio. Funciona porque baja la solemnidad: entrenar se siente como juego y manualidad, con interacciones táctiles muy distintas entre sí (pulsar, rascar, soltar), y el recibo da algo que ganas ganas de mostrar. Dispara: `serie` (sello, manchas), `ejercicio` (¡LISTA!), `descanso/tick` (mecha), `descansoFin` (confeti), `a5` (aviso), `record` (rasca, sello gigante, lluvia), `fin` (recibo).

## Qué sigue

Esto es solo exploración visual: ningún mock toca la lógica, el almacenamiento ni el service worker. Antes de llevar algo a la app habría que pasar por la etapa de filtro (accesibilidad, rendimiento, movimiento reducido) y por el flujo de decisiones del proyecto.
