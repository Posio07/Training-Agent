# Datos de la app

## `exercise-muscles.csv` · relación de cada ejercicio con cada músculo (formato largo, v2)

Una fila por cada par ejercicio-músculo. Es la **fuente de verdad** de qué músculos trabaja cada ejercicio del catálogo y con qué relación. Por ahora la app solo carga estos datos: ningún cálculo usa todavía la relación ni la evidencia, y el plan muestra lo mismo que antes (DEC-013). El conteo fraccionado es la Fase 2 del validador (`docs/specs/validador.md`).

### Columnas

| Columna | Qué lleva |
| --- | --- |
| `exerciseId` | Id único del ejercicio en el catálogo (`ifbb-pro-agent/js/knowledge.js`), por ejemplo `quads.leg_press`. No se inventan ni se cambian. |
| `muscle` | Uno de los 10 grupos: `chest` (pecho), `back` (espalda), `shoulders` (hombros), `quads` (cuádriceps), `hamstrings` (isquiotibiales), `glutes` (glúteos), `calves` (pantorrillas), `biceps`, `triceps`, `abs` (abdomen). |
| `relacion` | `directa` (el músculo es el generador primario de fuerza del ejercicio), `indirecta` (sinergista: se entrena de forma significativa, pero no es el generador primario) o `ninguna` (se evaluó y no hay relación). Un par sin fila no se evaluó y cuenta como ninguna. Un ejercicio puede tener varias directas. **No hay columna de peso**: el peso de cada categoría es una convención global del modelo, no un dato del ejercicio. |
| `evidencia` | `verificado`, `verificado (1 estudio)`, `probable` o `a_verificar` (ver abajo). |
| `fuente` | Autor, año, título y revista de lo que se leyó. Obligatoria si la evidencia es `verificado`, `verificado (1 estudio)` o `probable`. En `a_verificar` puede ir una fuente de contexto o en contra, y la nota lo aclara. |
| `notes` | Qué dice la fuente, con sus límites. Las filas pendientes de una decisión empiezan con `PENDIENTE:`. |
| `review_date` | Fecha de revisión de la fila, `AAAA-MM-DD`. |

### Reglas de datos
- **La evidencia solo mueve una relación entre categorías.** Está prohibido usar pesos a medida por ejercicio.
- **Una medición directa de hipertrofia (resonancia o ultrasonido) prevalece sobre EMG o biomecánica.**
- **Un solo estudio puede mover la relación un paso** (ninguna ↔ indirecta ↔ directa), y la fila se marca `verificado (1 estudio)`.

### Niveles de evidencia
- **`verificado`:** estudios que **midieron hipertrofia** de ese músculo con ese ejercicio o uno equivalente (la nota dice cuando es "equivalente").
- **`verificado (1 estudio)`:** igual que `verificado`, pero con **un solo** estudio de medición directa. Si la fila movió la relación, movió un solo paso.
- **`probable`:** solo EMG o una clasificación publicada (por ejemplo, la Tabla 1 de Pelland et al. 2026). No mide hipertrofia de esa combinación.
- **`a_verificar`:** sin fuente leída. Es preferible dejar `a_verificar` antes que anotar una fuente de la que no se está seguro: **nunca se inventan citas**.

El detalle de cómo se asignó cada nivel y de las fuentes leídas está en `docs/research/fuentes-musculos-ejercicio.md`.

### `exercise-buckets.csv` · dónde se programa cada ejercicio
Dos columnas, `exerciseId` y `bucket`: un bucket **único** por ejercicio (uno de los 10 grupos), el grupo del catálogo donde vive (día, rotación, mapa de lesiones). Es independiente de las relaciones: la sentadilla búlgara de glúteo se programa en `glutes` y es directa de `quads` y de `glutes`. Un test exige que coincida con el catálogo.

### Reglas que valida el parser
- Cada ejercicio del catálogo tiene **al menos una** fila `directa` (los tests lo comprueban). La única excepción es el paseo del granjero (`functional.farmer_carry`), que no suma volumen de hipertrofia a ningún grupo y por eso no tiene filas.
- No se repite el mismo par `exerciseId` + `muscle`, ni un ejercicio en el CSV de buckets.
- Valores de `relacion`, `evidencia`, `muscle` y `bucket` solo los de las tablas de arriba, y `review_date` con formato `AAAA-MM-DD`.

### Cómo abrirlo y guardarlo con Excel (en español)
El archivo usa UTF-8 y coma como separador. Excel en español guarda con **punto y coma**; el parser acepta ambos, no hace falta convertirlos.

**Abrir**
1. No hacer doble clic (Excel puede leer mal las tildes). En Excel: *Datos → Obtener datos → Desde un archivo → Desde texto o CSV*.
2. *Origen del archivo:* `65001: Unicode (UTF-8)`. *Delimitador:* coma.
3. Elegir *Transformar datos* y poner la columna `review_date` como tipo **Texto** (si no, Excel la convierte en una fecha y la guarda como `24/10/2026`, que el parser rechaza). Luego *Cerrar y cargar*.

**Guardar**
1. *Archivo → Guardar como*, y en *Tipo* elegir **CSV UTF-8 (delimitado por comas) (*.csv)**.
2. **No** usar "CSV (delimitado por comas)" a secas: guarda en otra codificación y rompe las tildes.
3. Si Excel pregunta si mantener el formato, responder que sí.
4. Al editar, no cambiar ni borrar los nombres de la fila de encabezado. Las columnas pueden ir en otro orden.

### Después de cambiar el CSV
La app no lee el CSV: GitHub Pages solo publica la carpeta `ifbb-pro-agent/`, y el modo sin conexión necesita todo precargado. Por eso hay un módulo **generado y subido al repositorio**, `ifbb-pro-agent/js/exerciseMuscles.js`. Cada vez que cambie alguno de los dos CSV hay que regenerarlo:

```
node scripts/build-exercise-muscles.js          # regenera el módulo (falla y explica si el CSV tiene errores)
node scripts/build-exercise-muscles.js --check  # solo comprueba que módulo y CSV coinciden
node --test ifbb-pro-agent/tests/engine.test.js
```

Un test de `engine.test.js` falla si el módulo no coincide con el CSV, y ese archivo es la puerta del despliegue a Pages. Si se edita el CSV directamente en GitHub sin regenerar el módulo, el despliegue se frena hasta regenerarlo.
