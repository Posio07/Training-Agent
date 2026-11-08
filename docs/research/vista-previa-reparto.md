# Vista previa del reparto nuevo (paso 2)

Generada con `node scripts/vista-previa-reparto.js --md`. A = motor actual · B = reparto nuevo con el catálogo viejo emulado · C = reparto nuevo con el catálogo nuevo. **A→B es el efecto del reparto; B→C es el efecto del catálogo.** Las series de "cubierto" son fraccionadas (directa 1, indirecta 0,5). Los perfiles de referencia no son los datos reales de Emanuel ni de su pareja (viven en el dispositivo); para verlos, exportar el perfil a JSON y pasarlo como argumento.

## Emanuel (referencia: perfil de engine.test.js) · 5 días · physique_m · cut · intermediate · rezagados: Cuádriceps, Isquiotibiales, Glúteos

### Sesiones (series y minutos)
| Sesión | A series | A min | B series | B min | C series | C min |
| --- | --- | --- | --- | --- | --- | --- |
| Día 1 · Torso → Día 1 · Torso | 25 | 72 | 18 | 42 | 18 | 42 |
| Día 2 · Pierna → Día 2 · Pierna (sentadilla) | 24 | 82 | 22 | 47 | 22 | 47 |
| Día 3 · Empuje → Día 3 · Empuje | 24 | 57 | 22 | 50 | 22 | 50 |
| Día 4 · Tirón → Día 4 · Tirón | 22 | 53 | 21 | 48 | 21 | 48 |
| Día 5 · Pierna → Día 5 · Pierna (bisagra) | 21 | 75 | 22 | 47 | 22 | 47 |
| **Total semana** | 116 | 339 | 105 | 234 | 105 | 234 |

### Series fraccionadas por semana y músculo
| Músculo | Necesidad | Piso | A | B | C | A→B (reparto) | B→C (catálogo) | Falta en C |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pecho | 12 | 10 | 12 | 12 | 12 | +0 | +0 | — |
| Espalda | 15 | 10 | 15 | 15 | 15 | +0 | +0 | — |
| Hombros | 15 | 10 | 23.5 | 17 | 17 | -6.5 | +0 | — |
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
| Glúteos | 10 | 15 | 14 | 14 |

### Ejercicios por sesión
**Día 1 · Torso**
- A: ★Press banca con barra ×3 · Press inclinado con mancuernas ×3 · Dominadas o jalón al pecho ×4 · Remo con apoyo de pecho (máquina o banco inclinado) ×4 · Press militar con barra o mancuernas ×3 · Elevaciones laterales con mancuerna ×2 · Curl con barra o barra Z ×3 · Extensión de tríceps en polea ×3
- B: Día 1 · Torso: ★Press banca con barra ×2 · Remo con apoyo de pecho (máquina o banco inclinado) ×2 · Aperturas en polea o pec-deck ×4 · Elevaciones laterales con mancuerna ×3 · Pullover en polea ×2 · Elevación de talones de pie ×3 · Extensión de tríceps en polea ×2
- C: Día 1 · Torso: ★Press banca con barra ×2 · Remo con apoyo de pecho en máquina ×2 · Aperturas en polea ×4 · Elevaciones laterales con mancuerna ×3 · Pullover en polea ×2 · Elevación de talones de pie ×3 · Extensión de tríceps en polea ×2

**Día 2 · Pierna**
- A: ★Sentadilla trasera o sentadilla en hack ×4 · Prensa de piernas ×4 · Sentadilla búlgara con énfasis en cadera ×4 · Hip thrust con barra ×4 · Curl femoral tumbado o sentado ×8
- B: Día 2 · Pierna (sentadilla): ★Sentadilla trasera o sentadilla en hack ×2 · Curl femoral tumbado o sentado ×7 · Extensión de cuádriceps ×6 · Abducción de cadera en máquina ×7
- C: Día 2 · Pierna (sentadilla): ★Sentadilla trasera ×2 · Curl femoral sentado ×7 · Extensión de cuádriceps ×6 · Abducción de cadera en máquina ×7

**Día 3 · Empuje**
- A: Fondos en paralelas o press en máquina ×3 · Press cerrado o fondos ×4 · Aperturas en polea o pec-deck ×3 · Elevaciones laterales en polea ×3 · Face pull / pájaros (deltoides posterior) ×2 · Crunch en polea o rueda abdominal ×3 · Elevaciones de piernas colgado ×2 · Elevación de talones de pie ×4
- B: Día 3 · Empuje: ★Press banca con barra ×2 · Press militar con barra o mancuernas ×2 · Aperturas en polea o pec-deck ×4 · Elevaciones laterales con mancuerna ×3 · Elevación de talones de pie ×4 · Extensión de tríceps en polea ×2 · Crunch en polea o rueda abdominal ×5
- C: Día 3 · Empuje: ★Press banca con barra ×2 · Press militar con barra de pie ×2 · Aperturas en polea ×4 · Elevaciones laterales con mancuerna ×3 · Elevación de talones de pie ×4 · Extensión de tríceps en polea ×2 · Crunch en polea ×5

