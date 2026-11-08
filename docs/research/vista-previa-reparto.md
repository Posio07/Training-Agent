# Vista previa del reparto nuevo (paso 2)

Generada con `node scripts/vista-previa-reparto.js --md`. A = motor actual · B = reparto nuevo con el catálogo viejo emulado · C = reparto nuevo con el catálogo nuevo. **A→B es el efecto del reparto; B→C es el efecto del catálogo.** Las series de "cubierto" son fraccionadas (directa 1, indirecta 0,5). Los perfiles de referencia no son los datos reales de Emanuel ni de su pareja (viven en el dispositivo); para verlos, exportar el perfil a JSON y pasarlo como argumento.

## Emanuel (referencia: perfil de engine.test.js) · 5 días · physique_m · cut · intermediate · rezagados: Cuádriceps, Isquiotibiales, Glúteos

### Sesiones (series y minutos)
| Sesión | A series | A min | B series | B min | C series | C min usados | C min disponibles | C usado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Día 1 · Torso → Día 1 · Torso | 25 | 72 | 19 | 46 | 19 | 46 | 75 | 61 % |
| Día 2 · Pierna → Día 2 · Pierna (sentadilla) | 24 | 82 | 22 | 50 | 22 | 50 | 75 | 67 % |
| Día 3 · Empuje → Día 3 · Empuje | 24 | 57 | 18 | 44 | 18 | 44 | 75 | 59 % |
| Día 4 · Tirón → Día 4 · Tirón | 22 | 53 | 18 | 44 | 18 | 44 | 75 | 59 % |
| Día 5 · Pierna → Día 5 · Pierna (bisagra) | 21 | 75 | 24 | 54 | 24 | 54 | 75 | 72 % |
| **Total semana** | 116 | 339 | 101 | 238 | 101 | 238 | 375 | 63 % |

**Cómo leer los totales:** A es el motor actual (116 series y 339 min por semana); B y C son el reparto nuevo (101 series y 238 min por semana). Los minutos de A son los que estima el motor actual con sus descansos; los de B y C, con los descansos del registro.

### Series fraccionadas por semana y músculo
| Músculo | Necesidad | Piso | A | B | C | A→B (reparto) | B→C (catálogo) | Falta en C |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pecho | 12 | 10 | 12 | 12 | 12 | +0 | +0 | — |
| Espalda | 15 | 10 | 15 | 15 | 15 | +0 | +0 | — |
| Hombros | 15 | 10 | 23.5 | 18 | 18 | -5.5 | +0 | — |
| Cuádriceps | 15 | 10 | 19 | 15 | 15 | -4 | +0 | — |
| Isquiotibiales | 15 | 10 | 15 | 15 | 15 | +0 | +0 | — |
| Glúteos | 15 | 10 | 22.5 | 15 | 15 | -7.5 | +0 | — |
| Pantorrillas | 7 | 5 | 7 | 7 | 7 | +0 | +0 | — |
| Bíceps | 7 | 5 | 12 | 7 | 7 | -5 | +0 | — |
| Tríceps | 7 | 5 | 14.5 | 7 | 7 | -7.5 | +0 | — |
| Abdomen | 9 | 5 | 9 | 9 | 9 | +0 | +0 | — |

### Series directas (garantía de series reales de los grupos mayores, DEC-014)
| Músculo | Piso | A | B | C |
| --- | --- | --- | --- | --- |
| Pecho | 10 | 12 | 12 | 12 |
| Espalda | 10 | 15 | 15 | 15 |
| Hombros | 10 | 15 | 10 | 10 |
| Cuádriceps | 10 | 15 | 15 | 15 |
| Isquiotibiales | 10 | 15 | 15 | 15 |
| Glúteos | 10 | 15 | 13 | 13 |

