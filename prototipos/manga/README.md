# Modo sesión · dirección "manga de acción" (prototipo)

Prototipo visual, independiente de la app: un solo `index.html`, sin frameworks, sin red, datos fijos (Día 2 · Pierna, sentadilla trasera). No toca el generador, el validador ni `sessionStore`.

Flujo: top set 100 kg × 5 → marco de impacto → descanso 3:00 con frase → back-off 1 de 3 a 90 kg → cierre.

## Qué decidí y por qué

- **Viñetas con borde grueso inclinado** (dos capas recortadas con `clip-path`), tramas de puntos y líneas de velocidad hechas con gradientes **estáticos**. Nada de blur ni sombras animadas: solo se animan `transform` y `opacity`.
- **Reposo sobrio, hito explosivo.** Las pantallas normales son tinta blanca sobre negro puro (AMOLED) con una trama tenue. El golpe grande existe **solo** en el top set; el back-off recibe un tajo diagonal y un "¡Tac!" de 0,5 s.
- **Ámbar solo en el top set** (peso, borde, botón, onomatopeya). Blanco para todo lo demás. El rojo está definido pero no se usa: no hay errores reales en este flujo.
- **Impacto en tres tiempos:** un cuadro blanco con rayos negros (la "pantalla invertida", 1 cuadro de opacidad, no un `filter`), luego rayos blancos sobre negro, la onomatopeya con rebote y el temblor decayendo (~0,4 s). La reacción seca ("Bien. Ahora el back-off.") entra después, ya en silencio visual: el contraste espectáculo/reacción es lo que da el tono. Se puede saltar con un toque pasados 0,5 s.
- **Frases:** 13 en dos grupos. Las de "top" hablan de lo que viene (back-off); las "generales" sirven tras cualquier serie. Cada grupo rota en orden, con arranque al azar, para no repetir seguido.
- **Onomatopeya en español** ("¡Doom!", "¡Tac!") y tipografía del sistema (Impact/condensada, con alternativas). Sin fuentes externas, para que siga funcionando sin conexión. Costo: la tipografía varía según el teléfono.
- **Vibración** (`navigator.vibrate`): patrón largo en el top set, un toque corto en series normales. **Sonido** sintetizado con Web Audio (sin archivos), **apagado de entrada**, con interruptor "Sonido/Mudo". Las dos preferencias se guardan en el dispositivo.
- **Reduced motion:** sin temblor, sin destello ni escalado; el impacto es un fundido con las líneas fijas, y la vibración arranca apagada.
- **Accesibilidad:** todos los botones ≥ 44 px (principales 68 px), texto blanco sobre negro (21:1), gris de apoyo 9,9:1, negro sobre ámbar 11:1, foco visible. El descanso usa marca de tiempo, así no se desfasa si la pantalla se apaga.

## Cómo verlo

Local: abrir `index.html`. En el teléfono: `https://posio07.github.io/Training-Agent/prototipos/manga/` (lo publica `.github/workflows/pages-prototipo.yml` desde la rama `prototipo-manga`).

## Pendiente de validar en el A57

No lo pude medir en el teléfono: la fluidez del impacto (capas con máscara de gradiente escaladas) y cómo se ve la tipografía real. Si hay tirones, el primer sospechoso es la máscara de las líneas de velocidad; se cambia por una imagen SVG pre-renderizada.
