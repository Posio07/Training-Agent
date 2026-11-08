# Núcleo v2 del generador — Especificación

7 nov 2026 · Emanuel Miranda

*Revisión del 7 nov 2026: se aplican las decisiones de Emanuel sobre los huecos de la trazabilidad (`docs/research/trazabilidad-nucleo-v2.md`) y los dos DEC de nivel 3, DEC-024 (tope por minutos) y DEC-025 (R1 como restricción), **aceptados por Emanuel el 8 nov 2026**. Ese día también se decidieron el top set fuera del torso, la rotación de cuerpo completo y la estrategia de construcción (sección "El corte").*

## Por qué se reconstruye

El generador actual reparte el volumen semanal sin mirar cuánto cabe en los días del split y después lo corrige con pasos sucesivos: el tope de 25 recorta, el piso completa, el mínimo de grupos chicos vuelve a mover series y los avisos informan lo que quedó. Además, elige ejercicios rotando por el catálogo de cada grupo, sin saber qué función tiene el día. El inventario del generador (19 pasos) y el diagnóstico de las 108 sesiones de más de 25 series muestran los efectos:

- Sesiones de hasta 37 series y 118 minutos, en 72 de 360 planes.
- Días de tirón con press militar y un solo multiarticular de espalda.
- Rutina corta con un solo ejercicio en 168 de 1620 sesiones.
- Cada regla nueva movió efectos de otra: el tope del curl, el mínimo de grupos chicos y los avisos de R1.

DEC-023 permite resetear los datos durante el año de prueba, así que el núcleo se reconstruye en lugar de seguir parcheándolo.

**Principios (clean core)**

- El estándar del proyecto son los DEC aceptados, las especificaciones, la escala de evidencia y las pruebas de comportamiento. La implementación actual del motor es descartable.
- El reparto parte de la capacidad real del usuario, no de un volumen ideal que después se recorta.
- Cada día tiene una función, y la función define qué debe cubrir.
- Todas las reglas y todos los números viven en un solo registro, con su DEC y su nivel de evidencia. Un número sin fuente se justifica como E4 o se elimina.
- El código que una decisión deja muerto se elimina en el mismo PR.

## Modelo de datos

**Catálogo en dos niveles**

- **Patrón:** el movimiento (empuje vertical, empuje horizontal, tirón vertical, tirón horizontal, sentadilla, bisagra, flexión de rodilla, aislamientos por músculo). El generador planifica por patrón.
- **Variante:** el ejercicio concreto, con id propio (press militar con barra, press militar con mancuernas). Cada variante tiene su aporte por músculo (formato largo, DEC-013), su perfil articular (Fase 3) y su tiempo por serie. La completitud del perfil articular del catálogo es un **test de datos**, no un aviso del plan. Desaparecen los ejercicios con "o" en el nombre.
- El usuario elige la variante en la sesión; por defecto, la última que usó. El progreso se registra por variante.

**Perfil del usuario: campos nuevos**

| Campo | Qué es | Uso |
| --- | --- | --- |
| Tiempo disponible por día | Minutos por sesión, con un valor general y la opción de cambiarlo por día | Es la capacidad de cada sesión en el reparto |
| Ejercicios prioritarios | Hasta tres variantes que el usuario quiere siempre (por ejemplo dominadas y fondos) | Entran fijos en los días cuyo tipo de sesión incluye su patrón, antes del relleno |
| Incluir remo con barra | Casilla, como en DEC-022 | Habilita esa variante; aplican A2 y A3 |

Un ejercicio prioritario no convierte la rutina en calistenia: solo garantiza su lugar. Si una lesión declarada lo contraindica (A7) o si la bandera de dolor de su zona está activa (A6), la seguridad gana sobre la preferencia y la app lo avisa. Las variantes con peso corporal registran la carga añadida o la asistencia para poder seguir el progreso.

**Rutina corta:** deja de ser un recorte de la interfaz. Es la misma sesión generada con menos tiempo disponible, que el usuario fija al empezarla ("hoy tengo 45 minutos").

**Plan guardado.** El plan generado se **guarda** (con un identificador, la fecha y la versión del motor que lo generó). Hoy se recalcula cada vez que se muestra; en el núcleo nuevo solo se regenera cuando:

- el usuario aprieta el botón **"Regenerar"**, o
- cambia el tiempo disponible, los días, el objetivo, el nivel, la división, los rezagados, los ejercicios prioritarios, las lesiones declaradas o la casilla del remo con barra.

Una **versión nueva del motor no regenera el plan sola**: la app avisa que hay una versión nueva y el usuario decide cuándo aplicarla. La aceptación de una sesión (paso 7) se guarda en este plan y caduca al regenerarlo.

## Tipos de sesión

Cada día del split tiene un tipo, y el tipo define los patrones obligatorios y dónde va el top set. Esto reemplaza la rotación por el catálogo, que es la causa común del día de tirón con press militar y de la rutina corta de un ejercicio.

| Tipo | Patrones obligatorios | Top set |
| --- | --- | --- |
| Empuje | Empuje horizontal y empuje vertical | Empuje horizontal |
| Tirón | Tirón vertical y tirón horizontal | Tirón (vertical u horizontal, según el perfil) |
| Pierna con sentadilla | Sentadilla y flexión de rodilla | Sentadilla |
| Pierna con bisagra | Bisagra y flexión de rodilla | Bisagra |
| Torso | Un empuje y un tirón | Alternancia semanal (criterio de diseño, E4): el primer torso de la semana, empuje horizontal; el segundo, tirón vertical |
| Cuerpo completo | Un patrón de pierna, un empuje y un tirón | Rotación de cuerpo completo ×3 (criterio de diseño, E4): sentadilla el día 1, empuje horizontal el día 2 y bisagra el día 3; nunca dos de lumbar alta en la misma sesión |

- El top set va siempre al patrón principal del tipo, nunca al primer ejercicio de la lista.
- **El top set existe solo en definición** (DEC-002 y DEC-008), como hoy. Sus números (4–6 repeticiones, RIR 1–2, back-offs al −10 %, y los descansos de 180 y 150 s) pasan al registro como criterio de diseño (E4). Fuera de definición no hay top set y la tabla anterior solo fija el orden del patrón principal.
- A3 queda expresada aquí: en splits con dos días de pierna, uno es con sentadilla y otro con bisagra, separados por 48 h o más. Sin calendario, se garantiza el **orden de las sesiones** (los dos días de pierna no son consecutivos en el split) y no el reloj; no se agrega un campo de días de la semana.
- **Tres días (cuerpo completo ×3):** sentadilla el día 1, bisagra el día 3 y pierna sin lumbar alta (prensa, zancada o flexión de rodilla) el día 2.
- **Splits por defecto:** 4 días, torso, pierna con sentadilla, torso, pierna con bisagra; 5 días, torso, pierna con sentadilla, empuje, tirón, pierna con bisagra; 6 días, empuje, tirón, pierna con sentadilla, empuje, tirón, pierna con bisagra.
- La rutina corta se arma con los patrones obligatorios del tipo, de 3 a 4 ejercicios.

Los patrones obligatorios son un criterio de diseño (E4). El investigador debe buscar respaldo para la cobertura mínima por tipo de sesión.

## Algoritmo de reparto

Un solo paso, en este orden. Ningún paso posterior corrige a uno anterior.