### Ejercicios por sesión
**Día 1 · Torso**
- A: ★Press banca con barra ×3 · Press inclinado con mancuernas ×3 · Dominadas o jalón al pecho ×4 · Remo con apoyo de pecho (máquina o banco inclinado) ×4 · Press militar con barra o mancuernas ×3 · Elevaciones laterales con mancuerna ×2 · Curl con barra o barra Z ×3 · Extensión de tríceps en polea ×3
- B: Día 1 · Torso: ★Press banca con barra ×4 · Remo con apoyo de pecho (máquina o banco inclinado) ×2 · Curl con barra o barra Z ×3 · Aperturas en polea o pec-deck ×4 · Elevaciones laterales con mancuerna ×2 · Pullover en polea ×4
- C: Día 1 · Torso: ★Press banca con barra ×4 · Remo con apoyo de pecho en máquina ×2 · Curl con barra ×3 · Aperturas en polea ×4 · Elevaciones laterales con mancuerna ×2 · Pullover en polea ×4

**Día 2 · Pierna**
- A: ★Sentadilla trasera o sentadilla en hack ×4 · Prensa de piernas ×4 · Sentadilla búlgara con énfasis en cadera ×4 · Hip thrust con barra ×4 · Curl femoral tumbado o sentado ×8
- B: Día 2 · Pierna (sentadilla): ★Sentadilla trasera o sentadilla en hack ×4 · Curl femoral tumbado o sentado ×6 · Abducción de cadera en máquina ×9 · Extensión de cuádriceps ×3
- C: Día 2 · Pierna (sentadilla): ★Sentadilla trasera ×4 · Curl femoral sentado ×6 · Abducción de cadera en máquina ×9 · Extensión de cuádriceps ×3

**Día 3 · Empuje**
- A: Fondos en paralelas o press en máquina ×3 · Press cerrado o fondos ×4 · Aperturas en polea o pec-deck ×3 · Elevaciones laterales en polea ×3 · Face pull / pájaros (deltoides posterior) ×2 · Crunch en polea o rueda abdominal ×3 · Elevaciones de piernas colgado ×2 · Elevación de talones de pie ×4
- B: Día 3 · Empuje: ★Press banca con barra ×4 · Press militar con barra o mancuernas ×2 · Extensión de tríceps en polea ×2 · Elevaciones laterales con mancuerna ×6 · Elevación de talones de pie ×4
- C: Día 3 · Empuje: ★Press banca con barra ×4 · Press militar con barra de pie ×2 · Extensión de tríceps en polea ×2 · Elevaciones laterales con mancuerna ×6 · Elevación de talones de pie ×4

**Día 4 · Tirón**
- A: ★Press militar con barra o mancuernas ×3 · Remo en polea baja o máquina ×4 · Pullover en polea ×3 · Elevaciones laterales con mancuerna ×2 · Vacuum abdominal (Classic / Physique) ×4 · Elevación de talones sentado ×3 · Curl inclinado con mancuernas ×3
- B: Día 4 · Tirón: ★Dominadas o jalón al pecho ×4 · Remo en polea baja o máquina ×2 · Crunch en polea o rueda abdominal ×9 · Pullover en polea ×3
- C: Día 4 · Tirón: ★Dominadas ×4 · Remo con apoyo de pecho en banco inclinado ×2 · Crunch en polea ×9 · Pullover en polea ×3

**Día 5 · Pierna**
- A: ★Peso muerto rumano ×4 · Zancadas o sentadilla búlgara ×4 · Prensa de piernas ×3 · Abducción de cadera en máquina ×4 · Patada de glúteo en polea ×3 · Curl femoral tumbado o sentado ×3
- B: Día 5 · Pierna (bisagra): ★Peso muerto rumano ×4 · Curl femoral tumbado o sentado ×5 · Elevación de talones de pie ×3 · Extensión de cuádriceps ×8 · Abducción de cadera en máquina ×4
- C: Día 5 · Pierna (bisagra): ★Peso muerto rumano ×4 · Curl femoral tumbado ×5 · Elevación de talones de pie ×3 · Extensión de cuádriceps ×8 · Abducción de cadera en máquina ×4

