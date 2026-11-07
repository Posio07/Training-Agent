# B-026 · Datos biomecánicos de carga sobre la columna y el hombro para anclar el criterio de la Fase 3

Consulta del 2026-11-07 hecha por el subagente `investigador`. Complementa `docs/research/fase3-clasificacion.md` (que ya leyó las celdas de la tabla inicial) y revisa las **definiciones** del criterio de modelado E4 de `docs/specs/validador-fase3.md`, no solo los ejercicios. **Todo es una propuesta de nivel 2 para Emanuel: no cambia ningún dato, regla ni código.**

## Cómo se hizo (y sus límites)

- **Qué se leyó:** metadatos y **resúmenes** de PubMed (eutils). El lector de páginas parafrasea los resúmenes, así que las cifras salen de esa paráfrasis. **No se leyó ningún texto completo** ni se accedió a ningún muro de pago.
- **Identificadores:** el investigador usó los de PubMed; antes de copiarlos aquí se contrastaron de nuevo con PubMed (autor, año, revista, volumen, páginas y DOI), y a los que no traían PMID se les buscó por DOI. Todos coinciden (esto cubre los metadatos de cada cita, no que el resumen respalde cada cifra; las cifras de Cholewicki y Hamlyn vienen del documento previo y no se releyeron).
- **Escala:** el criterio es una definición de reglas (E4) y cada celda de `perfil_articular` es un dato. Se usa la escala `probable` / `a_verificar`. Ninguna fuente de abajo mide hipertrofia, así que `verificado` no aplica. Extender `probable` a las articulaciones sigue siendo decisión de Emanuel.
- **Lo que no hay:** ningún estudio compara, con números, todas las categorías entre sí. Las cifras de abajo ordenan por magnitud, no fijan umbrales.

## 1. Columna lumbar

Veredicto sobre las definiciones del criterio: **confirma**, **corrige** o **no concluye**.