**Día 4 · Tirón**
- A: ★Press militar con barra o mancuernas ×3 · Remo en polea baja o máquina ×4 · Pullover en polea ×3 · Elevaciones laterales con mancuerna ×2 · Vacuum abdominal (Classic / Physique) ×4 · Elevación de talones sentado ×3 · Curl inclinado con mancuernas ×3
- B: Día 4 · Tirón: ★Dominadas o jalón al pecho ×2 · Remo en polea baja o máquina ×2 · Pullover en polea ×7 · Elevaciones laterales con mancuerna ×2 · Curl con barra o barra Z ×4 · Crunch en polea o rueda abdominal ×4
- C: Día 4 · Tirón: ★Dominadas ×2 · Remo con apoyo de pecho en banco inclinado ×2 · Pullover en polea ×7 · Elevaciones laterales con mancuerna ×2 · Curl con barra ×4 · Crunch en polea ×4

**Día 5 · Pierna**
- A: ★Peso muerto rumano ×4 · Zancadas o sentadilla búlgara ×4 · Prensa de piernas ×3 · Abducción de cadera en máquina ×4 · Patada de glúteo en polea ×3 · Curl femoral tumbado o sentado ×3
- B: Día 5 · Pierna (bisagra): ★Peso muerto rumano ×2 · Curl femoral tumbado o sentado ×6 · Extensión de cuádriceps ×7 · Abducción de cadera en máquina ×7
- C: Día 5 · Pierna (bisagra): ★Peso muerto rumano ×2 · Curl femoral tumbado ×6 · Extensión de cuádriceps ×7 · Abducción de cadera en máquina ×7

### Sensibilidad al tiempo disponible (C)
- 60 min por sesión: 18s/42m · 22s/47m · 22s/50m · 21s/48m · 22s/47m · sin cubrir: nada
- 75 min por sesión: 18s/42m · 22s/47m · 22s/50m · 21s/48m · 22s/47m · sin cubrir: nada
- 90 min por sesión: 18s/42m · 22s/47m · 22s/50m · 21s/48m · 22s/47m · sin cubrir: nada
- Hipótesis (no es regla): patrón principal con 4 series como mínimo: 21s/50m · 22s/50m · 17s/42m · 20s/48m · 21s/48m
  - Día 1 · Torso: ★Press banca con barra ×4 · Remo con apoyo de pecho en máquina ×2 · Aperturas en polea ×4 · Elevaciones laterales con mancuerna ×2 · Pullover en polea ×2 · Curl con barra ×3 · Crunch en polea ×4
  - Día 2 · Pierna (sentadilla): ★Sentadilla trasera ×4 · Curl femoral sentado ×6 · Extensión de cuádriceps ×5 · Abducción de cadera en máquina ×7
  - Día 3 · Empuje: ★Press banca con barra ×4 · Press militar con barra de pie ×2 · Elevaciones laterales con mancuerna ×6 · Elevación de talones de pie ×3 · Extensión de tríceps en polea ×2
  - Día 4 · Tirón: ★Dominadas ×4 · Remo con apoyo de pecho en banco inclinado ×2 · Pullover en polea ×5 · Elevación de talones de pie ×4 · Crunch en polea ×5
  - Día 5 · Pierna (bisagra): ★Peso muerto rumano ×4 · Curl femoral tumbado ×5 · Extensión de cuádriceps ×6 · Abducción de cadera en máquina ×6

## Pareja (referencia: bikini intermedia en definición) · 5 días · bikini_w · cut · intermediate · rezagados: Glúteos

### Sesiones (series y minutos)
| Sesión | A series | A min | B series | B min | C series | C min |
| --- | --- | --- | --- | --- | --- | --- |
| Día 1 · Torso → Día 1 · Torso | 21 | 58 | 16 | 38 | 16 | 38 |
| Día 2 · Pierna → Día 2 · Pierna (sentadilla) | 19 | 65 | 18 | 39 | 18 | 39 |
| Día 3 · Empuje → Día 3 · Empuje | 18 | 42 | 14 | 34 | 14 | 34 |
| Día 4 · Tirón → Día 4 · Tirón | 16 | 40 | 16 | 40 | 16 | 40 |
| Día 5 · Pierna → Día 5 · Pierna (bisagra) | 17 | 49 | 17 | 37 | 17 | 37 |
| **Total semana** | 91 | 254 | 81 | 188 | 81 | 188 |