### Sensibilidad al tiempo disponible (C)
- 60 min por sesión: 19s/46m · 22s/50m · 18s/44m · 18s/44m · 24s/54m · sin cubrir: nada
- 75 min por sesión: 19s/46m · 22s/50m · 18s/44m · 18s/44m · 24s/54m · sin cubrir: nada
- 90 min por sesión: 19s/46m · 22s/50m · 18s/44m · 18s/44m · 24s/54m · sin cubrir: nada

## Pareja (referencia: bikini intermedia en definición) · 5 días · bikini_w · cut · intermediate · rezagados: Glúteos

### Sesiones (series y minutos)
| Sesión | A series | A min | B series | B min | C series | C min usados | C min disponibles | C usado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Día 1 · Torso → Día 1 · Torso | 21 | 58 | 14 | 36 | 14 | 36 | 75 | 48 % |
| Día 2 · Pierna → Día 2 · Pierna (sentadilla) | 19 | 65 | 18 | 44 | 18 | 44 | 75 | 59 % |
| Día 3 · Empuje → Día 3 · Empuje | 18 | 42 | 16 | 40 | 16 | 40 | 75 | 53 % |
| Día 4 · Tirón → Día 4 · Tirón | 16 | 40 | 15 | 38 | 15 | 38 | 75 | 51 % |
| Día 5 · Pierna → Día 5 · Pierna (bisagra) | 17 | 49 | 18 | 42 | 18 | 42 | 75 | 56 % |
| **Total semana** | 91 | 254 | 81 | 200 | 81 | 200 | 375 | 53 % |

**Cómo leer los totales:** A es el motor actual (91 series y 254 min por semana); B y C son el reparto nuevo (81 series y 200 min por semana). Los minutos de A son los que estima el motor actual con sus descansos; los de B y C, con los descansos del registro.

### Series fraccionadas por semana y músculo
| Músculo | Necesidad | Piso | A | B | C | A→B (reparto) | B→C (catálogo) | Falta en C |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pecho | 6 | 5 | 6 | 8 | 8 | +2 | +0 | — |
| Espalda | 12 | 10 | 12 | 12 | 12 | +0 | +0 | — |
| Hombros | 15 | 10 | 19 | 16 | 16 | -3 | +0 | — |
| Cuádriceps | 6 | 5 | 10 | 6 | 6 | -4 | +0 | — |
| Isquiotibiales | 15 | 10 | 15 | 15 | 15 | +0 | +0 | — |
| Glúteos | 15 | 10 | 18 | 15 | 15 | -3 | +0 | — |
| Pantorrillas | 7 | 5 | 7 | 7 | 7 | +0 | +0 | — |
| Bíceps | 4 | 5 | 8.5 | 6 | 6 | -2.5 | +0 | — |
| Tríceps | 4 | 5 | 10 | 7 | 7 | -3 | +0 | — |
| Abdomen | 7 | 5 | 7 | 7 | 7 | +0 | +0 | — |

### Series directas (garantía de series reales de los grupos mayores, DEC-014)
| Músculo | Piso | A | B | C |
| --- | --- | --- | --- | --- |
| Pecho | 5 | 6 | 8 | 8 |
| Espalda | 10 | 12 | 12 | 12 |
| Hombros | 10 | 15 | 10 | 10 |
| Cuádriceps | 5 | 6 | 6 | 6 |
| Isquiotibiales | 10 | 15 | 15 | 15 |
| Glúteos | 10 | 15 | 12 | 12 |

