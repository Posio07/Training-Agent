# DECISIONS.md — Reglas de negocio de IFBB Pro Agent

Cada decisión lleva su nivel de respaldo:
**[Posicionamiento]** sociedad oficial · **[Evidencia]** metaanálisis o revisión · **[Criterio]** juicio práctico, sin estándar específico.

**Estado de cada DEC** (línea justo bajo el título): `Propuesto` (lo creó el agente; no vale como base de otro trabajo hasta que Emanuel lo acepte) · `Aceptado` · `Reemplazado`. Cada DEC dice **quién lo decidió**. El agente solo crea DEC como `Propuesto`; **solo Emanuel** los pasa a `Aceptado`, y solo él cambia o revierte uno aceptado. La línea `Estado: implementada` que cierran algunos DEC es otra cosa: dice si el código ya lo aplica.

Este archivo es la fuente de verdad de la lógica de negocio. Antes de cambiar cualquier cálculo del motor (`ifbb-pro-agent/js/engine.js`), consultarlo.

**Un archivo por DEC**, en `docs/decisions/<código>.md` (GitHub lista la carpeta por nombre): un PR que crea o cambia un DEC crea o edita solo su archivo. **No hay índice guardado en el repo**: si lo necesitas, `node scripts/generar-indices.js` lo genera en `docs/indices.generado.md` (ignorado por git).