### Series fraccionadas por semana y músculo
| Músculo | Necesidad | Piso | A | B | C | A→B (reparto) | B→C (catálogo) | Falta en C |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pecho | 6 | 5 | 6 | 6 | 6 | +0 | +0 | — |
| Espalda | 12 | 10 | 12 | 12 | 12 | +0 | +0 | — |
| Hombros | 15 | 10 | 19 | 15 | 15 | -4 | +0 | — |
| Cuádriceps | 6 | 5 | 10 | 6 | 6 | -4 | +0 | — |
| Isquiotibiales | 15 | 10 | 15 | 15 | 15 | +0 | +0 | — |
| Glúteos | 15 | 10 | 18 | 15 | 15 | -3 | +0 | — |
| Pantorrillas | 7 | 5 | 7 | 7 | 7 | +0 | +0 | — |
| Bíceps | 4 | 5 | 8.5 | 6 | 6 | -2.5 | +0 | — |
| Tríceps | 4 | 5 | 10 | 5 | 5 | -5 | +0 | — |
| Abdomen | 7 | 5 | 7 | 7 | 7 | +0 | +0 | — |

### Series directas (garantía de series reales de los grupos mayores, DEC-014)
| Músculo | Piso | A | B | C |
| --- | --- | --- | --- | --- |
| Pecho | 5 | 6 | 6 | 6 |
| Espalda | 10 | 12 | 12 | 12 |
| Hombros | 10 | 15 | 10 | 10 |
| Cuádriceps | 5 | 6 | 6 | 6 |
| Isquiotibiales | 10 | 15 | 15 | 15 |
| Glúteos | 10 | 15 | 14 | 14 |

### Ejercicios por sesión
**Día 1 · Torso**
- A: ★Press banca con barra ×3 · Dominadas o jalón al pecho ×3 · Remo con apoyo de pecho (máquina o banco inclinado) ×3 · Press militar con barra o mancuernas ×3 · Elevaciones laterales con mancuerna ×2 · Elevación de talones sentado ×3 · Curl inclinado con mancuernas ×2 · Extensión de tríceps en polea ×2
- B: Día 1 · Torso: ★Press banca con barra ×2 · Remo con apoyo de pecho (máquina o banco inclinado) ×2 · Aperturas en polea o pec-deck ×2 · Pullover en polea ×2 · Elevaciones laterales con mancuerna ×2 · Elevación de talones de pie ×3 · Crunch en polea o rueda abdominal ×3
- C: Día 1 · Torso: ★Press banca con barra ×2 · Remo con apoyo de pecho en máquina ×2 · Aperturas en polea ×2 · Pullover en polea ×2 · Elevaciones laterales con mancuerna ×2 · Elevación de talones de pie ×3 · Crunch en polea ×3

**Día 2 · Pierna**
- A: ★Sentadilla trasera o sentadilla en hack ×3 · Sentadilla búlgara con énfasis en cadera ×4 · Hip thrust con barra ×4 · Curl femoral tumbado o sentado ×8
- B: Día 2 · Pierna (sentadilla): ★Sentadilla trasera o sentadilla en hack ×2 · Curl femoral tumbado o sentado ×6 · Extensión de cuádriceps ×4 · Abducción de cadera en máquina ×6
- C: Día 2 · Pierna (sentadilla): ★Sentadilla trasera ×2 · Curl femoral sentado ×6 · Extensión de cuádriceps ×4 · Abducción de cadera en máquina ×6

**Día 3 · Empuje**
- A: Press inclinado con mancuernas ×3 · Press cerrado o fondos ×2 · Elevaciones laterales en polea ×3 · Face pull / pájaros (deltoides posterior) ×2 · Crunch en polea o rueda abdominal ×4 · Elevación de talones de pie ×4
- B: Día 3 · Empuje: ★Press banca con barra ×2 · Press militar con barra o mancuernas ×2 · Elevaciones laterales con mancuerna ×4 · Elevación de talones de pie ×4 · Extensión de tríceps en polea ×2
- C: Día 3 · Empuje: ★Press banca con barra ×2 · Press militar con barra de pie ×2 · Elevaciones laterales con mancuerna ×4 · Elevación de talones de pie ×4 · Extensión de tríceps en polea ×2