1. **Capacidad (DEC-024).** Cada sesión tiene como capacidad los minutos disponibles del perfil, o los del día si el usuario los cambió, **menos el cardio programado ese día**. La duración de una serie es el tiempo de trabajo más el descanso de esa variante, ambos tomados del registro de reglas; los unilaterales cuentan ambos lados (DEC-007). Esto reemplaza el tope de 25 series.
2. **Restricciones de seguridad.** Se aplican las lesiones declaradas (A7, cuando tenga fuente), las banderas de dolor activas (A6) y las variantes habilitadas por el perfil.
3. **Estructura.** Se ubican los patrones obligatorios de cada tipo de sesión y los ejercicios prioritarios del usuario. **El patrón principal de cada sesión recibe aquí su volumen propio: al menos 4 series de trabajo (el top set más sus back-offs), antes del relleno (DEC-029; E4).** **Todo grupo del perfil lleva por semana al menos un ejercicio directo (del grupo) con 2 series o más** (DEC-029; E4): es el equivalente de la regla de DEC-020 "nunca se quita el último ejercicio directo de un grupo", que la trazabilidad no había detectado (fila T20). Se ubica en la sesión compatible con más tiempo libre; si no hay lugar, el aviso único lo dice.
4. **Necesidad semanal y demandas mínimas.** La **necesidad semanal por grupo** sale del registro: 18, 14 o 10 series semanales según el nivel (avanzado, intermedio, novato; criterio de diseño E4), y los modificadores 0,85 (definición) y 1,25 (grupos rezagados y énfasis de la división) **se aplican una sola vez, sobre la necesidad**, nunca como pesos dentro de la cobertura marginal. Los demás números del cálculo actual (×0,5 de énfasis reducido, ×0,6 de grupos chicos, tope de 20 y mínimo de 4 para rezagados) pasan al registro como criterio de diseño (propuesta en la sección 7 de la trazabilidad). La garantía de series reales de los grupos mayores (DEC-014), el piso de mantenimiento (DEC-017) y el mínimo de grupos chicos (DEC-020) entran como demandas que el reparto debe cubrir, no como correcciones posteriores.
5. **Relleno por cobertura marginal.** Mientras quede capacidad, entra la serie candidata con más necesidad no cubierta por minuto. La necesidad se mide en series fraccionadas, así que un ejercicio redundante aporta poco: si el press de banca ya cubrió deltoide anterior y tríceps, el press militar suma menos que las elevaciones laterales, que cubren el deltoide lateral con pocos músculos adicionales. Ningún músculo supera el umbral de R1: **11 series fraccionadas por músculo y sesión** (DEC-025). Si la necesidad semanal de un músculo no cabe sin superarlo, queda sin cubrir y el aviso único lo explica. **Cuando R1 choca con una demanda mínima (el piso de DEC-017 o la garantía de series reales de DEC-014), ganan las demandas mínimas**, porque R1 como restricción ya es más estricta que su fuente.
6. **Orden y top set.** Se aplica A1 (lumbar alta primero, luego multiarticulares, al final aislamientos) y el top set va al patrón principal del tipo de sesión.
7. **Si no alcanza.** Si las demandas mínimas no entran en la capacidad (o la necesidad de un músculo no cabe bajo R1), la app muestra un solo aviso con tres salidas: más tiempo ese día, más días o aceptar la sesión con esas demandas sin cubrir.

   **Aceptación.** Se acepta **una sesión concreta de un plan concreto** y se guarda **en el plan, no en el perfil**. Caduca al regenerar el plan y al cambiar el tiempo disponible, los días o el objetivo del perfil.

**Quién cede cuando no entra todo.** La cobertura marginal decide qué ejercicio cede: sale primero el que menos necesidad no cubierta aporta por minuto. El énfasis ya está en la necesidad (0,85 y 1,25, una sola vez): la cobertura marginal no agrega pesos propios. Los patrones obligatorios y las demandas mínimas no ceden.

**Límite conocido.** El paso 5 elige la mejor serie en cada momento, no el plan óptimo global. Se acepta porque cada decisión se puede explicar: la app puede mostrar por qué está cada ejercicio.

## Registro único de reglas

Todas las reglas y todos los números del núcleo viven en un solo registro (hoy `VALIDATOR_RULES`). Cada entrada lleva:

- Identificador y DEC de origen.
- Nivel de evidencia (E1 a E4) y fuente, o "criterio de diseño" si es E4 sin fuente.
- Tipo: estricta (el reparto no la puede romper) o aviso (se informa y el usuario decide).
- Paso del algoritmo donde actúa.

Ningún número puede quedar escrito dentro del código. El inventario encontró varios fuera del registro (18/14/10, 0,85, 1,25, los descansos y otros): cada uno entra al registro con su fuente, se justifica como E4 o se elimina.

**Evidencia ya investigada** (`docs/research/nucleo-v2-evidencia.md`)