| # | Fuente | Dato | Ejercicio(s) | Efecto sobre el criterio |
| --- | --- | --- | --- | --- |
| L1 | Cappozzo A, Felici F, Figura F, Gazzani F. *Med Sci Sports Exerc* 1985;17(5):613-20. PMID 4068969 (sin DOI) | Media sentadilla con barra, n=4. Con barra de 0,8 a 1,6 veces el peso corporal (PC), compresión L3-L4 de 6 a 10 veces el PC; fuerza del erector 30-50 % del máximo isométrico. La flexión del tronco fue la variable que más influyó. | Sentadilla trasera | **Confirma** "carga pesada sobre la espalda" como alta. Sugiere que la inclinación del tronco pesa más que la categoría del ejercicio. |
| L2 | Granhed H, Jonson R, Hansson T. *Spine* 1987;12(2):146-9. doi:10.1097/00007632-198703000-00010. PMID 3589805 | 8 powerlifters; carga en L3 de 18,8 a 36,4 kN en un levantamiento extremo. El resumen no dice qué ejercicio fue. | No asignable | Solo contexto de magnitud. |
| L3 | Cholewicki J, McGill SM, Norman RW. *Med Sci Sports Exerc* 1991;23(10):1179-86. PMID 1758295 (sin DOI) | Peso muerto de powerlifters, L4/L5 hasta 17 192 N. El sumo tuvo un momento ~10 % menor y una cizalla L4/L5 ~8 % menor que el convencional. | Peso muerto convencional | **Confirma** "bisagra con carga" como alta. No incluye sentadilla ni rumano. |
| L4 | Ramirez V, Ghezelbash F, Shirazi-Adl A, Bazrgari B. *Int J Numer Method Biomed Eng* 2023;39(4):e3680. doi:10.1002/cnm.3680. PMID 36606738 | Modelo de 1 voluntario de 68 kg: compresión y cizalla pico en L5-S1 por encima de los umbrales publicados de lesión. | Peso muerto | Magnitud alta, pero n=1 y dependiente del modelo. |
| L5 | Hanen NC et al. *Front Bioeng Biotechnol* 2025;13:1597209. doi:10.3389/fbioe.2025.1597209. PMID 40497251 · Gundersen AH et al. *PeerJ* 2025;13:e20279. doi:10.7717/peerj.20279. PMID 41211309 | n=30 hombres al 85 % del 1RM: el convencional tuvo mayores momentos extensores de cadera que el sumo. En 12 mujeres, la carga máxima aumentó la flexión torácica baja y la EMG del erector. | Peso muerto | Respaldan la dirección (más carga, más demanda). No dan N de columna. |
| L6 | Swinton PA et al. *J Strength Cond Res* 2012;26(7):1805-16. doi:10.1519/JSC.0b013e3182577067. PMID 22505136 · Swinton PA et al. *J Strength Cond Res* 2011;25(7):2000-9. doi:10.1519/JSC.0b013e3181e73f87. PMID 21659894 | n=12: la sentadilla tradicional dio el mayor momento en la columna entre tres variantes. n=19: la barra hexagonal redujo el momento lumbar frente a la recta. | Sentadilla, peso muerto | Ordenan dentro de la sentadilla y dentro del peso muerto, **no entre ellos**. |
| L7 | Sjöberg M, Eiken O, Norrbrand L, Berg HE, Gutierrez-Farewik EM. *J Strength Cond Res* 2023;37(1):27-34. doi:10.1519/JSC.0000000000004163. PMID 34743146 | n=8 al 8RM, modelo musculoesquelético. Compresión pico L4-L5 **similarmente alta** en prensa flywheel, sentadilla flywheel y sentadilla trasera con barra. Cizalla mayor en la prensa flywheel y en la sentadilla trasera que en la sentadilla flywheel. | Prensa, sentadilla | **Corrige (indirecto, confianza baja):** la compresión lumbar de una prensa no fue baja. Límite: es prensa *flywheel*, no la de placas a 45° con respaldo, y solo se leyó el resumen. |
| L8 | Wilke HJ, Neef P, Caimi M, Hoogland T, Claes LE. *Spine* 1999;24(8):755-62. doi:10.1097/00007632-199904150-00005. PMID 10222525 | Presión intradiscal L4-L5 en 1 hombre de 70 kg: acostado 0,1 MPa; de pie 0,5; sentado sin apoyo 0,46. Con 20 kg: espalda redonda 2,3 MPa, rodillas flexionadas 1,7, cerca del cuerpo 1,1. | Sin ejercicio de gimnasio | **Confirma** el criterio de apoyo del tronco (acostado es mínimo). El brazo de palanca de la carga cambia la presión más del doble. n=1. |
| L9 | Rohlmann A et al. *Ergonomics* 2001;44(8):781-94. doi:10.1080/00140130120943. PMID 11450876 | Fijador interno en 10 pacientes y presión intradiscal en 1 voluntario: cargas bajas en todas las posiciones acostado; sentado ligeramente menor que de pie. | Sin ejercicio de gimnasio | Mismo respaldo que L8 a "tronco apoyado: baja". |
| L10 | Bazrgari B, Shirazi-Adl A, Arjmand N. *Eur Spine J* 2007;16(5):687-99. doi:10.1007/s00586-006-0240-7. PMID 17103232 | Modelo: momentos netos, fuerzas musculares y compresión y cizalla internas mayores en el levantamiento encorvado (stoop) que en el de sentadilla. | Levantamiento de caja, sin barra | A favor de "bisagra > sentadilla" en carga manual. |
| L11 | von Arx M et al. *Front Bioeng Biotechnol* 2021;9:769117. doi:10.3389/fbioe.2021.769117. PMID 34805121 | n=30, caja de 15 kg. El stoop dio **menor** compresión que el estilo libre y la sentadilla (0,3 a 1,0 PC menos), mayor cizalla de T12/L1 a L4/L5 y menor en L5/S1. | Levantamiento de caja | **Contradice** a L10 en compresión. |
| L12 | Dreischarf M et al. *J Biomech* 2016;49(6):890-5. doi:10.1016/j.jbiomech.2015.09.034. PMID 26603872 | Implantes vertebrales instrumentados *in vivo* en 4 pacientes (3 con implante en L1, 1 en L3): la fuerza resultante difirió ~4 % entre stoop y sentadilla; la carga lateral dio ~14 % menos fuerza que la frontal. | Levantamiento de caja | **Sin base para ordenar** "bisagra" sobre "sentadilla". Importa la posición de la carga respecto de la columna. |
| L13 | Yanagisawa O et al. *Scand J Med Sci Sports* 2021;31(2):350-7. doi:10.1111/sms.13850. PMID 33038028 | n=13, sentadilla en Smith al 80 % del 1RM. Tras la sentadilla paralela, el ADC del núcleo (RM) bajó 5,0 % en L4/5 y 6,6 % en L5/S1; la media sentadilla no lo mostró de forma significativa. | Sentadilla trasera | Respaldo fisiológico de que la sentadilla cargada estresa los discos bajos. |
| L14 | McGill SM, Karpowicz A, Fenwick CM, Brown SH. *J Strength Cond Res* 2009;23(2):455-64. doi:10.1519/JSC.0b013e3181a0227e. PMID 19258883 · Vigotsky AD et al. *PeerJ* 2015;3:e708. doi:10.7717/peerj.708. PMID 25653899 | McGill (n=8): el resumen no da cifras ni ordena por compresión. Vigotsky (n=15, buenos días del 50 al 90 % del 1RM): la EMG del erector tendió a subir con la carga. | Buenos días | Solo contexto. |
| L15 | Ya leídos en `fase3-clasificacion.md`: Fenwick 2009 (PMID 19197209), Saeterbakken 2015 (PMID 26134664), Hamlyn 2007 (PMID 18076231), Andersen 2018 (PMID 28151780) | Remo inclinado > otros remos; remo libre +34 % de EMG del erector frente a máquina; sentadilla +34,5 % de EMG frente a peso muerto; EMG del hip thrust ≈ peso muerto. | Remo, hip thrust | Apoyo secundario (EMG). |

