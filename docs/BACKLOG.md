# Backlog

Lista viva de pendientes. Última revisión: 2026-11-08.

## Reglas de este archivo

- **Estados:** `propuesto` (lo sugirió el agente, sin decisión del usuario) · `abierto` (el usuario lo quiere hacer, aún no empezó) · `en curso` · `cerrado`.
- **Dueño:** quien decide y prioriza. Hoy, Emanuel en todos los ítems; el agente ejecuta cuando Emanuel lo pide.
- **Solo Emanuel** crea ítems `abierto`, reordena, prioriza y cierra ítems suyos.
- **El agente puede:** agregar ítems como `propuesto`; pasar a `en curso` un ítem que Emanuel le pidió trabajar; anotar en *Notas* el PR o el DEC que lo toca y "entregado en PR n.º X, pendiente de cierre por Emanuel". No reordena ni cierra ítems de Emanuel. Puede retirar (cerrar con motivo) sus propios ítems `propuesto`.
- Cada fila lleva la fecha de su último cambio (AAAA-MM-DD). Las referencias a PR, DEC, commits e identificadores se copian de la fuente real, nunca de memoria.

## Ítems

Un archivo por entrada, en `docs/backlog/B-XXX.md` (GitHub lista la carpeta por nombre), con la fila completa (dueño, PR o DEC relacionado y notas). Un PR que abre o cambia un ítem crea o edita solo su archivo. **No hay índice guardado en el repo**: `node scripts/generar-indices.js` lo genera en `docs/indices.generado.md` (ignorado por git).


## Cerrados

*(vacío)*
