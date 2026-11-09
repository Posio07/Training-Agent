# Training Agent: instrucciones para Claude Code

PWA offline de planes de entrenamiento y dieta con un validador basado en evidencia. Hoy la usan 2 personas; podría ser pública en ~1 año. Todo (código, docs, commits, PR) va en español.

## Mapa del repo

- `ifbb-pro-agent/`: la app. `js/core-v2/` (el núcleo del generador: `registro.js` con todas las reglas y sus números, `catalogo.js` con patrones y variantes, `reparto.js`, `plan.js` con el plan guardado, `sesion.js`, `aviso.js`, `dolor.js`, `almacen.js`, y `pantallas/` con perfil, entreno, sesión y progreso), `js/engine.js` (nutrición, métricas, medidas objetivo y tamizaje de salud; el entrenamiento ya no vive acá, B-047), `js/knowledge.js` (fuentes, divisiones, etiquetas, suplementos), `js/sessionStore.js` (sesión en curso, DEC-015), `js/app.js` (interfaz: perfiles, resumen, dieta, medidas, suplementos, progreso de peso y fuentes; monta las pantallas del núcleo), `sw.js` (service worker).
- `data/*.csv`: fuente de verdad ejercicio-músculo. `js/exerciseMuscles.js` es **generado**: no se edita a mano.
- `docs/decisions/DEC-XXX.md`: un archivo por DEC, fuente de verdad de la lógica de negocio (`DECISIONS.md` solo explica el formato). `docs/specs/validador.md`: spec del validador.
- `docs/backlog/B-XXX.md`: un archivo por pendiente (`docs/BACKLOG.md` solo trae las reglas). No hay índices guardados: GitHub lista las carpetas por nombre, y `node scripts/generar-indices.js` genera uno a pedido en `docs/indices.generado.md` (ignorado por git). `docs/VISION.md`: visión (solo la edita Emanuel). `docs/research/`: lecturas de fuentes.

## Comandos

```
node --test ifbb-pro-agent/tests/*.test.js            # tests unitarios (lo mismo que corre el CI)
node ifbb-pro-agent/tests/e2e.js                      # recorrido general en Chromium, sobre la app real
node ifbb-pro-agent/tests/e2e-recorrido.js            # recorrido de punta a punta del núcleo (prueba de aceptación)
node ifbb-pro-agent/tests/e2e-pantallas.js            # pantallas de perfil y plan
node ifbb-pro-agent/tests/e2e-sesion.js               # pantalla de sesión (variantes, A5, A6, reanudar)
node ifbb-pro-agent/tests/e2e-progreso.js             # progreso por variante e historial de sesiones
node ifbb-pro-agent/tests/e2e-aceptacion.js           # aceptación del aviso único y sus tres salidas
node ifbb-pro-agent/tests/e2e-agua.js                 # tarjeta de agua (DEC-019)
node ifbb-pro-agent/tests/e2e-import.js               # export → import con entrenamiento (B-001)
node scripts/aceptacion-nucleo-v2.js [--escribir]     # prueba de aceptación del núcleo sobre el barrido de 360 planes
node scripts/build-exercise-muscles.js [--check]      # regenera/comprueba el módulo de los CSV
node scripts/build-perfil-articular.js [--check]      # perfil articular del catálogo
node scripts/build-perfil-articular-variantes.js [--check]   # perfil articular de las variantes partidas
node scripts/generar-indices.js [--validar]   # genera docs/indices.generado.md (ignorado por git) o valida los archivos de DEC y backlog
node scripts/snapshot-core-v2.js                      # huellas de los 10 planes de referencia: solo si el cambio de salida es intencional y tiene DEC
```

Los E2E necesitan Playwright: `NODE_PATH=/opt/node22/lib/node_modules node ...` (o `NODE_PATH=$(npm root -g)`). Lo que comparten (servidor, navegador, siembra del almacenamiento) está en `tests/e2e-comun.js`.

Si cambia la app, sube `CACHE_VERSION` en `sw.js`.

## Matriz de decisión

**Ante la duda, nivel 2.**

| Nivel | Quién decide | Qué entra |
| --- | --- | --- |
| 1 | El agente | Bugs contra reglas **escritas** (DEC, spec), tests, docs, refactors **sin cambio de salida** del plan |
| 2 | El agente propone y **espera aprobación** | Cambios en el plan generado, valores numéricos, reglas nuevas, datos de músculos, modelo de datos |
| 3 | **Solo Emanuel** | Visión, alcance, prioridades, privacidad, arquitectura, cambiar o revertir DEC aceptados |

Cómo se escala: se describe el hallazgo, la opción recomendada y el costo de cada una, y se espera. Mientras tanto se hace todo lo que no depende de la respuesta.

## Reglas de trabajo