- **Conteo fraccionado** (directa 1, indirecta 0,5, ninguna 0): que el fraccionado prediga mejor que contar todo o solo lo directo es **E2 con salvedad** (Pelland et al. 2026, *Sports Med* 56(2):481-505, doi 10.1007/s40279-025-02344-w, revisado por pares; leído solo en resumen). El valor 0,5 es **criterio de diseño** (convención de los autores).
- **Descansos:** fijos, tomados del registro. Hay un piso de 60 a 90 s respaldado (E2 con salvedad); los valores por tipo de ejercicio son criterio de diseño (E4). Usar el descanso real registrado en las sesiones queda para después.
- **Cobertura mínima por tipo de sesión:** sin evidencia directa; sigue siendo criterio de diseño (E4).
- **18/14/10, 0,85 y 1,25:** ningún estudio respalda los valores puntuales. Entran al registro con nombres que dicen lo que son: `NECESIDAD_SEMANAL_POR_NIVEL` (18, 14 y 10), `FACTOR_NECESIDAD_DEFINICION` (0,85) y `FACTOR_NECESIDAD_ENFASIS` (1,25). Campo de fuente de las tres entradas: **"rango general consistente con la literatura; valores puntuales sin respaldo, criterio de diseño E4"**. Los identificadores de fuente `SCHOENFELD_VOL` y `HELMS_TRAIN` dejan de usarse como etiqueta de estos números.

## Fuera del núcleo v2

- **Cardio, intensidad, progresión, descarga y poses** siguen como están, con sus números movidos al registro (con su nivel de evidencia o como criterio de diseño). **Única excepción:** el cardio programado en un día se descuenta del tiempo disponible de esa sesión (paso 1). El cardio solo se asigna a un día si el usuario lo programa ahí.
- **Bandera salud/funcional (DEC-005):** se conserva igual y pasa al registro. Entrada del cardio mínimo (`CARDIO_MINIMO_SALUD`): **150 min por semana de actividad aeróbica moderada, E1**, fuente: directrices de la OMS 2020 (Bull FC et al., *Br J Sports Med* 2020;54(24):1451-1462, doi 10.1136/bjsports-2020-102955, PMID 33239350; ISBN 9789240015128), que lo plantean como el extremo inferior del rango de 150 a 300 min por semana para adultos de 18 a 64 años, como mínimo de salud para la población general (no como recomendación de composición corporal ni de rendimiento: aplicarlo a un plan de definición es una extrapolación). Las 3 sesiones de 50 min, el 60–70 % de la frecuencia cardíaca máxima y su distribución son criterio de diseño (E4). Verificado por el investigador (texto completo parcial del artículo; ver `docs/research/nucleo-v2-evidencia.md`, punto E). Hoy: en definición mantiene el cardio en 150 min por semana (3 sesiones de 50 min a intensidad moderada) en vez de recortarlo, y en los días de pierna suma búlgara con mancuernas, step-up con carga y paseo del granjero (este último aparte, 2 series y sin contar como volumen), financiando las series con un aislamiento del mismo grupo.
- **Cardio de mantenimiento y volumen (decidido el 2026-11-08):** los 50 min por semana (2 sesiones de 25 min) son criterio de diseño (E4) y **no llevan la cita de la OMS**; la OMS solo respalda el piso de 150 min de la bandera salud/funcional. Si ese mínimo aplica a todas las fases queda abierto en B-040. Con el núcleo nuevo, el cardio programado se descuenta de la capacidad de la sesión (paso 1).
- Nutrición, metas, tamizaje de salud y registro de sesiones (DEC-015) no cambian, salvo el selector de variante y la rutina corta como modo de capacidad.

## El corte

| Se conserva | Se reescribe | Se descarta |
| --- | --- | --- |
| DEC aceptados, especificaciones, escala de evidencia, investigación | Los 26 tests que se conservan en intención, contra el núcleo nuevo | Los 24 tests de detalles internos, regression.test.js y los 4 archivos de fixtures |
| Los 120 tests de comportamiento | El catálogo, migrado a patrón y variante | El motor de reparto actual y sus pasos correctivos |
| El barrido de 360 planes y el caso del 5 nov como referencias | El registro de reglas, con todos los números dentro | El código muerto del inventario y el camino legado de aceptación de sesiones largas |
| La interfaz de sesión, con selector de variante agregado | La rutina corta, como modo de capacidad | El código de las cláusulas de DEC-015, DEC-016 y DEC-018 que DEC-023 reemplaza |