### Ejercicios por sesión
**Día 1 · Torso**
- A: ★Press banca con barra ×3 · Dominadas o jalón al pecho ×3 · Remo con apoyo de pecho (máquina o banco inclinado) ×3 · Press militar con barra o mancuernas ×3 · Elevaciones laterales con mancuerna ×2 · Elevación de talones sentado ×3 · Curl inclinado con mancuernas ×2 · Extensión de tríceps en polea ×2
- B: Día 1 · Torso: ★Press banca con barra ×4 · Remo con apoyo de pecho (máquina o banco inclinado) ×2 · Curl con barra o barra Z ×2 · Pullover en polea ×4 · Elevaciones laterales con mancuerna ×2
- C: Día 1 · Torso: ★Press banca con barra ×4 · Remo con apoyo de pecho en máquina ×2 · Curl con barra ×2 · Pullover en polea ×4 · Elevaciones laterales con mancuerna ×2

**Día 2 · Pierna**
- A: ★Sentadilla trasera o sentadilla en hack ×3 · Sentadilla búlgara con énfasis en cadera ×4 · Hip thrust con barra ×4 · Curl femoral tumbado o sentado ×8
- B: Día 2 · Pierna (sentadilla): ★Sentadilla trasera o sentadilla en hack ×6 · Curl femoral tumbado o sentado ×5 · Abducción de cadera en máquina ×7
- C: Día 2 · Pierna (sentadilla): ★Sentadilla trasera ×6 · Curl femoral sentado ×5 · Abducción de cadera en máquina ×7

**Día 3 · Empuje**
- A: Press inclinado con mancuernas ×3 · Press cerrado o fondos ×2 · Elevaciones laterales en polea ×3 · Face pull / pájaros (deltoides posterior) ×2 · Crunch en polea o rueda abdominal ×4 · Elevación de talones de pie ×4
- B: Día 3 · Empuje: ★Press banca con barra ×4 · Press militar con barra o mancuernas ×2 · Extensión de tríceps en polea ×2 · Elevaciones laterales con mancuerna ×4 · Elevación de talones de pie ×4
- C: Día 3 · Empuje: ★Press banca con barra ×4 · Press militar con barra de pie ×2 · Extensión de tríceps en polea ×2 · Elevaciones laterales con mancuerna ×4 · Elevación de talones de pie ×4

**Día 4 · Tirón**
- A: ★Press militar con barra o mancuernas ×3 · Remo en polea baja o máquina ×3 · Pullover en polea ×3 · Elevaciones laterales con mancuerna ×2 · Elevaciones de piernas colgado ×3 · Curl con barra o barra Z ×2
- B: Día 4 · Tirón: ★Dominadas o jalón al pecho ×4 · Remo en polea baja o máquina ×2 · Crunch en polea o rueda abdominal ×7 · Elevaciones laterales con mancuerna ×2
- C: Día 4 · Tirón: ★Dominadas ×4 · Remo con apoyo de pecho en banco inclinado ×2 · Crunch en polea ×7 · Elevaciones laterales con mancuerna ×2

**Día 5 · Pierna**
- A: ★Peso muerto rumano ×4 · Prensa de piernas ×3 · Abducción de cadera en máquina ×4 · Patada de glúteo en polea ×3 · Curl femoral tumbado o sentado ×3
- B: Día 5 · Pierna (bisagra): ★Peso muerto rumano ×4 · Curl femoral tumbado o sentado ×6 · Elevación de talones de pie ×3 · Abducción de cadera en máquina ×5
- C: Día 5 · Pierna (bisagra): ★Peso muerto rumano ×4 · Curl femoral tumbado ×6 · Elevación de talones de pie ×3 · Abducción de cadera en máquina ×5

### Sensibilidad al tiempo disponible (C)
- 60 min por sesión: 14s/36m · 18s/44m · 16s/40m · 15s/38m · 18s/42m · sin cubrir: nada
- 75 min por sesión: 14s/36m · 18s/44m · 16s/40m · 15s/38m · 18s/42m · sin cubrir: nada
- 90 min por sesión: 14s/36m · 18s/44m · 16s/40m · 15s/38m · 18s/42m · sin cubrir: nada

## Barrido de 360 planes (90 perfiles × 3, 4, 5 y 6 días) con el reparto nuevo y el catálogo nuevo

