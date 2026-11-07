# Diagnóstico: sesiones de más de 25 series sin aceptación (barrido de 360 planes)

Fecha 2026-11-07, sobre `main` tras el PR #32 (DEC-022). **Solo diagnóstico: ningún código ni dato cambió.** Todas las cifras se reproducen con `node scripts/diagnostico-sesiones-sobre-25.js` (recorre los mismos 90 perfiles × 3, 4, 5 y 6 días que `scripts/simular-reglas-articulares.js`, que da el total de 108).

## 1. ¿El usuario ve un aviso?
Sí, **en las 108 sesiones** el plan trae un aviso propio ("Día 1 · Full body A: 28 series, por encima de las 25 por sesión (E4 · convención de la app). No se recortó más para no quitar multiarticulares ni bajar un grupo mayor del piso semanal."). Cómo se ve (perfil de referencia de Emanuel, `emanuel_legs_cut_4d` a 3 días, 28/25/25 series, capturas en Chromium móvil):
- **Resumen:** el aviso aparece apilado con otros 7 (recortes por sesión, grupos sin series directas, mínimo de grupos, piso de 10); es el quinto de ocho, igual de grande que los demás y sin destacar cuál es la sesión pasada.
- **Entreno:** la tarjeta "Tope de 25 series por sesión" dice que se recortaron series de aislamiento y remite a los avisos, pero **no dice que una sesión quedó en 28**; la tarjeta "Día 1 · Full body A" muestra "28 series" y ~85 min sin ninguna marca. Los botones "Aceptar sesiones más largas (sin recortes)" y "Cambiar de split" están en esta pestaña.
- Con la aceptación vigente el aviso cambia a "Aceptaste una sesión más larga el …".

## 2. Distribución de las 108 sesiones (72 planes)
- **Por días del split:** 3 días 78 sesiones (42 planes de 90); 4 días 18 (18 planes); 5 días 10 (10); 6 días 2 (2).
- **Por sesión:** Cuerpo completo A (3 días) 38, Cuerpo completo C 21, Cuerpo completo B 19; Torso A (4 días) 16; Torso (5 días) 8; Pierna (4, 5 y 6 días) 6.
- **Por número de series:** 26: 30; 27: 14; 28: 27; 29: 8; **30 o más: 29** (21 de 3 días y 8 de 4 días); máximo 37 (Cuerpo completo A, classic_m avanzado). Las de 30 o más de 4 días son el Torso A con 30 series y 0 de aislamiento.
- **Por perfil:** nivel avanzado 83, intermedio 25; objetivo volumen 43, mantenimiento 43, definición 22; división classic_m 38, physique_m 28, general_m 24, wellness_w 12, bikini_w 6; con piernas rezagadas 59, sin rezagados 49.
- **Composición:** 24 de las 108 no tienen ninguna serie de aislamiento y 55 tienen 2 o menos: el tope solo recorta aislamientos, así que no puede bajarlas. La mediana de series de multiarticulares por sesión es 25.
- **Duración estimada:** 80 de las 108 pasan de 90 min (máximo 118).
- Antes del Paso 2 eran 105 (en 80 planes): A3 deja 19 nuevas y saca 16.

## 3. Causa probable (medida a nivel de semana)
Promedio de series por semana, con la demanda = lo que quedó + lo que el tope recortó:

| Split | Planes con sesión >25: demanda → capacidad (días × 25) | Planes sin sesión >25: demanda → capacidad |
| --- | --- | --- |
| 3 días | 136 → 75 (multiarticulares: 68) | 92 → 75 (47) |
| 4 días | 153 → 100 (73) | 106 → 100 (51) |
| 5 días | 158 → 125 (76) | 108 → 125 (53) |
| 6 días | 136 → 150 (69) | 112 → 150 (55) |

El volumen semanal objetivo por grupo (fórmula por nivel, objetivo, énfasis de la división y rezagados) se fija sin mirar cuántas series caben en los días del split; después el tope, el piso y el mínimo lo parchean. Cuando los multiarticulares solos (68 de 75 posibles a 3 días) casi llenan la capacidad, no queda nada que recortar. Es la misma raíz que B-037 (sesiones con más de 11 series fraccionadas de un músculo) y que la propuesta de tope por duración (B-028).