Desde el corte también quedan reemplazadas la cláusula del tope de 25 series de DEC-014 (por DEC-024, Aceptado) y la de R1 como aviso de DEC-014 (por DEC-025, Aceptado).

**Pasos del corte, en orden**

1. Terminar o descartar la sesión en curso.
2. Exportar el historial de los dos perfiles con `scripts/exportar-historial.js` y validar que la cantidad de sesiones y series exportadas sea igual a la que muestra la app. Sin esta validación no hay reset.
3. Archivar la exportación fuera de la app.
4. Mergear el PR del corte, que conecta `core-v2` a la interfaz y borra el motor viejo y su código muerto.
5. Resetear los datos y crear los perfiles de nuevo, con los campos nuevos.

**Estrategia de construcción (decidida por Emanuel el 2026-11-08).** Reemplaza la idea de una rama larga con un solo PR:

- El núcleo se construye en `ifbb-pro-agent/js/core-v2/` y **se mergea a `main` paso a paso** (primero catálogo y registro, después reparto), **sin conectarlo a la interfaz**. La app actual sigue usando el motor viejo, sin parches.
- **Cada paso es un PR con base `main`, con sus tests.**
- El módulo lleva una **marca de "en construcción"** (comentario al inicio de cada archivo) y la entrada **B-039** del backlog como referencia.
- **El PR del corte** conecta `core-v2`, borra el motor viejo y su código muerto, y hace el reset según los pasos anteriores. Los pasos 4 y 5 de la lista se leen en ese orden: el código del núcleo ya está en `main`, y el PR del corte es el que lo conecta y borra lo viejo.

Mientras tanto, la rutina corta no se usa y el día de tirón se ajusta a mano.

## Criterios de aceptación

El núcleo está listo para el corte cuando, en el barrido de 360 planes:

- [ ] Ninguna sesión supera su capacidad en minutos sin la aceptación explícita del usuario.
- [ ] Todo día de tirón tiene tirón vertical y horizontal, y su top set es un tirón.
- [ ] Ninguna sesión tiene el top set fuera del patrón principal de su tipo.
- [ ] La rutina corta tiene de 3 a 4 ejercicios y cabe en el tiempo fijado.
- [ ] Ninguna sesión por defecto tiene dos ejercicios de lumbar alta.
- [ ] Ningún músculo supera 11 series fraccionadas por sesión (DEC-025), o queda sin cubrir con el aviso único.
- [ ] Se reporta el **porcentaje de planes** (de los 360) en que R1 deja necesidad semanal sin cubrir, por músculo y por número de días; Emanuel lo revisa en la primera simulación del núcleo nuevo.
- [ ] La aceptación de una sesión se guarda en el plan y caduca al regenerarlo o al cambiar tiempo, días u objetivo del perfil.
- [ ] La frecuencia y las garantías de DEC-014, DEC-017 y DEC-020 se cumplen, o el usuario ve el aviso único.
- [ ] Los ejercicios prioritarios aparecen en todos los días de su patrón, salvo restricción de seguridad avisada.
- [ ] El patrón principal de cada sesión tiene al menos 4 series de trabajo, o el aviso único dice que no cupo en el tiempo (DEC-029).
- [ ] Todo grupo del perfil tiene por semana un ejercicio directo con 2 series o más, o el aviso único lo dice (DEC-029).
- [ ] No queda ningún número fuera del registro ni código muerto.
- [ ] El caso del 5 nov no reproduce el día de sentadilla y peso muerto rumano juntos.

**Decisiones tomadas por Emanuel (7 nov 2026)**

- Los rezagados y los de énfasis reducido no llevan peso extra en la cobertura marginal: el énfasis (0,85 y 1,25) se aplica una sola vez, sobre la necesidad.
- Límite de ejercicios prioritarios: **3**.
- Descansos fijos desde el registro, con piso de 60 a 90 s respaldado y valores por tipo como criterio de diseño; usar el descanso real registrado queda para después.
- Orden de la construcción: **catálogo y registro, después el reparto, después la interfaz**.

**Decisiones abiertas (de Emanuel)**

Ver la sección "Valores por defecto propuestos" de `docs/research/trazabilidad-nucleo-v2.md`: de los pasos parciales, solo quedan abiertas las decisiones reales de diseño que esa sección escala.