**Día 4 · Tirón**
- A: ★Press militar con barra o mancuernas ×3 · Remo en polea baja o máquina ×3 · Pullover en polea ×3 · Elevaciones laterales con mancuerna ×2 · Elevaciones de piernas colgado ×3 · Curl con barra o barra Z ×2
- B: Día 4 · Tirón: ★Dominadas o jalón al pecho ×4 · Remo en polea baja o máquina ×2 · Pullover en polea ×2 · Elevaciones laterales con mancuerna ×2 · Crunch en polea o rueda abdominal ×4 · Curl con barra o barra Z ×2
- C: Día 4 · Tirón: ★Dominadas ×4 · Remo con apoyo de pecho en banco inclinado ×2 · Pullover en polea ×2 · Elevaciones laterales con mancuerna ×2 · Crunch en polea ×4 · Curl con barra ×2

**Día 5 · Pierna**
- A: ★Peso muerto rumano ×4 · Prensa de piernas ×3 · Abducción de cadera en máquina ×4 · Patada de glúteo en polea ×3 · Curl femoral tumbado o sentado ×3
- B: Día 5 · Pierna (bisagra): ★Peso muerto rumano ×2 · Curl femoral tumbado o sentado ×7 · Abducción de cadera en máquina ×8
- C: Día 5 · Pierna (bisagra): ★Peso muerto rumano ×2 · Curl femoral tumbado ×7 · Abducción de cadera en máquina ×8

### Sensibilidad al tiempo disponible (C)
- 60 min por sesión: 16s/38m · 18s/39m · 14s/34m · 16s/40m · 17s/37m · sin cubrir: nada
- 75 min por sesión: 16s/38m · 18s/39m · 14s/34m · 16s/40m · 17s/37m · sin cubrir: nada
- 90 min por sesión: 16s/38m · 18s/39m · 14s/34m · 16s/40m · 17s/37m · sin cubrir: nada
- Hipótesis (no es regla): patrón principal con 4 series como mínimo: 16s/40m · 17s/42m · 13s/34m · 17s/42m · 16s/38m
  - Día 1 · Torso: ★Press banca con barra ×4 · Remo con apoyo de pecho en máquina ×2 · Pullover en polea ×2 · Elevaciones laterales con mancuerna ×2 · Elevación de talones de pie ×3 · Crunch en polea ×3
  - Día 2 · Pierna (sentadilla): ★Sentadilla trasera ×6 · Curl femoral sentado ×5 · Abducción de cadera en máquina ×6
  - Día 3 · Empuje: ★Press banca con barra ×4 · Press militar con barra de pie ×2 · Elevaciones laterales con mancuerna ×3 · Elevación de talones de pie ×4
  - Día 4 · Tirón: ★Dominadas ×4 · Remo con apoyo de pecho en banco inclinado ×2 · Elevaciones laterales con mancuerna ×3 · Pullover en polea ×2 · Crunch en polea ×4 · Curl con barra ×2
  - Día 5 · Pierna (bisagra): ★Peso muerto rumano ×4 · Curl femoral tumbado ×6 · Abducción de cadera en máquina ×6

## Barrido de 360 planes (90 perfiles × 3, 4, 5 y 6 días) con el reparto nuevo y el catálogo nuevo

- Planes en que **R1 deja necesidad semanal sin cubrir**: 32 de 360 (8.9 %).
- Planes con algún aviso único (cualquier causa): 87 de 360 (24.2 %).
- Sesiones por encima de su capacidad: 0 (la restricción de capacidad no se rompe).
- Sesiones por encima de 11 series fraccionadas de un músculo: 2, todas por una demanda mínima que gana sobre R1 (DEC-025, punto 4); eventos registrados: 3.
- Minutos por sesión (promedio / máximo): 49 / 75.

| Músculo | Planes con necesidad sin cubrir por R1 | 3 días | 4 días | 5 días | 6 días |
| --- | --- | --- | --- | --- | --- |
| Pecho | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Espalda | 18 (5 %) | 0 de 90 | 2 de 90 | 8 de 90 | 8 de 90 |
| Hombros | 6 (1.7 %) | 0 de 90 | 6 de 90 | 0 de 90 | 0 de 90 |
| Cuádriceps | 10 (2.8 %) | 0 de 90 | 2 de 90 | 4 de 90 | 4 de 90 |
| Isquiotibiales | 12 (3.3 %) | 0 de 90 | 4 de 90 | 4 de 90 | 4 de 90 |
| Glúteos | 12 (3.3 %) | 0 de 90 | 4 de 90 | 4 de 90 | 4 de 90 |
| Pantorrillas | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Bíceps | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Tríceps | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Abdomen | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |

Músculos sin cubrir por causa (en grupo-planes): {"tiempo":184,"R1":58}.