### ¿Respaldan el orden alta > media > baja?

**Parcialmente.**

- **"Baja" para tronco apoyado:** respaldado de forma cualitativa (L8, L9, L15). No hay ninguna medición de carga lumbar con tronco apoyado bajo carga de gimnasio (banca, remo con pecho, jalón, curl femoral).
- **"Alta" para carga pesada sobre la espalda y para bisagra con carga:** ambas tienen cifras del mismo orden de magnitud (L1, L3, L4, L6, L13).
- **"Bisagra" por encima de "carga sobre la espalda":** **no hay base.** L10 y L11 se contradicen; L12 (la medición *in vivo*) da ~4 % de diferencia; en L1 y L3 la sentadilla y el peso muerto no se compararon entre sí. Esto no contradice el criterio, que pone ambas en "alta".
- **"Media" (tronco sin apoyo con carga en manos o cadera):** sin cifras de gimnasio para press de pie, búlgara con mancuernas ni hip thrust. Lo más cercano es L8 (la carga en las manos sube la presión según su distancia al tronco). La EMG de Saeterbakken y Fimland 2012 no distingue sentado de pie.

### Dónde el criterio ordena mal o es inconsistente

1. **Prensa de piernas (baja).** L7 apunta a una compresión L4-L5 similar a la de la sentadilla. Si el hallazgo se extendiera a la prensa convencional, sería baja → media. **Confianza baja** (flywheel, solo resumen).
2. **Inconsistencias entre la definición y la tabla de la spec** (no dependen de la evidencia):
   - **Hack squat** tiene respaldo: por la definición ("tronco apoyado: baja") sería baja; la tabla dice media.
   - **Hip thrust** tiene la espalda alta apoyada en el banco: por la definición también sería baja; la tabla dice media.
   - **Remo con barra inclinado** tiene carga en manos y tronco sin apoyo, que por la definición es media; la tabla dice alta. Solo da alta si "bisagra con carga externa" incluye la bisagra sostenida de forma isométrica.
   - Ya sea que se corrija la tabla o la definición, la decisión es de Emanuel.
3. **Press de pie (media).** No hay dato que lo contradiga ni lo respalde: es el caso con menos datos.

## 2. Hombro

