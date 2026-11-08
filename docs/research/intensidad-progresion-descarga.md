# Intensidad, progresión y descarga: evidencia de cada número (paso 3.5)

Informe del investigador del 2026-11-08, para el requisito del corte de B-039 (los números de intensidad, progresión y descarga entran al registro con su nivel revisado) y DEC-033. Es una **propuesta de nivel 2**: el registro conserva los valores actuales de `engine.js` (líneas ~1178-1180) y los registra como E4; lo que sigue dice qué respaldo tiene cada uno.

## Qué se leyó de verdad

| Fuente | Lectura |
| --- | --- |
| ACSM 2026 (Currier et al.) | **Texto completo, pp. 851-866**, en una copia en PDF de un tercero. Faltan las referencias y el material suplementario. |
| ACSM 2009 (Ratamess et al.) | **Texto completo, pp. 687-695**, en una copia en PDF de un tercero. No se leyó de la p. 696 en adelante. |
| Helms et al. 2015 | **Solo resumen**, parafraseado por la herramienta de lectura. |
| Bell et al. 2023 (Delphi sobre descargas) | Texto completo en PMC, pasado por una herramienta que resume; los porcentajes de acuerdo no se reverificaron a mano. |
| Robinson 2024, Refalo 2023, Plotkin 2022, Coleman 2024, Schoenfeld 2021, Helms 2016 | Resumen o metadatos únicamente. |

El repo no tenía lecturas previas del ACSM 2009 ni del texto completo de Helms 2015. `docs/research/nucleo-v2-evidencia.md` ya leyó el ACSM 2026 completo para otros puntos.

## Número por número

Escala del repo: E1 estándar oficial, E2 metaanálisis o revisión sistemática, E3 preprint, E4 criterio de diseño o heurística (las revisiones narrativas van en E4, como Spiering 2021).

| Número | Respaldo | Qué dice la fuente | Nivel propuesto por el investigador | Nivel registrado | Confianza |
| --- | --- | --- | --- | --- | --- |
| 6-12 repeticiones | Sí (ACSM 2009, Helms 2015) | ACSM 2009: 1-12 RM con énfasis en 6-12 (p. 694, evidencia C); 8-12 en novatos e intermedios (evidencia A). Helms 2015: la mayoría en 6-12. ACSM 2026 (Tabla 4): la carga no influye en la hipertrofia y no da rango. | E1 con salvedad (la guía de 2009 la reemplaza el 2026); alternativa E4 con cita | **E4** (más conservador; E1 es decisión de Emanuel, DEC-033 alternativa B) | Alta en la cita; media en el nivel |
| 70-80 % del 1RM | Parcial | Helms 2015: 70-80 %. ACSM 2009: 70-85 % (novatos e intermedios, evidencia A). ACSM 2026: hipertrofia similar de 30 a 100 %. | E4 para el recorte; E1 solo para el 70-85 % | **E4** | Media-alta |
| RIR 1-3 | Parcial | ACSM 2026 p. 865: 2-3 RIR; p. 866: evidencia insuficiente para fijar RIR. El límite de 1 no sale de ninguna fuente. | E4 | **E4** | Media |
| Aislamientos hasta 15 repeticiones | Parcial | Helms 2015: ~3-15. ACSM 2026: monoarticular frente a multiarticular, no determinable. | E4 | **E4** | Media-baja |
| Cambio de carga 2-10 % | Sí, el envolvente | ACSM 2009 p. 690 (evidencia B): subir 2-10 % tras 1-2 repeticiones sobre el objetivo en dos sesiones consecutivas (sección de fuerza). | E1 para el envolvente | (no se registra el envolvente) | Alta |
| 2-5 % (superior) y 5-10 % (inferior) | **No** | El ACSM 2009 dice porcentaje menor para poca masa muscular y mayor para mucha; no dice 2-5 ni 5-10 ni tren superior/inferior. | E4 | **E4** | Alta en que no está en la fuente |
| Doble progresión | Parcial (el concepto) | ACSM 2009 p. 690 lista subir la carga dentro de una zona prescrita; Plotkin 2022 (resumen): subir carga o repeticiones da adaptaciones similares. El disparo de la app (rango alto en todas las series) es otra regla. | E4 | **E4** | Media-alta |
| Descarga cada 4-6 semanas | Práctica, no evidencia | Bell 2023: se hace "generalmente cada 4-6 semanas por ~7 días"; el panel no acordó un intervalo y los autores dicen que no está claro que la descarga sea necesaria. | E4 | **E4** | Media-alta |
| Descarga tras 2 sesiones de caída | **No** | Bell 2023: fatiga, sin número de sesiones. | E4 | **E4** | Media-alta |
| Volumen a la mitad una semana, con la carga | Parcial (la dirección) | Bell 2023: acuerdo en bajar el volumen y mantener la intensidad (95,2 %), sin porcentaje. Coleman 2024: una semana sin entrenar no cambió la hipertrofia del tren inferior (pausa total, no media carga). | E4 | **E4** | Media |