1. **Cada cambio de comportamiento lleva un DEC.** El agente lo crea con estado `Propuesto`; solo Emanuel lo pasa a `Aceptado`. Un DEC `Propuesto` no es base para otro trabajo. **La aceptación de un DEC la confirma el usuario con un comentario en el PR, desde su cuenta**: lo que se dice en el chat no basta, y el agente deja el DEC `Propuesto` hasta que ese comentario exista. Con el comentario, el agente edita el archivo del DEC en `docs/decisions/` (estado y "Decidido por") y cita el comentario.
2. **Si cambia el plan generado**, el PR lleva la tabla de antes y después con los 10 perfiles de referencia (`tests/fixtures/core-v2-plan-hashes.json`), con series y minutos por sesión.
3. **Toda regla numérica lleva nivel de evidencia (E1 a E4), fuente, DEC de origen y estado** (`implementada` o `pendiente`) en el registro de reglas (`js/core-v2/registro.js`). Un test comprueba el estado contra el uso real. El registro es para reglas de entrenamiento: las constantes de interfaz, las conversiones de unidad y las tolerancias numéricas no entran.
4. **La evidencia solo mueve relaciones entre categorías** (ninguna ↔ indirecta ↔ directa), como máximo un paso por estudio. Nunca pesos a medida por ejercicio.
5. **Privacidad según DEC-009.** Los datos de salud y el dolor por serie no salen del dispositivo ni entran al export.
6. **El registro funciona sin conexión; el server nunca es una dependencia.** Durante el año de prueba no se escriben migraciones de datos (DEC-023, ver abajo).
7. **Los tests deben fallar si se rompe la regla.** Verifícalo con una prueba de mutación; no actualices un baseline para "poner en verde" sin entender por qué cambió.
8. **Un archivo por entrada:** un PR que crea un DEC crea su `docs/decisions/DEC-XXX.md`; uno que abre un ítem crea su `docs/backlog/B-XXX.md`. No existe ningún índice que mantener ni otro archivo compartido para el contenido (así los PR no chocan entre sí). El CI valida que cada archivo tenga la forma esperada (`node scripts/generar-indices.js --validar`). **BACKLOG:** al abrir una tarea, ponla `en curso`; al entregarla, anota el PR y que queda pendiente de cierre. El agente agrega ítems solo como `propuesto`, y no reordena ni cierra ítems de Emanuel.
9. **No toques** `docs/VISION.md` ni el estado de un DEC `Aceptado`; no edites a mano `js/exerciseMuscles.js`.
10. **Al explicarle algo a Emanuel, usa lenguaje simple:** qué cambia, por qué importa y qué tiene que decidir. Los detalles técnicos (rutas, funciones, tablas, mutaciones, identificadores) van en el PR, no en el resumen. Lo que devuelven los subagentes es técnico: tradúcelo antes de contárselo.

## El corte al núcleo nuevo (hecho)

El corte (B-039, paso 3.9) ya ocurrió: `app.js` monta las pantallas de `js/core-v2/`, el motor viejo de entrenamiento y su catálogo se borraron, y el almacenamiento usa la clave `ifbb-agent:v2` (DEC-032). Los datos de la clave vieja (`ifbb-agent:v1`) quedan en el dispositivo, ignorados, hasta que un PR aparte los borre (B-046). Las cláusulas de DEC-015 (filas sin `setKey`), DEC-016 (migración de la aceptación) y DEC-018 (importar archivos viejos) ya no tienen código.

## Año de prueba (DEC-023, Aceptado el 2026-11-07; DEC-030 reemplaza su cláusula de exportación)

Durante el año de prueba **la retrocompatibilidad de datos no es requisito**: el formato del almacenamiento y del plan puede cambiar sin migración. **El reset del corte es completo y sin exportación** (DEC-030): Emanuel lleva su propio registro fuera de la app, y los perfiles se recrean después del corte. **El código que una decisión deja muerto se elimina en el mismo PR**: migraciones, campos legados, caminos sin uso y los tests que solo fijaban ese detalle; los tests de comportamiento se conservan.

## Fuentes e identificadores

**Nunca inventes ni completes identificadores:** SHA, números de PR, URLs, DOI, PMID, citas ni nombres de autores. Obtenlos siempre de la fuente real (`git rev-parse`, la API de GitHub, Crossref, PubMed). Si no puedes verificarlos, dilo. Al citar, di qué se leyó de verdad: texto completo, resumen o material secundario. Un resumen no es una fuente primaria.

## Ramas y PR

- Trabaja en una rama propia; nunca en `main`. Un tema, un PR.
- **Nada de PRs encadenados.** Todo PR tiene como base `main`. Si depende de otro, se abre cuando ese ya está mergeado (la rama de trabajo se puede preparar antes, pero el PR no se abre hasta entonces).
- **El agente no mergea ni empuja a `main`.** Lo bloquean los permisos de `.claude/settings.json`; Emanuel mergea a mano.
- El PR se describe con: qué cambia, tabla antes/después si cambia el plan, pruebas (con mutaciones) y decisiones que necesitan al usuario.
- Los commits y los PR terminan con las líneas de atribución que indique la sesión.

## Subagentes

- **Antes de entregar cualquier PR, invoca al subagente `revisor`** (`.claude/agents/revisor.md`) y resuelve o reporta sus hallazgos. Su veredicto no reemplaza la aprobación de Emanuel. **Si el revisor bloquea, la corrección vuelve a pasar por el revisor antes del merge**: el agente no avisa que un PR está listo para mergear con un bloqueo corregido pero sin segunda pasada. Al invocarlo de nuevo, el agente le entrega el veredicto anterior y sus bloqueos.
- **Ante preguntas de evidencia científica, invoca al subagente `investigador`** (`.claude/agents/investigador.md`). Lo que entrega es una propuesta de nivel 2.

## Estilo

Escribe código que se lea como el que lo rodea: misma densidad de comentarios, mismos nombres, mismo idioma (español). Los comentarios citan el DEC que explican. No agregues dependencias ni extensiones exóticas.