- Planes en que **R1 deja necesidad semanal sin cubrir**: 43 de 360 (11.9 %).
- Planes con algún aviso único (cualquier causa): 106 de 360 (29.4 %).
- Sesiones por encima de su capacidad: 0 (la restricción de capacidad no se rompe).
- Sesiones por encima de 11 series fraccionadas de un músculo: 0, todas por una demanda mínima que gana sobre R1 (DEC-025, punto 4); eventos registrados: 0.
- Minutos por sesión (promedio / máximo): 50.8 / 75.

| Músculo | Planes con necesidad sin cubrir por R1 | 3 días | 4 días | 5 días | 6 días |
| --- | --- | --- | --- | --- | --- |
| Pecho | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Espalda | 16 (4.4 %) | 0 de 90 | 0 de 90 | 8 de 90 | 8 de 90 |
| Hombros | 4 (1.1 %) | 0 de 90 | 4 de 90 | 0 de 90 | 0 de 90 |
| Cuádriceps | 10 (2.8 %) | 0 de 90 | 2 de 90 | 4 de 90 | 4 de 90 |
| Isquiotibiales | 12 (3.3 %) | 0 de 90 | 4 de 90 | 4 de 90 | 4 de 90 |
| Glúteos | 29 (8.1 %) | 3 de 90 | 12 de 90 | 10 de 90 | 4 de 90 |
| Pantorrillas | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Bíceps | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Tríceps | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Abdomen | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |

Músculos sin cubrir por causa (en grupo-planes): {"tiempo":257,"R1":71}.

## Indicadores del paso 2b (patrón principal, ejercicio directo, hip thrust, R1 por días, minutos)

- **Series del patrón principal** (1620 sesiones): 4 series: 1490 (92 %) · 5 series: 97 (6 %) · 6 series: 17 (1 %) · 7 series: 16 (1 %). Con la mínima en 4, las sesiones que no llegan son las que no caben en el tiempo.
- **Cobertura directa de Bíceps**: 360 de 360 planes (100 %) con al menos un ejercicio directo de 2 series o más; series directas por semana (promedio / mínimo / máximo): 3 / 2 / 8; fraccionadas (promedio): 7.3.
- **Cobertura directa de Tríceps**: 360 de 360 planes (100 %) con al menos un ejercicio directo de 2 series o más; series directas por semana (promedio / mínimo / máximo): 3 / 2 / 8; fraccionadas (promedio): 7.6.
- **Cobertura directa de Pantorrillas**: 360 de 360 planes (100 %) con al menos un ejercicio directo de 2 series o más; series directas por semana (promedio / mínimo / máximo): 7.7 / 4 / 11; fraccionadas (promedio): 7.7.
- **Cobertura directa de Abdomen**: 360 de 360 planes (100 %) con al menos un ejercicio directo de 2 series o más; series directas por semana (promedio / mínimo / máximo): 7.6 / 2 / 13; fraccionadas (promedio): 7.6.
- **Hip thrust**: aparece en 0 de 1620 sesiones; en los 72 planes de bikini: 0; en los 252 planes con énfasis en glúteos (bikini, wellness, figure o glúteos rezagados): 0. En los dos perfiles de referencia: Emanuel: 0 · Pareja: 0.

| Días | Planes | R1 deja necesidad sin cubrir | Con algún aviso único | Minutos usados por sesión (promedio / máximo) | Capacidad usada (promedio) | Sesiones al 90 % o más del tiempo |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 90 | 3 (3.3 %) | 52 (57.8 %) | 69.3 / 75 | 92.5 % | 181 |
| 4 | 90 | 14 (15.6 %) | 28 (31.1 %) | 56.7 / 75 | 75.6 % | 83 |
| 5 | 90 | 14 (15.6 %) | 14 (15.6 %) | 47.2 / 75 | 63 % | 22 |
| 6 | 90 | 12 (13.3 %) | 12 (13.3 %) | 40.5 / 75 | 53.9 % | 20 |

### Espalda y R1 a 5 y 6 días