| # | Fuente | Dato | Ejercicio(s) | Efecto sobre el criterio |
| --- | --- | --- | --- | --- |
| H1 | Bergmann G, Graichen F, Bender A, Kääb M, Rohlmann A, Westerhoff P. *J Biomech* 2007;40(10):2139-49. doi:10.1016/j.jbiomech.2006.10.037. PMID 17169364 | Implante telemetrizado en 1 paciente. Fuerza glenohumeral bajo 100 % del PC en la mayoría de las actividades diarias; llegó a 130 % del PC cerca del límite del rango o contra resistencia externa. | Sin ejercicio de gimnasio | **Respalda "cerca del final del rango"** como factor. n=1 y no son ejercicios. |
| H2 | Westerhoff P, Graichen F, Bender A, Halder A, Beier A, Rohlmann A, Bergmann G. *J Biomech* 2009;42(12):1840-9. doi:10.1016/j.jbiomech.2009.05.035. PMID 19643418 | 4 pacientes con implante. Brazo extendido y elevado a 90° o más con carga: las fuerzas más altas (1,5 kg: 105-123 % del PC; 2 kg bajado a la tabla: 131,5 %). Una carga de 10 kg junto al cuerpo: 12,3 %. | Sin ejercicio de gimnasio | **Corrige (indirecto):** la carga se concentra en la elevación con brazo extendido, no en "empujar". Una elevación lateral con carga se parece más a esa postura que una tracción. |
| H3 | Noteboom L, Belli I, Hoozemans MJM, Seth A, Veeger HEJ, van der Helm FCT. *Front Physiol* 2024;15:1393235. doi:10.3389/fphys.2024.1393235. PMID 38974522 | OpenSim, n=10, 21 variantes de banca. Un agarre menor a 1,5 anchos biacromiales redujo la compresión acromioclavicular; la retracción escapular y ese agarre redujeron la cizalla glenohumeral posterior. | Banca | Confirma que la banca carga el hombro de forma relevante, pero **no la compara con otros ejercicios**. |
| H4 | Evangelista P, Rum L, Picerno P, Biscarini A. *J Funct Morphol Kinesiol* 2025;10(3):322. doi:10.3390/jfmk10030322. PMID 40843853 | Modelo de cadena rígida de banca y press militar. La zona de estancamiento aparece cuando el torque de hombro cae bajo un umbral; los extensores del codo dominan cerca de la extensión completa. Coincide con datos reales solo hasta el punto de estancamiento. | Banca, press militar | **Matiza:** la demanda del hombro es mayor en la parte baja del press (barra cerca del pecho) y no en el bloqueo. Hay que definir "final del rango" como el extremo articular. |
| H5 | Motlagh JG, Lipps DB. *J Sports Sci* 2026;44(11):1453-63. doi:10.1080/02640414.2026.2639894. PMID 41804856 · Motlagh JG, Lipps DB. *J Strength Cond Res* 2026, doi:10.1519/JSC.0000000000005593, PMID 42748970 (publicación en línea, sin volumen ni páginas asignados) | Ultrasonido en 24 powerlifters al 73,9 % del 1RM: las mujeres tuvieron menor distancia acromiohumeral y mayor razón de ocupación del supraspinoso en la posición de banca. En 19 powerlifters, el rango de movimiento del hombro aumentó durante las series. | Banca | Solo banca; sin cifras en mm. Contexto. |
| H6 | Motlagh JG, Lipps DB. *J Strength Cond Res* 2024;38(12):2147-63. doi:10.1519/JSC.0000000000004973. PMID 39808810 | Revisión narrativa: la investigación sobre biomecánica de hombro en la banca es limitada. | Banca | Es la propia postura de los autores: falta evidencia. |
| H7 | Prinold JA, Bull AMJ. *J Sci Med Sport* 2016;19(8):629-35. doi:10.1016/j.jsams.2015.08.002. PMID 26383875 · McKenzie A et al. 2022, PMID 36293792 | Dominada ancha e inversa con patrones asociados a mayor riesgo de pinzamiento; fondos en banco exigen más extensión del hombro. | Dominadas, fondos | Sin cuantificar carga (ya en `fase3-clasificacion.md`). |

No se encontró ningún estudio de carga glenohumeral, subacromial o acromioclavicular para press inclinado, press militar de pie o sentado con barra, fondos, remos, jalón, elevaciones laterales ni face pull. El de press militar sentado de Gundersen 2026 sigue sin cifras.

### ¿Respaldan que el empuje con carga cerca del final del rango está por encima de tracción y elevaciones?

**No de forma directa.** Ningún estudio compara empuje, tracción y elevación entre sí en carga articular.

- **Respaldo parcial a "final del rango + carga externa":** H1, con n=1 y sin ejercicios de gimnasio.
- **Alerta sobre las elevaciones:** H2 sugiere que la elevación con brazo extendido a 90° o más, con carga, es la postura de mayor carga glenohumeral de lo medido. Las elevaciones laterales y frontales cumplen esa postura, y con la etiqueta "media" podrían estar infraestimadas. Por ser pacientes con prótesis y cargas de 1,5-2 kg, **no se propone moverlas**.
- **El criterio es ambiguo en "final del rango"** (H4): parece indicar el bloqueo del press, pero el modelo sugiere que el hombro trabaja más abajo. Conviene escribirlo como extremo articular.

