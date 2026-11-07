# Núcleo v2 del generador — Especificación

7 nov 2026 · Emanuel Miranda

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
- **Variante:** el ejercicio concreto, con id propio (press militar con barra, press militar con mancuernas). Cada variante tiene su aporte por músculo (formato largo, DEC-013), su perfil articular (Fase 3) y su tiempo por serie. Desaparecen los ejercicios con "o" en el nombre.
- El usuario elige la variante en la sesión; por defecto, la última que usó. El progreso se registra por variante.

**Perfil del usuario: campos nuevos**

| Campo | Qué es | Uso |
| --- | --- | --- |
| Tiempo disponible por día | Minutos por sesión, con un valor general y la opción de cambiarlo por día | Es la capacidad de cada sesión en el reparto |
| Ejercicios prioritarios | Hasta tres variantes que el usuario quiere siempre (por ejemplo dominadas y fondos) | Entran fijos en los días cuyo tipo de sesión incluye su patrón, antes del relleno |
| Incluir remo con barra | Casilla, como en DEC-022 | Habilita esa variante; aplican A2 y A3 |

Un ejercicio prioritario no convierte la rutina en calistenia: solo garantiza su lugar. Si una lesión declarada lo contraindica (A7) o si la bandera de dolor de su zona está activa (A6), la seguridad gana sobre la preferencia y la app lo avisa. Las variantes con peso corporal registran la carga añadida o la asistencia para poder seguir el progreso.

**Rutina corta:** deja de ser un recorte de la interfaz. Es la misma sesión generada con menos tiempo disponible, que el usuario fija al empezarla ("hoy tengo 45 minutos").

## Tipos de sesión

Cada día del split tiene un tipo, y el tipo define los patrones obligatorios y dónde va el top set. Esto reemplaza la rotación por el catálogo, que es la causa común del día de tirón con press militar y de la rutina corta de un ejercicio.

| Tipo | Patrones obligatorios | Top set |
| --- | --- | --- |
| Empuje | Empuje horizontal y empuje vertical | Empuje horizontal |
| Tirón | Tirón vertical y tirón horizontal | Tirón (vertical u horizontal, según el perfil) |
| Pierna con sentadilla | Sentadilla y flexión de rodilla | Sentadilla |
| Pierna con bisagra | Bisagra y flexión de rodilla | Bisagra |
| Torso | Un empuje y un tirón | Según la rotación semanal |
| Cuerpo completo | Un patrón de pierna, un empuje y un tirón | Según la rotación semanal; nunca dos de lumbar alta en la misma sesión |

- El top set va siempre al patrón principal del tipo, nunca al primer ejercicio de la lista.
- A3 queda expresada aquí: en splits con dos días de pierna, uno es con sentadilla y otro con bisagra, separados por 48 h o más.
- La rutina corta se arma con los patrones obligatorios del tipo, de 3 a 4 ejercicios.

Los patrones obligatorios son un criterio de diseño (E4). El investigador debe buscar respaldo para la cobertura mínima por tipo de sesión.

## Algoritmo de reparto

Un solo paso, en este orden. Ningún paso posterior corrige a uno anterior.

1. **Capacidad.** Cada sesión tiene como capacidad los minutos disponibles del perfil, o los del día si el usuario los cambió. La duración de una serie es el tiempo de trabajo más el descanso de esa variante, ambos tomados del registro de reglas.
2. **Restricciones de seguridad.** Se aplican las lesiones declaradas (A7, cuando tenga fuente), las banderas de dolor activas (A6) y las variantes habilitadas por el perfil.
3. **Estructura.** Se ubican los patrones obligatorios de cada tipo de sesión y los ejercicios prioritarios del usuario.
4. **Demandas mínimas.** La garantía de series reales de los grupos mayores (DEC-014), el piso de mantenimiento (DEC-017) y el mínimo de grupos chicos (DEC-020) entran como demandas que el reparto debe cubrir, no como correcciones posteriores.
5. **Relleno por cobertura marginal.** Mientras quede capacidad, entra la serie candidata con más necesidad no cubierta por minuto. La necesidad se mide en series fraccionadas, así que un ejercicio redundante aporta poco: si el press de banca ya cubrió deltoide anterior y tríceps, el press militar suma menos que las elevaciones laterales, que cubren el deltoide lateral con pocos músculos adicionales. Ningún músculo supera el umbral de R1 (11 series por sesión).
6. **Orden y top set.** Se aplica A1 (lumbar alta primero, luego multiarticulares, al final aislamientos) y el top set va al patrón principal del tipo de sesión.
7. **Si no alcanza.** Si las demandas mínimas no entran en la capacidad, la app muestra un solo aviso con tres salidas: más tiempo ese día, más días o aceptar el plan con esas demandas sin cubrir.

