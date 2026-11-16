# Exploración de diseño: tres universos para entrenar

Tres direcciones de diseño para IFBB Pro Agent, hechas a propósito sin mirar el diseño actual ni sus reglas visuales. Son mocks: no tocan la app ni comparten código con ella. Cada una tiene su estética, su metáfora y su forma de moverse, y las tres recorren las mismas pantallas: inicio, rutina del día, sesión activa con descanso, llegada del top set, récord y resumen.

## Cómo abrirlos

Abre `mocks/exploracion/index.html` en el navegador del teléfono y entra por cualquiera de las tres puertas. No hay build ni servidor: son HTML, CSS y JS con rutas relativas. Las tipografías vienen de Google Fonts, así que la primera vez hace falta conexión (sin ella se ven con una tipografía de respaldo). Suenan y vibran: súbele el volumen.

Dentro de cada mock, la pestaña **MOCK** del borde derecho salta a cualquier pantalla, apaga el sonido, cambia el descanso entre acelerado y real, y vuelve al índice. También sirven los enlaces directos: `circo/index.html#topset`, `fundicion/index.html#descanso`, `arcade/index.html#resumen` (y `#inicio`, `#rutina`, `#sesion`, `#record`).

Por defecto el descanso corre acelerado hasta que faltan 10 segundos y de ahí sigue en tiempo real, para que se vea el final sin esperar tres minutos.

Aviso: la publicación automática del repo (GitHub Pages) solo sube la carpeta `ifbb-pro-agent/`, así que estos mocks no quedan en la web publicada. Para verlos en el teléfono hay que abrir los archivos o servir esta carpeta.

## Qué es real y qué es inventado

- **Real**: el plan (Día 1 · Torso del perfil de referencia de Oscar: definición, Classic Physique, 5 días), sus ejercicios, series, rangos de repeticiones, descansos, el top set con sus back-off, la rutina corta de 30 minutos, la marca "Evidencia por verificar" y los niveles de evidencia de las reglas. Todo salió del generador de la app y está en `comun/datos.js`.
- **Inventado**: las cargas de la "última vez", las cargas sugeridas de hoy y las sesiones de la semana pasada. Hacen falta para mostrar comparaciones y el récord.
- **Los eventos**: `comun/motor.js` imita en pequeño lo que hace la pantalla de sesión de la app: registrar una serie arranca su descanso; el descanso tiene sus últimos 10 segundos, su cero con tres tonos y vibración, "+30 s" y "Saltar"; el top set dispara el récord si supera el 1RM estimado de los anteriores; un back-off que pesa más del 90 % del top set se guarda como serie de trabajo; y al terminar salen las series hechas, los minutos reales, los top sets del día y lo que quedó pendiente.
- **Fuera de esta exploración**: registrar dolor, cambiar la variante de un ejercicio, editar o borrar una serie y reanudar una sesión guardada.

## Las tres direcciones

### El Gran Circo del Hierro (`circo/`)

La sesión es una función de forzudos de feria, impresa como un cartel de tipos de madera con el registro corrido: rojo, azul y amarillo sobre papel. Cada ejercicio es un número del programa, el top set es el número principal y el descanso es el intermedio. Funciona para quien entrena porque convierte lo que ya hace en un espectáculo con público: antes del top set hay un maestro de ceremonias (con voz) que anuncia la marca a batir, y cada serie se mide en un martillo de feria que sube según cómo quedó frente a la última vez; si la iguala o la supera, suena la campana. Lo que dispara sus animaciones: registrar una serie lanza el taco del martillo, levanta la haltera y prende la luz de esa serie; el descanso cierra el telón y cuelga el cartel del intermedio, cuyas bombillas se apagan con el tiempo; los últimos 10 segundos traen redoble y telón que tiembla; el cero abre el telón con platillo, los tres tonos y la vibración; llegar al top set apaga la sala y enciende los focos; el récord es un apagón con redoble, destello, papelitos, fanfarria y aplauso; el aviso del back-off pesado lo dice el pregonero; y el resumen es el cartel de la mañana siguiente, con sellos que caen uno a uno.

### Fundición (`fundicion/`)

El peso es materia y la pantalla tiene gravedad. Acero remachado, pintura de plantilla y metal al rojo. La rutina es una orden de colada con un lingote por serie, la barra se dibuja con sus discos de colores reales y la serie se registra golpeando un yunque. Funciona para quien entrena porque todo lo que importa se puede tocar y pesa: la barra cargada se lee de un vistazo, el descanso se entiende sin leer el reloj porque la pantalla entera se enfría de blanco a negro, y el trabajo hecho se acumula a la vista. Lo que dispara sus animaciones: cambiar el peso calza o saca discos con su golpe; registrar una serie es un martillazo con chispas, sacudida y un disco al rojo que cae al foso y se enfría; en el top set hay que mantener apretado para cargar el golpe; el descanso es la pieza enfriándose, "+30 s" aviva el fuego y "Saltar" la mete al agua con vapor; los últimos 10 segundos marcan cada segundo; el cero es el temple, con los tres tonos; llegar al top set es la colada que inunda la pantalla; el récord se acuña letra a letra en una placa; empezar la sesión exige mantener apretado para encender el horno; y el resumen deja caer todos los discos del día mientras sube el contador de kilos movidos. El montón se puede tocar y se mueve al inclinar el teléfono.

### Jefe Final (`arcade/`)

La sesión es una fase de un juego de rol de 16 bits. Todo se mueve a saltos, con píxeles gordos, ventanas de menú y un tubo de televisor por encima. Cada ejercicio es un enemigo con tantos puntos de vida como series, el top set es el jefe y el descanso es la hoguera donde se guarda la partida. Funciona para quien entrena porque el lenguaje del juego ya explica el entrenamiento sin enseñarlo: la barra de vida es lo que falta, el daño son los kilos por repeticiones de la serie, la racha cuenta las series seguidas que igualan o superan la última vez y la barra de energía es el descanso. Lo que dispara sus animaciones: registrar una serie es un ataque con número de daño, destello y un segmento menos de vida; terminar un ejercicio hace caer al enemigo y suelta monedas; el descanso lleva a la hoguera, donde se lee "sesión guardada" (la app guarda la sesión en cada cambio) y la energía se llena por segmentos; los últimos 10 segundos son una cuenta atrás gigante de máquina recreativa; el cero suena con los tres tonos en onda cuadrada; llegar al top set es la alerta de jefe con sirena y franjas de peligro; el golpe del top set tiene corte de cámara; el récord llena la barra del 1RM estimado del valor anterior al nuevo; la marca "Evidencia por verificar" aparece como una ficha "???" del bestiario; y el resumen es el recuento de fase con su rango.

## Archivos

- `index.html`: la entrada, con las tres puertas y atajos a cada pantalla.
- `comun/datos.js`: plan real e historial inventado. `comun/motor.js`: los eventos de la sesión. `comun/sonido.js`: sintetizador, vibración y voz. `comun/menu.js`: la pestaña MOCK.
- `circo/`, `fundicion/`, `arcade/`: cada una con su `index.html`, `estilo.css` y `mock.js`.