### Dónde el criterio ordena mal o es incierto

- **Elevaciones laterales (media):** posible subestimación por H2.
- **Jalón y dominadas (media):** la variante cambia el nivel (H7 y Sperandei 2009 de `fase3-clasificacion.md`); el criterio no lo dice.
- **Face pull:** no está en la tabla de la spec; por el criterio sería "tracción: media". Sin fuente.
- **Cuatro ejercicios en "alta"** (banca, inclinado, press sentado, fondos) con A4 en "máximo dos": nada en H1-H7 los diferencia.

## 3. Recomendación de nivel 2 (del investigador)

1. **Dejar el criterio como E4, pero con contexto y no con una fuente que lo respalde.** Los datos no dan umbrales ni ordenan a la vez las tres categorías. Nada justifica subirlo a E1 ni a E2.
2. **Ajustar la redacción lumbar:** añadir "bisagra sostenida" a la definición de "alta" (así el remo inclinado encaja por definición); aclarar el caso de los ejercicios con respaldo parcial (hack, hip thrust), que hoy contradicen la definición; anotar que el brazo de palanca de la carga respecto del tronco pesa más que la categoría (L1, L8, L12).
3. **Ajustar la redacción del hombro:** definir "final del rango" como el extremo articular de cada ejercicio, y anotar que las elevaciones con brazo extendido y carga son un punto dudoso.
4. **Cambios de categoría candidatos:** prensa de piernas, lumbar, baja → media (un paso; confianza baja; marcarla como duda y no moverla hasta ver el texto completo de L7). **Ningún cambio** para hombro: ninguna fuente lo sostiene.
5. **Ninguna cifra se convierte en peso por ejercicio.** La clasificación sigue siendo ordinal.

**Confianza:** lumbar, media-baja para las definiciones de "alta" y "baja" y baja para "media"; hombro, baja (evidencia de pacientes con prótesis y modelos de banca sin comparación entre ejercicios).

**Postura de los autores frente a cómo lo usaría la app.** Cappozzo y Granhed estiman cargas máximas y no las comparan con ningún umbral de lesión; Wilke advierte que es un solo sujeto y Dreischarf concluye que no hay diferencia sustancial entre técnicas; lo que Westerhoff recomienda sobre cargar con el brazo extendido no se verificó (solo se leyó el resumen); Motlagh y Lipps dicen que falta evidencia sobre la biomecánica de hombro en la banca. La app usaría la clasificación como orden de sesión (A1), tope por sesión (A2, A4) y advertencia ante lesiones (A7): es más firme que los autores, que no clasifican gestos de gimnasio en niveles de riesgo ni afirman que una carga articular mayor produzca lesión.

## Qué se desprende para la tabla `perfil_articular` (Paso 1, PR aparte)

- **Remo con barra inclinado, lumbar (alta en la spec):** la definición literal (carga en manos, tronco sin apoyo) daría media. Se agrega a la lista de ambiguos del Paso 1 (DEC-021, propuesto, en el PR #30; aún sin mergear).
- **Hack squat y hip thrust, lumbar (media en la spec):** la definición literal daría baja; ya están en esa misma lista (PR #30).
- **Prensa de piernas, lumbar (baja):** candidata a media por L7, con confianza baja; no se mueve.
- **Elevaciones laterales, hombro (media):** posible subestimación por H2; no se mueve.

## Qué no se pudo verificar

- Ningún texto completo. Faltan las magnitudes de Hanen, Gundersen 2025, Swinton, Sjöberg, Yanagisawa, Noteboom y los textos abiertos en PMC, que no se abrieron.
- Granhed 1987: qué ejercicio fue; el resumen no lo dice.
- Cargas lumbares publicadas de peso muerto rumano, press de pie y sentado, remo con apoyo de pecho, hack squat, búlgara, hip thrust, curl femoral, jalón, dominadas y banca: solo hay EMG o nada.
- Cargas de hombro de cualquiera de los ejercicios de gimnasio pedidos; lo único medido es la clase de movimientos de H1 y H2.
- Face pull: ninguna fuente.
- Los números de Cholewicki y Hamlyn son los del documento previo, que no se releyó en su fuente.
