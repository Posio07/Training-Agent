# Verificación de fuentes (B-013)

Fecha: 2026-10-25. Origen: auditoría de identificadores del repo (Crossref y PubMed) y tres consultas del investigador. Todo lo de abajo son **propuestas de nivel 2**; lo que ya se aplicó está marcado.

## Cómo se verificó

- **Automático:** 23 DOIs contra Crossref, 27 PMIDs y 23 fuentes con URL de PubMed contra PubMed (autor, año, revista, volumen, páginas, DOI).
- **Investigador (tres consultas, solo lectura):** Silbernagel, Spiering y las 7 URLs bloqueadas. El subagente `investigador` aún no estaba cargado en la sesión, así que se corrió como agente general con las instrucciones de `.claude/agents/investigador.md`. **Incidente:** una de las consultas envió el correo del usuario como parámetro a Unpaywall. No se guardó nada, pero no debió pasar; ahora `investigador.md` lo prohíbe.

## 1. `SILBERNAGEL_2007` y el umbral 5/10 (aplicado en este PR)

- **Error 1:** la URL (PMID 17224440) es un artículo ajeno (Ogura Y et al., hipertermia por microondas).
- **Error 2:** la cita era *Br J Sports Med* 2007;41(4):276-80 (PMID 17261555, *Full symptomatic recovery…*). Ese artículo trata de síntomas vs. función músculo-tendón; su **resumen** no menciona el modelo de dolor (el cuerpo no se pudo leer: PMC devolvió 403 y 500). El modelo está en Silbernagel KG, Thomeé R, Eriksson BI, Karlsson J. *Am J Sports Med* 2007;35(6):897-906, PMID 17307888, DOI 10.1177/0363546506298279 (verificado en PubMed).
- **¿El 5/10 está en el texto completo de Silbernagel 2007? No se pudo comprobar.** El artículo es de pago (Europe PMC: no abierto ni en PMC; Unpaywall: sin copia; SAGE: 403). El resumen solo dice "pain-monitoring model".
- **Lo que sí se leyó (texto completo abierto, fuente secundaria):** Sprague AL, Couppé C, Pohlig RT, Snyder-Mackler L, Silbernagel KG. *Pilot Feasibility Stud* 2021;7(1):58, PMC7905015, DOI 10.1186/s40814-021-00792-5. Cita textual: "Originally described by Thomeé et al. for use in patellofemoral pain, the Pain-Monitoring Model provides guidelines for acceptable pain levels during activity… pain levels should not exceed a 5/10 on the numeric pain rating scale (NPRS) during or immediately after activity. Additionally, pain ratings should return to pre-activity levels by the following morning." y "In a prior randomized clinical trial (RCT), the Pain-Monitoring Model was adapted for use in Achilles tendinopathy" (referencia a Silbernagel 2007). Confirmado leyendo el texto, no solo el informe del investigador.
- **Matices:** (a) el origen del modelo es Thomeé 1997 (dolor patelofemoral, *Phys Ther* 77(12):1690-703, PMID 9413448; solo metadatos verificados); (b) la condición es "vuelve al nivel previo a la mañana siguiente", no "no empeora al día siguiente" como dice DEC-009; (c) otro protocolo de Aquiles usa 4/10 y 24 h: el número varía según la publicación; (d) la escala citada es NPRS, no VAS (la escala de Silbernagel 2007 no se pudo confirmar).
- **Qué dicen los autores vs. cómo lo usa la app:** los autores lo usan en tendinopatía de Aquiles. La app lo extiende a cualquier zona y a dolor por serie (criterio propio) y no implementa la condición de la mañana siguiente.
- **Aplicado:** `SILBERNAGEL_2007` (short, title, url) y `painFlagThreshold` (label, url, nota, `reviewRequired: true`). Nivel E4 sin cambios. Hasta leer el texto completo del AJSM, el 5/10 queda respaldado solo por la fuente secundaria.

## 2. `SPIERING_2021` (aplicado en este PR)