**Quién cede cuando no entra todo.** La cobertura marginal decide qué ejercicio cede: sale primero el que menos necesidad no cubierta aporta por minuto. La prioridad de los grupos pondera esa necesidad: los rezagados pesan más y los de énfasis reducido pesan menos. Los patrones obligatorios y las demandas mínimas no ceden.

**Límite conocido.** El paso 5 elige la mejor serie en cada momento, no el plan óptimo global. Se acepta porque cada decisión se puede explicar: la app puede mostrar por qué está cada ejercicio.

## Registro único de reglas

Todas las reglas y todos los números del núcleo viven en un solo registro (hoy `VALIDATOR_RULES`). Cada entrada lleva:

- Identificador y DEC de origen.
- Nivel de evidencia (E1 a E4) y fuente, o "criterio de diseño" si es E4 sin fuente.
- Tipo: estricta (el reparto no la puede romper) o aviso (se informa y el usuario decide).
- Paso del algoritmo donde actúa.

Ningún número puede quedar escrito dentro del código. El inventario encontró varios fuera del registro (18/14/10, 0,85, 1,25, los descansos y otros): cada uno entra al registro con su fuente, se justifica como E4 o se elimina.

**Tareas para el investigador antes de implementar**

- Descansos por tipo de ejercicio, porque ahora definen la duración de la sesión y por lo tanto su capacidad.
- Tiempo de trabajo por serie según el rango de repeticiones.
- Respaldo para la cobertura mínima por tipo de sesión.
- Fuente para los números 18/14/10, 0,85 y 1,25.

## El corte

| Se conserva | Se reescribe | Se descarta |
| --- | --- | --- |
| DEC aceptados, especificaciones, escala de evidencia, investigación | Los 26 tests que se conservan en intención, contra el núcleo nuevo | Los 24 tests de detalles internos, regression.test.js y los 4 archivos de fixtures |
| Los 120 tests de comportamiento | El catálogo, migrado a patrón y variante | El motor de reparto actual y sus pasos correctivos |
| El barrido de 360 planes y el caso del 5 nov como referencias | El registro de reglas, con todos los números dentro | El código muerto del inventario y el camino legado de aceptación de sesiones largas |
| La interfaz de sesión, con selector de variante agregado | La rutina corta, como modo de capacidad | El código de las cláusulas de DEC-015, DEC-016 y DEC-018 que DEC-023 reemplaza |

**Pasos del corte, en orden**

1. Terminar o descartar la sesión en curso.
2. Exportar el historial de los dos perfiles con `scripts/exportar-historial.js` y validar que la cantidad de sesiones y series exportadas sea igual a la que muestra la app. Sin esta validación no hay reset.
3. Archivar la exportación fuera de la app.
4. Mergear el núcleo nuevo en un solo PR, que incluye el borrado del código muerto.
5. Resetear los datos y crear los perfiles de nuevo, con los campos nuevos.

El núcleo nuevo se construye en una rama mientras la app actual sigue en uso, sin parches al motor viejo. Mientras tanto, la rutina corta no se usa y el día de tirón se ajusta a mano.

## Criterios de aceptación

El núcleo está listo para el corte cuando, en el barrido de 360 planes:

- [ ] Ninguna sesión supera su capacidad en minutos sin la aceptación explícita del usuario.
- [ ] Todo día de tirón tiene tirón vertical y horizontal, y su top set es un tirón.
- [ ] Ninguna sesión tiene el top set fuera del patrón principal de su tipo.
- [ ] La rutina corta tiene de 3 a 4 ejercicios y cabe en el tiempo fijado.
- [ ] Ninguna sesión por defecto tiene dos ejercicios de lumbar alta.
- [ ] Ningún músculo supera 11 series por sesión.
- [ ] La frecuencia y las garantías de DEC-014, DEC-017 y DEC-020 se cumplen, o el usuario ve el aviso único.
- [ ] Los ejercicios prioritarios aparecen en todos los días de su patrón, salvo restricción de seguridad avisada.
- [ ] No queda ningún número fuera del registro ni código muerto.
- [ ] El caso del 5 nov no reproduce el día de sentadilla y peso muerto rumano juntos.

**Decisiones abiertas (de Emanuel)**

- Cuánto pesan los rezagados y los de énfasis reducido en la cobertura marginal. Propuesta: arrancar con 1,5 y 0,5, y ajustarlo con datos propios.
- Límite de ejercicios prioritarios: propuesta de tres.
- Si la duración estimada usa descansos fijos por tipo de ejercicio o el descanso real registrado en las sesiones.
- Orden de la construcción: propuesta de catálogo y registro primero, después el reparto y por último la interfaz.
