# DECISIONS.md — Reglas de negocio de IFBB Pro Agent

Cada decisión lleva su nivel de respaldo:
**[Posicionamiento]** sociedad oficial · **[Evidencia]** metaanálisis o revisión · **[Criterio]** juicio práctico, sin estándar específico.

**Estado de cada DEC** (línea justo bajo el título): `Propuesto` (lo creó el agente; no vale como base de otro trabajo hasta que Emanuel lo acepte) · `Aceptado` · `Reemplazado`. Cada DEC dice **quién lo decidió**. El agente solo crea DEC como `Propuesto`; **solo Emanuel** los pasa a `Aceptado`, y solo él cambia o revierte uno aceptado. La línea `Estado: implementada` que cierran algunos DEC es otra cosa: dice si el código ya lo aplica.

Este archivo es la fuente de verdad de la lógica de negocio. Antes de cambiar cualquier cálculo del motor (`ifbb-pro-agent/js/engine.js`), consultarlo.

**Un archivo por DEC** (`docs/decisions/<código>.md`): un PR que crea o cambia un DEC crea o edita solo su archivo y agrega su fila a este índice. El contenido de cada DEC es el mismo que tenía este archivo.

| DEC | Título | Estado |
| --- | --- | --- |
| [DEC-001](docs/decisions/DEC-001.md) | Grupos rezagados | Aceptado |
| [DEC-002](docs/decisions/DEC-002.md) | Top set de fuerza en definición | Aceptado |
| [DEC-003](docs/decisions/DEC-003.md) | Tope por sesión | Aceptado y luego reemplazado por DEC-003 v2 |
| [DEC-003 v2](docs/decisions/DEC-003-v2.md) | Distribución balanceada + aviso de tope | Aceptado |
| [DEC-006](docs/decisions/DEC-006.md) | Sin patrones duplicados por sesión | Aceptado |
| [DEC-007](docs/decisions/DEC-007.md) | Tiempo de unilaterales | Aceptado |
| [DEC-004](docs/decisions/DEC-004.md) | Aviso de inconsistencia en % de grasa | Aceptado |
| [DEC-005](docs/decisions/DEC-005.md) | Objetivo "salud/funcional" | Aceptado |
| [DEC-008](docs/decisions/DEC-008.md) | Elegibilidad del top set | Aceptado |
| [PRINCIPIO RECTOR](docs/decisions/PRINCIPIO-RECTOR.md) | Adaptación por salud | — |
| [DEC-009](docs/decisions/DEC-009.md) | Condiciones de salud y lesiones | Aceptado |
| [DEC-010](docs/decisions/DEC-010.md) | Aporte de volumen por ejercicio (base del validador) | Aceptado |
| [DEC-011](docs/decisions/DEC-011.md) | Lesiones: autorización profesional por zona, precauciones E4 y aviso por dolor | Aceptado |
| [DEC-012](docs/decisions/DEC-012.md) | Tabla de músculos por ejercicio en un CSV versionado, con nivel de evidencia | Aceptado |
| [DEC-013](docs/decisions/DEC-013.md) | Datos v2: relación ejercicio-músculo en formato largo, bucket separado y reglas de evidencia | Aceptado |
| [DEC-014](docs/decisions/DEC-014.md) | Fase 2 del validador: conteo fraccionado, regla E4 (tope por sesión) y aviso de rendimiento decreciente (R1) | Aceptado |
| [DEC-015](docs/decisions/DEC-015.md) | Integridad del registro de sesión: sesión persistente, edición de series y cronómetro por timestamp | Aceptado |
| [DEC-016](docs/decisions/DEC-016.md) | Tres correcciones del validador: bucket directo, aceptación del tope acotada y aviso de grupos bajo el mínimo | Aceptado |
| [DEC-017](docs/decisions/DEC-017.md) | Completar hasta el piso semanal dentro del tope E4, con piso de mantenimiento para grupos de énfasis reducido | Aceptado |
| [DEC-018](docs/decisions/DEC-018.md) | El import restaura el entrenamiento registrado (workouts y sessions) | Aceptado |
| [DEC-019](docs/decisions/DEC-019.md) | La tarjeta de agua muestra agua total (bebidas + alimentos), no litros de bebida | Propuesto |
| [DEC-020](docs/decisions/DEC-020.md) | Mínimo semanal por grupo dentro del tope E4 (grupos chicos) | Aceptado |
| [DEC-021](docs/decisions/DEC-021.md) | Fase 3, Paso 1: tabla `perfil_articular` de todo el catálogo | Aceptado |
| [DEC-022](docs/decisions/DEC-022.md) | Fase 3, Paso 2: A1 (orden por demanda) y A3 (sentadilla y bisagra pesadas en días distintos) en el generador | Aceptado |
| [DEC-023](docs/decisions/DEC-023.md) | Año de prueba: sin retrocompatibilidad de datos, exportación antes de cada reset y código muerto fuera en el mismo PR | Aceptado |
| [DEC-024](docs/decisions/DEC-024.md) | El tope de sesión pasa de 25 series a minutos disponibles | Aceptado |
| [DEC-025](docs/decisions/DEC-025.md) | R1 pasa de aviso a restricción del reparto | Aceptado |
| [DEC-026](docs/decisions/DEC-026.md) | Once reglas del núcleo v2 sin DEC de origen se ratifican como criterio de diseño (E4) | Aceptado |
| [DEC-027](docs/decisions/DEC-027.md) | El indicador "Hoy" pasa a "Siguiente" y sigue el orden del split, no la fecha | Aceptado |
| [DEC-028](docs/decisions/DEC-028.md) | El top set va al patrón principal del tipo de sesión, no al primer ejercicio elegible | Aceptado |
| [DEC-029](docs/decisions/DEC-029.md) | Estructura del reparto: volumen propio del patrón principal y un ejercicio directo por grupo y semana | Aceptado |
| [DEC-030](docs/decisions/DEC-030.md) | El reset del corte es completo y sin exportación del historial | Aceptado |
| [DEC-031](docs/decisions/DEC-031.md) | Tope de 5 series por ejercicio y sesión; el excedente pasa a otra variante del mismo patrón | Aceptado |
| [DEC-032](docs/decisions/DEC-032.md) | El reset del corte cambia la clave de almacenamiento y conserva los datos viejos dos semanas | Aceptado |
| [DEC-033](docs/decisions/DEC-033.md) | Los números de intensidad, progresión y descarga entran al registro como criterio de diseño (E4) | Aceptado |
| [DEC-034](docs/decisions/DEC-034.md) | En el núcleo v2 la bandera de dolor se marca por zona (lumbar, hombro, rodilla), con A4 y A5 ligadas a ella | Aceptado |
| [DEC-035](docs/decisions/DEC-035.md) | Con la bandera salud/funcional, los ejercicios funcionales entran fijos en la estructura del día | Aceptado |
