# Backlog

Lista viva de pendientes. Última revisión: 2026-11-08.

## Reglas de este archivo

- **Estados:** `propuesto` (lo sugirió el agente, sin decisión del usuario) · `abierto` (el usuario lo quiere hacer, aún no empezó) · `en curso` · `cerrado`.
- **Dueño:** quien decide y prioriza. Hoy, Emanuel en todos los ítems; el agente ejecuta cuando Emanuel lo pide.
- **Solo Emanuel** crea ítems `abierto`, reordena, prioriza y cierra ítems suyos.
- **El agente puede:** agregar ítems como `propuesto`; pasar a `en curso` un ítem que Emanuel le pidió trabajar; anotar en *Notas* el PR o el DEC que lo toca y "entregado en PR n.º X, pendiente de cierre por Emanuel". No reordena ni cierra ítems de Emanuel. Puede retirar (cerrar con motivo) sus propios ítems `propuesto`.
- Cada fila lleva la fecha de su último cambio (AAAA-MM-DD). Las referencias a PR, DEC, commits e identificadores se copian de la fuente real, nunca de memoria.

## Ítems

Un archivo por entrada (`docs/backlog/B-XXX.md`), con la fila completa (dueño, PR o DEC relacionado y notas). Un PR que abre o cambia un ítem crea o edita solo su archivo y su fila de este índice.

