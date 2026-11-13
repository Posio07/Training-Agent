# Tope de lumbar media por sesión: medición y revisión del investigador (2026-11-13)

Medición pedida por Emanuel (2026-11-13) después de que el paso 2 de DEC-037 (PR #72, DEC-039) subiera la demanda lumbar `media` de las sesiones de pierna al entrar el hip thrust. **Este documento describe la medición previa, hecha con un prototipo sin implementar.** Después Emanuel pidió implementar el tope de 8 y eso es DEC-040 (Propuesto); la decisión de aceptarlo es suya (B-062, propuesto). Las cifras del prototipo coinciden con la implementación real.

## Cómo se midió
- Estado base: `main` con el paso 2 mergeado (#72), barrido de 360 planes (`scripts/perfiles-barrido.js` × 3, 4, 5 y 6 días) y los 10 perfiles de referencia.
- Prototipo **en una copia aparte, sin tocar el repo**: la sesión no admite más de N series de ejercicios de lumbar `media` (nivel del perfil articular de la Fase 3). El tope se comprobó en tres sitios del reparto: el relleno y la cuota (como restricción dura, junto a R1 y la capacidad), el segundo paso del excedente del tope de 5 series y el ejercicio directo semanal de la estructura. **No se limitaron los patrones obligatorios de la estructura** (por ejemplo el hack como sentadilla): si uno solo ya pasa del tope, el tope no lo toca.
- "Planes con aviso" = planes con algún músculo sin cubrir. "Glúteos sin cubrir" = planes de 90 por cantidad de días con glúteos por debajo de su necesidad o de su piso (cualquier causa).
- Los 6 son un dato extra, para dar contexto de qué pasa con un tope más estricto.

## Resultados (barrido de 360 planes)
| Medida | Sin tope | Tope 10 | **Tope 8** | Tope 6 (extra) |
| --- | --- | --- | --- | --- |
| Series totales | 34055 | 34058 (+3) | **34106 (+51)** | 34078 (+23) |
| Faltantes (músculo-plan) | 419 | 421 | **405** | 445 |
| Planes con aviso | 124 | 124 | **112** | 145 |
| Glúteos sin cubrir, 3 días | 47 | 47 | **47** | 47 |
| Glúteos sin cubrir, 4 días | 30 | 30 | **28** | 37 |
| Glúteos sin cubrir, 5 días | 16 | 16 | **12** | 23 |
| Glúteos sin cubrir, 6 días | 16 | 16 | **6** | 23 |
| Lumbar media por sesión de pierna: promedio | 5,0 | 5,0 | **4,8** | 4,6 |
| Lumbar media por sesión de pierna: máximo | 11 | 10 | **8** | 6 |
| Sesiones de pierna con más de 8 series de media (de 810) | 21 | 24 | **0** | 0 |
| Sesiones de pierna con más de 10 series de media | 2 | 0 | **0** | 0 |
| Series de hip thrust / patada / abducción | 2869 / 453 / 884 | 2880 / 439 / 890 | **2830 / 481 / 892** | 2734 / 577 / 881 |
| Uso del tiempo (global) | 72,0 % | 72,0 % | **72,1 %** | 72,1 % |
| Abducción máxima por semana · planes sin extensión directa | 7 · 0 | 6 · 0 | **6 · 0** | 5 · 0 |

## Lectura
- **Tope de 10: casi no hace nada.** Solo 2 de las 810 sesiones de pierna pasan hoy de 10 series de `media`; el efecto en el barrido es de +3 series y +2 faltantes.
- **Tope de 8: toca 21 sesiones de 810 y no empeora nada; mejora un poco.** Faltantes 419 → 405, planes con aviso 124 → 112, y los glúteos a 6 días de 16 a 6 planes sin cubrir. Hipótesis (no verificada): en las sesiones afectadas el hip thrust deja series a la patada y a la abducción, y eso reparte el glúteo entre más ejercicios y baja el choque con R1 en glúteos a 5 y 6 días.
- **Pero no baja el promedio:** la lumbar `media` por sesión de pierna pasa de 5,0 a 4,8 (antes del paso 2 era 2,2). Si la preocupación es el nivel general y no los picos, 8 y 10 no la resuelven: el tope es una red para los extremos.
- **Tope de 6 (extra): ya cuesta.** 145 planes con aviso (frente a 124) y glúteos sin cubrir a 4, 5 y 6 días (37, 23, 23).
- **10 perfiles de referencia:** el máximo de lumbar `media` en una sesión es 7 sin tope, así que el tope de 10 no cambia ninguna sesión, el de 8 cambia 5 (1 serie en total) y el de 6 cambia 12 (1 serie en total).

## Qué dice el investigador sobre el nivel lumbar del hip thrust y de la patada
Revisión del 2026-11-13. Todo es una propuesta de nivel 2. **Conclusión: no hay base para cambiar ninguna celda, y tampoco para sostener `media` con evidencia.**

**Hip thrust con barra (hoy lumbar `media`, evidencia `a_verificar`, origen `spec_inicial`).**
- La celda sale de la regla 5 de Emanuel (2026-11-07): choque entre "carga en la cadera" (media) y "tronco apoyado en el banco" (baja), y gana el nivel más alto. Con la definición literal del criterio saldría `baja`. Es una decisión de modelado (E4), no un resultado de estudio.
- **Propuesta: dejar `media`; evidencia `a_verificar`; confianza baja.** Ninguna fuente leída mide la compresión lumbar del hip thrust con barra, así que ni la sostienen ni la refutan:
  - Empuja hacia arriba: EMG del erector espinal similar a la del peso muerto (Andersen 2018) y mayor activación del multífido que en el puente en suelo (Kim y Jeon 2026).
  - Empuja hacia abajo: Brazil 2021 (dinámica inversa, hip thrust con barra al 70 % del 1RM): el rango pelvis-tórax es pequeño y el trabajo extensor del tronco es más de 6 veces menor que el de la cadera; sugieren, sin medirlo, que la carga no axial podría reducir la compresión lumbar.
  - Se cancelan. Un estudio de EMG solo puede mover una relación un paso.
- **La EMG del erector no es carga espinal:** el erector puede activarse tanto como en un peso muerto sin que la compresión sea parecida.

**Patada de glúteo en polea (hoy lumbar `baja`, caso nombrado aparte por Emanuel el 2026-11-07).**
- No se encontró ningún estudio con EMG del erector, cinemática lumbopélvica o carga espinal de la patada en polea. **Propuesta: dejar `baja`; evidencia `a_verificar`, E4; confianza baja.** Es criterio mecánico (aislamiento ligero, tronco erguido o apoyado). Los blogs de entrenamiento advierten de hiperlordosis para compensar rango de cadera: es un consejo de técnica y no cambia el nivel.

**Fuentes (datos bibliográficos verificados contra PubMed; lo leído de cada una):**
| Referencia | Qué se leyó | Qué mide |
| --- | --- | --- |
| Brazil A et al. 2021. A comprehensive biomechanical analysis of the barbell hip thrust. PLoS One 16(3):e0249307 (doi:10.1371/journal.pone.0249307, PMID 33780488) | Texto completo, sin las figuras | Cinemática y cinética, n=19 hombres entrenados; no mide compresión lumbar ni EMG. Un valor del momento extensor del tronco difiere entre resultados (4,39) y discusión (4,93): probable errata |
| Takeshita Y et al. 2022. Effects of knee flexion angles on the joint force and muscle force during bridging exercise: a musculoskeletal model simulation. J Healthc Eng 2022:7975827 (doi:10.1155/2022/7975827, PMID 35677781) | Solo resumen | Simulación del puente en suelo sin carga (n=15): fuerza lumbar de 150 a 200 % del peso corporal según la flexión de rodilla. No es hip thrust con carga |
| Andersen V et al. 2018. Electromyographic comparison of barbell deadlift, hex bar deadlift, and hip thrust exercises. J Strength Cond Res 32(3):587-593 (doi:10.1519/JSC.0000000000001826, PMID 28151780) | Solo resumen | EMG, n=13: erector espinal sin diferencias entre el peso muerto y el hip thrust |
| Kim TH, Jeon IC. 2026. Activation of the gluteus maximus and multifidus muscles in bridge and hip thrust exercises. Physiother Theory Pract, publicación anticipada, pp. 1-10 (doi:10.1080/09593985.2026.2714954, PMID 42578527) | Solo resumen | EMG, n=20: el multífido se activa más en el hip thrust que en el puente en suelo |
| Hammond A et al. 2019. The effects of a 4-week mesocycle of barbell back squat or barbell hip thrust training. PeerJ 7:e7337 (doi:10.7717/peerj.7337, PMID 31388473) | Solo resumen | Fuerza isométrica extensora lumbar; no mide carga espinal |
| Colonna S et al. 2025. Supine bridge exercise: a narrative review of the literature (Part I). Cureus 17(3):e80349 (doi:10.7759/cureus.80349, PMID 40206899) | Casi todo el texto | Revisión narrativa débil (los autores admiten recomendaciones sin base); no cuantifica fuerzas lumbares |
| Stevens BM et al. 2022. Int J Exerc Sci 15(1):1179-1189 (doi:10.70252/DWMB8342, PMID 35989703) | Solo resumen | EMG de glúteo mayor y bíceps femoral; no mide el erector; no dice si sus "kickbacks" son en polea |

No se leyó texto completo de Takeshita, Kim y Jeon, Andersen ni Hammond. De fichas de ejercicios y blogs solo se leyeron extractos de la búsqueda. Para subir la confianza haría falta un modelo musculoesquelético del hip thrust cargado, o las figuras de Brazil 2021; un estudio así podría mover la celda un paso, hacia `baja` o hacia `alta`.

## Qué queda para Emanuel
Ver B-062 y DEC-040. No se cerró ningún ítem.
