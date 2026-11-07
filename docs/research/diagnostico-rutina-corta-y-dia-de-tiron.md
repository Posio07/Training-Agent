# Diagnóstico: rutina corta (1 o 0 ejercicios) y día de tirón (press militar con top set, pocos tirones)

Fecha 2026-11-07, sobre `main` tras el PR #32. **Solo se busca la causa: no se arregló nada y no se tocó el motor.** Las cifras salen de ejecutar el generador sobre el barrido de 90 perfiles (los mismos de `scripts/simular-reglas-articulares.js`) a 5 y 6 días, y sobre los perfiles de referencia de `tests/fixtures/plan-identity-baseline.json`.

## 1. Rutina corta ("Versión corta")

**Qué hace hoy.** En `js/app.js` (`buildSmExercises`, línea 967): `list = session.exercises.filter(e => e.type === 'compound').slice(0, 2)`, es decir, **los dos primeros multiarticulares del día, en el orden del plan**. Si la lista queda vacía, `startSessionMode` muestra "Este día no tiene multiarticulares para la versión corta" y no empieza. La versión corta **no existe en el generador**: el comentario de `app.js` lo dice ("no toca plan.training; es solo una forma distinta de mostrarlo").

**Por qué salen 1 o 0 ejercicios.**
1. **El día tiene menos de 2 multiarticulares.** El reparto toma los ejercicios rotando por el catálogo de cada grupo y la lista de cada grupo pone primero los multiarticulares y al final los aislamientos. En la segunda aparición semanal de un grupo (la que cae en el día "B" o en el de empuje o tirón de los splits de 5 y 6 días) la rotación entrega, por ejemplo, `[remo en polea baja, pullover]` en espalda o `[fondos, aperturas]` en pecho: un multiarticular y un aislamiento. Con el hombro, a partir de la segunda aparición solo salen aislamientos.
2. **El día no tiene ninguno.** Solo ocurre con una **lesión declarada**: las exclusiones por zona (DEC-009, capa 3) quitan patrones multiarticulares del catálogo y la rotación se queda con aislamientos.
3. **Además**, con 2 ejercicios la versión corta puede entrenar un solo grupo: en el día de pierna los dos primeros multiarticulares son sentadilla y prensa (ambos cuádriceps) y no entran isquios ni glúteos (perfiles de referencia: `Pierna: squat_back_or_hack + leg_press` en los 10).

**Cuántos días quedan con menos de 2 (sin lesiones, barrido de 90 perfiles por split).**

| Día | Perfiles con 1 multiarticular (de 90) |
| --- | --- |
| 5 días · Tirón | 44 |
| 6 días · Tirón B | 90 |
| 6 días · Empuje B | 34 |
| Todos los días de 3 y 4 días, y los demás de 5 y 6 | 0 (siempre 2 o más) |

Es decir, 168 de 1620 sesiones tienen una versión corta de **1** ejercicio. En el perfil de referencia de Emanuel a 5 días, el Tirón tiene 1 multiarticular (los demás días, 2 o más).

**Con lesión declarada (0 multiarticulares), perfiles de 90 por zona:** hombro: Empuje de 5 días en 10, Empuje B de 6 días en 14; muñeca: Empuje B de 6 días en 4; espalda baja: Pierna B de 4, 5 y 6 días en 5; cadera: Pierna B en 7. **Sin ninguna lesión el mínimo es 1, nunca 0.** Si la observación de "2 y 0 ejercicios" viene de un perfil de Emanuel, tiene que ser un perfil con alguna lesión declarada; con el perfil de referencia sin lesiones no se puede reproducir el 0.

## 2. Día de tirón: press militar con top set y solo 2 tirones

Ejemplo (`oscar_cut_classic_5d`, definición): `Tirón: ★ press militar ×3, remo en polea baja ×4, pullover ×3, elevaciones laterales ×2, elevación de piernas colgado ×3, elevación de talones sentado ×3, curl con barra ×4` (★ = top set).

**Causa 1: el press militar está en el día de tirón.** El split de 5 días pone el hombro en tres días (Torso, Empuje y Tirón: el hombro posterior y lateral va con el tirón). El catálogo de hombro tiene 4 ejercicios (press militar y tres aislamientos; el press landmine solo entra con lesión) y cada día toma 1 o 2 por rotación (`[lib[i], lib[i+1]]` con módulo). En la tercera aparición la rotación **da la vuelta** y vuelve al principio de la lista, que es el press militar. El reparto no sabe si el día es de empuje o de tirón: la rotación no tiene noción de función. **Medido:** en el Tirón de 5 días hay press militar en 46 de los 90 perfiles. En el Tirón A y B de 6 días no aparece en ninguno de los 90 (el hombro cae en menos días).

**Causa 2: por qué lleva el top set.** En definición, el top set va al primer ejercicio **elegible** del día (lista cerrada de 6 patrones: sentadilla, press de banca, press militar, rumano, remo con barra, dominadas o jalón). El día de tirón no tiene ningún otro elegible porque los dos de espalda que tocan son `remo en polea baja` y `pullover`, que no están en la lista. Entonces el press militar pasa al frente con top set. **Medido:** en los 30 perfiles de definición, el Tirón de 5 días lleva top set en 14 y **en 14 ese top set es el press militar** (en los otros 16 no hay ejercicio elegible y el día no lleva top set). En el Tirón B de 6 días ninguno de los 30 lleva top set.

**Causa 3: solo 2 ejercicios de tirón (y uno es aislamiento).** El generador pone **como máximo 2 ejercicios por grupo y día** (con 4 o menos series, uno). La espalda aparece solo 2 veces por semana en el split de 5 días (Torso y Tirón). La rotación de espalda entrega en la primera aparición `[dominada o jalón, remo con apoyo de pecho]` (Torso) y en la segunda `[remo en polea baja, pullover]` (Tirón). **Medido:** en el Tirón de 5 días y en el Tirón B de 6 días hay **siempre 1 multiarticular de espalda** (en 84 de 90 hay 2 ejercicios de espalda; en 6, uno) y **0 dominadas o jalones**. Solo el Tirón A de 6 días trae dominada o jalón más remo.

**Cómo se combinan.** El orden A1 (lumbar alta primero) no mueve el press militar (es lumbar media); el paso del top set corre después y lo lleva al frente, así que dos ordenamientos distintos se apilan y el último gana.

## 3. Raíz común
Ninguno de los dos problemas es un error de un paso: salen de que **la selección de ejercicios es una rotación por grupo sin función del día ni cobertura** (qué debe tener un día de tirón, o qué debe cubrir una sesión corta). La versión corta vive en la interfaz, el top set se asigna después sobre lo que haya, y el tope de ejercicios por grupo y día limita lo que un día de tirón puede contener. Es el tipo de cosa que la spec del núcleo debe definir de forma explícita (ver hallazgos 1 y 4 de `docs/research/inventario-generador.md`).