- 3 días: la espalda puede entrar en 3 de 3 sesiones (Día 1 · Cuerpo completo A (sentadilla); Día 2 · Cuerpo completo B (empuje); Día 3 · Cuerpo completo C (bisagra)). Con R1 en 11 series fraccionadas por sesión, el techo semanal de la espalda es 33.
- 4 días: la espalda puede entrar en 2 de 4 sesiones (Día 1 · Torso A; Día 3 · Torso B). Con R1 en 11 series fraccionadas por sesión, el techo semanal de la espalda es 22.
- 5 días: la espalda puede entrar en 2 de 5 sesiones (Día 1 · Torso; Día 4 · Tirón). Con R1 en 11 series fraccionadas por sesión, el techo semanal de la espalda es 22.
- 6 días: la espalda puede entrar en 2 de 6 sesiones (Día 2 · Tirón A; Día 5 · Tirón B). Con R1 en 11 series fraccionadas por sesión, el techo semanal de la espalda es 22.

Planes con la espalda sin cubrir por R1: 16. Necesidad de espalda de esos planes: 23 series; cubierto: 22. Perfiles: advanced/classic_m/bulk, advanced/physique_m/bulk, advanced/classic_m/maintain, advanced/physique_m/maintain.
Por días: {"5":8,"6":8}.
- **Hipótesis (no está en el código)**: si el día de empuje de los splits de 5 y 6 días también pudiera alojar espalda, la espalda quedaría sin cubrir por R1 en 0 planes (hoy 16).

### Hip thrust: por qué no se elige

- Aporte por serie a glúteos: hip thrust 1 · abducción de cadera en máquina 1 · patada de glúteo en polea 1 · sentadilla trasera 0.5 (indirecta, verificada). Segundos por serie (descanso + 45 s): hip thrust 195 · abducción 120 · patada 240.
- Con "necesidad por minuto", la abducción rinde 8.3 contra 5.1 del hip thrust (por cada 1000 s): siempre gana la abducción, en todos los perfiles. Para que el hip thrust empatara tendría que durar 120 s por serie. Subir el aporte de la sentadilla a glúteos (indirecta → directa) no ayuda: el hip thrust compite con la abducción, no con la sentadilla. Acortar el descanso del hip thrust sin respaldo por ejercicio sería un peso a medida (E4).
- **Propuesta (nivel 2, sin implementar):** una regla de estructura análoga a la del ejercicio directo: todo grupo mayor lleva por semana al menos un **multiarticular directo** con 2 series o más. Para glúteos sería el hip thrust (o la búlgara con énfasis en cadera); los demás grupos mayores ya la cumplen. Costo: sesiones de pierna algo más largas y un criterio de diseño más (E4).

### Espalda sin cubrir por R1 a 5 y 6 días: cómo corregirlo sin aflojar R1

- La espalda entra en solo 2 sesiones de los splits de 5 y 6 días, así que con R1 en 11 su techo semanal es 22 series fraccionadas. Los 16 planes afectados son de nivel avanzado, con énfasis en espalda (classic y physique) en volumen o mantenimiento: necesitan 23. Es un problema de cómo se arma el split, no de R1.
- **Opción A (recomendada):** regla de exposición. Si la necesidad de un grupo supera lo que caben sus sesiones bajo R1 (sesiones × 11), el día de empuje de los splits de 5 y 6 días aloja también ese grupo (un tirón horizontal de apoyo). Solo afecta a esos 16 planes y la hipótesis de arriba la deja en 0 planes sin cubrir. Costo: un criterio de diseño más (E4) y un día de empuje con un tirón en esos casos.
- **Opción B:** cambiar el split de 5 días a torso, pierna, torso, tirón, pierna (más espalda para todos). Costo: cambia el plan de todos los perfiles de 5 días y se pierde el día de empuje dedicado.
- **Opción C:** dejarlo como aviso (23 contra 22: una serie de diferencia) y que el usuario decida. Costo: 16 planes con aviso por una serie.