- **Error 1:** la URL (PMID 34132710) es química orgánica (Brandhofer T et al., *Chem Commun* 2021).
- **Error 2:** el artículo citado ("Progressive overload: a necessary perspective…", Spiering BA, Mujika I, Sharp MH, Foster C, *J Strength Cond Res* 2021;35(10):2919-33) **no se encontró** en PubMed (varias búsquedas), Crossref, Europe PMC ni la web. No se afirma que no exista. Los autores citados (Sharp **MH**, Foster **C**) difieren de los del artículo de mantenimiento (Sharp **MA**, Foulis **SA**), lo que sugiere una cita mal reconstruida (confianza media; no demostrado).
- **Qué respaldaba en la app:** el formato top set + back-off en definición (DEC-002, "Respaldo"; `engine.js` lo lista en las fuentes del entrenamiento).
- **Reemplazo aplicado:** `SPIERING_MANT_2021` = Spiering BA, Mujika I, Sharp MA, Foulis SA, *Maintaining Physical Performance: The Minimal Dose of Exercise Needed to Preserve Endurance and Strength Over Time*, *J Strength Cond Res* 2021;35(5):1449-1458, PMID 33629972, DOI 10.1519/JSC.0000000000003964. Solo se leyó el **resumen** (texto completo de pago).
- **Qué respalda y qué no:** los autores dicen que fuerza y tamaño muscular (al menos en jóvenes) se mantienen hasta 32 semanas con 1 sesión semanal y 1 serie por ejercicio si se mantiene la intensidad relativa; "la intensidad parece ser la variable clave". **No** dice nada del formato top set/back-off ni de la definición: respalda de forma parcial e indirecta la idea de mantener intensidad con menos volumen. La app no debe presentarlo como respaldo directo del formato. Resuelve también B-012 (el nombre ya no se confunde con `SPIERING_2021`).
- **Efecto en el plan:** solo cambia el id en las listas de fuentes (`plan.training.sources`, `plan.sourcesUsed`). Ninguna serie, duración ni ejercicio cambia.

## 3. Textos de DEC aceptados que habría que corregir (NO aplicado: nivel 3)

Son DEC aceptados; solo Emanuel decide si se tocan. Textos propuestos:

- **DEC-002, línea "Respaldo":** "Formato top set/back-off: [Criterio], construido sobre [Evidencia] Helms et al. 2015, Bickel, Cross & Bamman 2011 (ensayo: una dosis reducida preserva la hipertrofia en jóvenes) y Spiering et al. 2021, J Strength Cond Res 35(5):1449-58 (revisión narrativa: al reducir volumen y frecuencia, mantener la intensidad relativa parece ser la clave para conservar fuerza), y [Posicionamiento] ACSM 2009. Límite: estas fuentes respaldan mantener la intensidad con menos volumen, no el formato top set/back-off en sí." Y la línea de estado: fuentes `BICKEL_2011`, `SPIERING_MANT_2021`.
- **DEC-009, "Respaldo":** hoy cita el artículo de *Br J Sports Med* y dice "≤5 sin empeorar al día siguiente". Propuesta: citar Silbernagel et al. 2007, *Am J Sports Med* 35(6):897-906 (modelo adaptado de Thomeé 1997) y escribir "≤5/10 durante o justo después de la actividad y de vuelta al nivel previo a la mañana siguiente (descrito en Sprague 2021; texto completo de Silbernagel 2007 no leído)".

## 4. Otras referencias del repo que no coinciden del todo (NO aplicado)

Resultado de la tercera consulta. Las lecturas son limitadas (muchos sitios bloquean bots).

| Referencia | Qué dice el repo | Qué se leyó | Hallazgo y corrección propuesta |
| --- | --- | --- | --- |
| Navy, DTIC ADA143890 | "±3-4 % frente a DXA" | Solo metadatos (Crossref) y resumen secundario | La fuente (Hodgdon y Beckett, NHRC 84-11) validó contra pesaje hidrostático (EE ≈2,7 %GC en hombres), **no contra DXA**. Cambiar la cifra o quitar el DXA. Informe de mujeres (84-29): DOI 10.21236/ada146456 (solo Crossref). |
| EFSA 2010, agua | 2,0 L/día mujeres y 2,5 L/día hombres "más pérdidas por sudor" | Resumen (copia institucional) | Las cifras coinciden pero son **agua total** (bebidas y alimentos), a temperatura moderada y PAL 1,6. El "más sudor" es del repo, no del resumen. |
| ExRx Guidelines | "tabla ACSM 2026 vs 2009" (en el spec) | Solo snippet de buscador | No es una tabla comparativa; es de un tercero. Fuente primaria: ACSM Position Stand, *Med Sci Sports Exerc* 2026, DOI 10.1249/mss.0000000000003897 (Crossref). |
| Gabbett (USQ) | ratio agudo/crónico 1,3 (R3) | Solo registro por buscador | Es un capítulo de libro (Routledge, 2018), no evidencia primaria. Corregir el rótulo. Sigue E4. |
| Iraki 2019 (*Sports*) | cifras de superávit, proteína, grasa, carbohidratos | **Texto completo** (PMC6680710) | Coincide. Matiz: el 0,25-0,5 %/semana es para novatos e intermedios. |
| ACE 2018 | tamizaje ACSM / PAR-Q+ | **Texto completo** | Coincide. Es material secundario. |
| free-exercise-db | licencia de las imágenes | README y LICENSE | Unlicense, como dice el repo; el origen de las fotos no está documentado (riesgo de licencia, no un error verificado). |

## 5. Hallazgo aparte

La descripción de `BICKEL_2011` en `knowledge.js` ("variar la intensidad dentro de un mismo bloque… menor fatiga acumulada") **no aparece en el resumen** del artículo (verificado: el resumen no menciona "intensity"). El resumen habla de dosis reducidas (1/3 o 1/9) durante 32 semanas de mantenimiento. Queda en el backlog sin corregir.