## Observaciones del investigador

- **Postura de las fuentes frente al uso en la app.** El ACSM 2026 dice que no hay evidencia suficiente para fijar objetivos exactos de RIR y que la carga, el fallo y la periodización no influyen en la hipertrofia: la app los usa como reglas concretas, con más firmeza. El ACSM 2026 critica la guía de 2009 por falta de rigor basado en evidencia. Bell 2023 es consenso de expertos y sus autores señalan que es incierto que la descarga sea necesaria.
- **Escala E3.** Los documentos del repo (`nucleo-v2-evidencia.md` y la spec del validador) definen E3 como "preprint"; conviene unificar antes de usarla.
- **`knowledge.js`, `ACSM_RT`.** Lo que dice (70-85 %, 8-12 repeticiones, 1-3 series en novatos) coincide con la p. 694 del ACSM 2009; el "descanso 1-3 min" une dos recomendaciones de evidencia C (1-2 min en novatos e intermedios; 2-3 min en los ejercicios principales pesados de avanzados).
- **Hallazgo lateral.** La p. 851 del ACSM 2026 confirma en texto completo "≥10 series por semana" para hipertrofia, lo que respalda `PISO_SEMANAL_GRUPO` (hoy contrastado solo con la infografía).

## Referencias (verificadas por el investigador en PubMed y Crossref)

- Ratamess NA et al. (ACSM). *Progression models in resistance training for healthy adults.* Med Sci Sports Exerc 2009;41(3):687-708. doi 10.1249/MSS.0b013e3181915670. PMID 19204579.
- Currier BS et al. (ACSM). *Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews.* Med Sci Sports Exerc 2026;58(4):851-872. doi 10.1249/MSS.0000000000003897. PMID 41843416.
- Helms ER et al. J Sports Med Phys Fitness 2015;55(3):164-78. PMID 24998610.
- Helms ER, Cronin J, Storey A, Zourdos MC. Strength Cond J 2016;38(4):42-49. doi 10.1519/SSC.0000000000000218. PMID 27531969.
- Refalo MC et al. Sports Med 2023;53(3):649-665. doi 10.1007/s40279-022-01784-y. PMID 36334240.
- Robinson ZP et al. Sports Med 2024;54(9):2209-2231. doi 10.1007/s40279-024-02069-2. PMID 38970765.
- Plotkin D et al. PeerJ 2022;10:e14142. doi 10.7717/peerj.14142. PMID 36199287.
- Coleman M et al. PeerJ 2024;12:e16777. doi 10.7717/peerj.16777. PMID 38274324.
- Bell L et al. Sports Med Open 2023;9(1):87. doi 10.1186/s40798-023-00633-0. PMID 37730925.
- Schoenfeld BJ et al. Sports (Basel) 2021;9(2):32. doi 10.3390/sports9020032. PMID 33671664.
