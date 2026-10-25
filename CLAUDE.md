# Training Agent: instrucciones para Claude Code

PWA offline de planes de entrenamiento y dieta con un validador basado en evidencia. Hoy la usan 2 personas; podría ser pública en ~1 año. Todo (código, docs, commits, PR) va en español.

## Mapa del repo

- `ifbb-pro-agent/`: la app. `js/engine.js` (plan y validador), `js/knowledge.js` (catálogo y `VALIDATOR_RULES`), `js/sessionStore.js` (sesión en curso, DEC-015), `js/app.js` (interfaz), `sw.js` (service worker).
- `data/*.csv`: fuente de verdad ejercicio-músculo. `js/exerciseMuscles.js` es **generado**: no se edita a mano.
- `DECISIONS.md`: los DEC, fuente de verdad de la lógica de negocio. `docs/specs/validador.md`: spec del validador.
- `docs/BACKLOG.md`: pendientes. `docs/VISION.md`: visión (solo la edita Emanuel). `docs/research/`: lecturas de fuentes.

## Comandos

```
node --test ifbb-pro-agent/tests/engine.test.js ifbb-pro-agent/tests/regression.test.js   # tests (el CI corre engine.test.js)
node ifbb-pro-agent/tests/e2e.js                      # recorrido en Chromium
node ifbb-pro-agent/tests/e2e-aceptacion.js           # E2E de la aceptación del tope E4
node scripts/build-exercise-muscles.js [--check]      # regenera/comprueba el módulo de los CSV
node scripts/snapshot-plan-hashes.js                  # huellas de los 30 planes: solo si el cambio de salida es intencional y tiene DEC
```

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

1. **Cada cambio de comportamiento lleva un DEC.** El agente lo crea con estado `Propuesto`; solo Emanuel lo pasa a `Aceptado`. Un DEC `Propuesto` no es base para otro trabajo.
2. **Si cambia el plan generado**, el PR lleva la tabla de antes y después con los 10 perfiles de referencia (`tests/fixtures/plan-identity-baseline.json`), con series y minutos por sesión.
3. **Toda regla numérica lleva nivel de evidencia (E1 a E4), fuente y estado** (`implementada` o `pendiente`) en `VALIDATOR_RULES`. Un test comprueba el estado contra el uso real.
4. **La evidencia solo mueve relaciones entre categorías** (ninguna ↔ indirecta ↔ directa), como máximo un paso por estudio. Nunca pesos a medida por ejercicio.
5. **Privacidad según DEC-009.** Los datos de salud y el dolor por serie no salen del dispositivo ni entran al export.
6. **El registro funciona sin conexión; el server nunca es una dependencia.**
7. **Los tests deben fallar si se rompe la regla.** Verifícalo con una prueba de mutación; no actualices un baseline para "poner en verde" sin entender por qué cambió.
8. **BACKLOG:** al abrir una tarea, ponla `en curso`; al entregarla, anota el PR y que queda pendiente de cierre. El agente agrega ítems solo como `propuesto`, y no reordena ni cierra ítems de Emanuel.
9. **No toques** `docs/VISION.md` ni el estado de un DEC `Aceptado`; no edites a mano `js/exerciseMuscles.js`.

## Fuentes e identificadores

**Nunca inventes ni completes identificadores:** SHA, números de PR, URLs, DOI, PMID, citas ni nombres de autores. Obtenlos siempre de la fuente real (`git rev-parse`, la API de GitHub, Crossref, PubMed). Si no puedes verificarlos, dilo. Al citar, di qué se leyó de verdad: texto completo, resumen o material secundario. Un resumen no es una fuente primaria.

## Ramas y PR

- Trabaja en una rama propia; nunca en `main`. Un tema, un PR.
- **El agente no mergea ni empuja a `main`.** Lo bloquean los permisos de `.claude/settings.json`; Emanuel mergea a mano.
- El PR se describe con: qué cambia, tabla antes/después si cambia el plan, pruebas (con mutaciones) y decisiones que necesitan al usuario.
- Los commits y los PR terminan con las líneas de atribución que indique la sesión.

## Subagentes

- **Antes de entregar cualquier PR, invoca al subagente `revisor`** (`.claude/agents/revisor.md`) y resuelve o reporta sus hallazgos. Su veredicto no reemplaza la aprobación de Emanuel.
- **Ante preguntas de evidencia científica, invoca al subagente `investigador`** (`.claude/agents/investigador.md`). Lo que entrega es una propuesta de nivel 2.

## Estilo

Escribe código que se lea como el que lo rodea: misma densidad de comentarios, mismos nombres, mismo idioma (español). Los comentarios citan el DEC que explican. No agregues dependencias ni extensiones exóticas.