| ID | Ítem | Estado | Actualizado |
| --- | --- | --- | --- |
| [B-001](backlog/B-001.md) | Arreglo del import: `prepareImportedProfile` descarta `workouts` y `sessions` | en curso | 2026-10-25 |
| [B-002](backlog/B-002.md) | Pullover en polea: confirmar la variante que estudió Di Fonza 2026 | abierto | 2026-10-25 |
| [B-003](backlog/B-003.md) | Verificar las filas `a_verificar` de `exercise-muscles.csv` | abierto | 2026-10-25 |
| [B-004](backlog/B-004.md) | Prensa → glúteo: revisar la promoción de indirecta a directa | abierto | 2026-10-25 |
| [B-005](backlog/B-005.md) | R3 (rampa de progresión) y frecuencia mínima de R2: implementar | abierto | 2026-10-25 |
| [B-006](backlog/B-006.md) | Leer completa la postura del ACSM 2026 (MSSE) | abierto | 2026-10-25 |
| [B-007](backlog/B-007.md) | Fase A0, Paso 2: modelo de datos propuesto (`docs/data-model/`) | abierto | 2026-10-25 |
| [B-008](backlog/B-008.md) | Llave sobrante en el server | abierto | 2026-10-25 |
| [B-009](backlog/B-009.md) | Rediseño visual | abierto | 2026-10-25 |
| [B-010](backlog/B-010.md) | Duración: presupuesto de minutos por sesión declarado por el usuario, en lugar de un tope fijo de 90 | propuesto | 2026-10-25 |
| [B-011](backlog/B-011.md) | Balance entre sesiones de la semana | propuesto | 2026-10-25 |
| [B-012](backlog/B-012.md) | Renombrar la fuente de mantenimiento de Spiering para no confundirla con `SPIERING_2021` | propuesto | 2026-10-25 |
| [B-013](backlog/B-013.md) | Corregir dos fuentes de `knowledge.js` que no verifican | en curso | 2026-10-25 |
| [B-014](backlog/B-014.md) | Proteger `main` en GitHub (branch protection) como complemento de `settings.json` | abierto | 2026-10-25 |
| [B-015](backlog/B-015.md) | Corregir descripciones de fuentes que no coinciden con lo que dicen | propuesto | 2026-10-25 |
| [B-016](backlog/B-016.md) | Revisar la descripción de `BICKEL_2011` en `knowledge.js` | propuesto | 2026-10-25 |
| [B-017](backlog/B-017.md) | Corregir la línea "Respaldo" de DEC-002 y de DEC-009 | en curso | 2026-10-25 |
| [B-018](backlog/B-018.md) | Leer los textos completos de Silbernagel 2007 (AJSM) y Spiering 2021 (mantenimiento) | propuesto | 2026-10-25 |
| [B-019](backlog/B-019.md) | Registro de "dolor a la mañana siguiente" para alinear la regla de dolor con el modelo | propuesto | 2026-10-25 |
| [B-020](backlog/B-020.md) | EFSA: la app muestra agua total como si fueran litros de bebida | en curso | 2026-10-25 |
| [B-021](backlog/B-021.md) | Endurecer `.claude/settings.json` (huecos que encontró el revisor) | propuesto | 2026-10-25 |
| [B-022](backlog/B-022.md) | Import: avisar si el guardado falla y poner límites al archivo | propuesto | 2026-10-25 |
| [B-023](backlog/B-023.md) | Actualizar la nota de DEC-017 sobre `SPIERING_2021` cuando se mergee B-013 | propuesto | 2026-10-25 |
| [B-027](backlog/B-027.md) | Mínimo semanal por grupo para los grupos chicos dentro del tope E4 | en curso | 2026-11-07 |
| [B-028](backlog/B-028.md) | Evaluar reemplazar el tope de 25 series por un tope de duración estimada | cerrado | 2026-11-07 |
| [B-029](backlog/B-029.md) | Avisar al usuario cuando el plan cambia por el mínimo en perfiles con sesiones largas ya aceptadas | propuesto | 2026-11-07 |
| [B-030](backlog/B-030.md) | Fase 3, Paso 1: tabla `perfil_articular` de todo el catálogo | en curso | 2026-11-07 |
| [B-031](backlog/B-031.md) | Separar en el catálogo las variantes que cambian el nivel lumbar: sentadilla trasera / hack, press de hombro de pie / sentado, remo en polea / máquina con apoyo | propuesto | 2026-11-07 |
| [B-032](backlog/B-032.md) | Prensa de piernas: leer el texto completo de Sjöberg 2023 (compresión lumbar) antes de revisar su nivel lumbar | propuesto | 2026-11-07 |
| [B-033](backlog/B-033.md) | Cómo clasificar ejercicios con peso corporal y palanca larga (rueda abdominal, elevación de piernas colgado) | propuesto | 2026-11-07 |
| [B-034](backlog/B-034.md) | Fase 3, Paso 2: A1 (orden por demanda) y A3 (sentadilla y bisagra pesadas en días distintos) en el generador | en curso | 2026-11-07 |
| [B-035](backlog/B-035.md) | Curl femoral: variedad en el día de sentadilla (separar el curl sentado del tumbado) | propuesto | 2026-11-07 |
| [B-036](backlog/B-036.md) | A2 en los días de cuerpo completo de 3 días: el remo con barra cae con la sentadilla o el peso muerto rumano | en curso | 2026-11-07 |
| [B-037](backlog/B-037.md) | El reparto semanal deja sesiones con más de 11 series fraccionadas de un músculo (glúteos, hombros) | cerrado | 2026-11-07 |
| [B-038](backlog/B-038.md) | Reparto semanal de series en splits de pocos días: sesiones sobre 25 series, sesiones con más de 11 series de un músculo y tope por duración | propuesto | 2026-11-07 |
| [B-039](backlog/B-039.md) | Reconstruir el núcleo del generador (clean core) a partir del inventario | en curso | 2026-11-07 |
| [B-041](backlog/B-041.md) | Indicador "Hoy" pasa a "Siguiente" (orden del split, no la fecha) | propuesto | 2026-11-08 |
| [B-042](backlog/B-042.md) | Reglas de diseño del reparto que la vista previa dejó abiertas | propuesto | 2026-11-08 |
| [B-043](backlog/B-043.md) | Usar el tiempo sobrante de la sesión para volumen extra, por encima de la necesidad | propuesto | 2026-11-08 |
| [B-044](backlog/B-044.md) | Variantes nuevas para los patrones de una sola variante (para después del corte) | propuesto | 2026-11-08 |
| [B-045](backlog/B-045.md) | Test de la comprobación de R1 dentro del traspaso del tope de series | propuesto | 2026-11-08 |
| [B-046](backlog/B-046.md) | Borrar los datos viejos del almacenamiento dos semanas después del corte | propuesto | 2026-11-08 |
| [B-047](backlog/B-047.md) | Reorganizar `engine.js` después del corte | propuesto | 2026-11-08 |
| [B-048](backlog/B-048.md) | Rutina corta: ¿de 3 a 4 ejercicios o lo que quepa en el tiempo? | propuesto | 2026-11-08 |
| [B-049](backlog/B-049.md) | Bandera salud/funcional (DEC-005): el reparto nuevo no agrega los ejercicios funcionales | propuesto | 2026-11-08 |
| [B-040](backlog/B-040.md) | Decidir si el mínimo de la OMS (150 min por semana de cardio) aplica a todas las fases | propuesto | 2026-11-08 |
| [B-024](backlog/B-024.md) | Correr los E2E en el CI | propuesto | 2026-10-25 |
| [B-025](backlog/B-025.md) | Fase 3 del validador: perfil articular y orden de ejercicios | abierto | 2026-11-07 |
| [B-026](backlog/B-026.md) | Anclar el criterio de modelado de la Fase 3 con datos biomecánicos de carga sobre la columna y el hombro | en curso | 2026-11-07 |
| [B-050](backlog/B-050.md) | Paso 3.2 del núcleo v2: aviso único con tres salidas | propuesto | 2026-11-08 |

## Cerrados

*(vacío)*
