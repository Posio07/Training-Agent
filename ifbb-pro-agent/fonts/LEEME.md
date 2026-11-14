# Tipografías de la app

Los dos archivos `.woff2` de esta carpeta son las tipografías que usa la app. Se sirven desde el propio origen (sin CDN) y el service worker los precarga (`sw.js`). `css/fuentes.css` los declara.

| Archivo | Familia | Versión | Origen | Licencia |
| --- | --- | --- | --- | --- |
| `BigShouldersDisplay-wght.woff2` | Big Shoulders Display (variable, peso 100 a 900) | 2.002 | Repositorio `google/fonts`, commit `29b4ec6df2522a8aee279414b78a07910b065874`, archivo `ofl/bigshouldersdisplay/BigShouldersDisplay[wght].ttf`. Es el archivo que distribuye Google Fonts, el que la app ya mostraba cuando lo pedía a su CDN. Su `METADATA.pb` dice que sale del repositorio de los autores, `xotypeco/big_shoulders`, commit `41153e6fe01d218e933919a1d08c8e45065bc8fe` | SIL Open Font License 1.1, sin nombre reservado. Texto en `LICENCIA-BigShouldersDisplay-OFL.txt` (el `OFL.txt` de ese commit de `google/fonts`, idéntico al del repositorio de los autores) |
| `SourceSans3VF-Upright.ttf.woff2` | Source Sans 3 (variable, redonda, peso 200 a 900) | 3.052 | Repositorio de Adobe, `adobe-fonts/source-sans`, etiqueta `3.052R`, archivo `WOFF2/VF/SourceSans3VF-Upright.ttf.woff2` | SIL Open Font License 1.1, con nombre reservado «Source». Texto en `LICENCIA-SourceSans3-OFL.md` (el `LICENSE.md` de esa etiqueta) |

## Qué se hizo con cada archivo

- **Source Sans 3: nada.** Es el WOFF2 que publica Adobe, byte por byte. Su licencia reserva el nombre «Source» para las versiones modificadas, así que no se recortó ni se convirtió.
  - SHA-256: `5f16566f7a40d39b339ad26be151fa5a1ab1f0c2574c7a2e619765584a1acbd8` (170 188 bytes).
- **Big Shoulders Display: solo cambió el contenedor**, de TTF a WOFF2, con fontTools 4.68.0 (`TTFont(origen)`, `flavor = 'woff2'`, `save`). Mismos glifos, mismo eje de peso y mismas tablas, salvo la firma (`DSIG`), que deja de valer al cambiar de contenedor. No se recortó nada. La licencia no reserva ningún nombre.
  - SHA-256 del TTF de origen: `60e208dc276a1c35fc5b62e94f9fb959c40c11783a9eb7548175c14b1fbeb720` (219 532 bytes).
  - SHA-256 del WOFF2: `1a4343ed5dca4c711979f7f81816236d8d8f103addd12c4ffad1b37c27521e0a` (82 296 bytes).

## Por qué Big Shoulders no viene del repositorio de sus autores

El archivo actual del repositorio de los autores (`xotypeco/big_shoulders`, commit `8ba99c9e347396d828b263b8b818269cb99eb27c`, `Big-Shoulders/fonts/variable/display/BigShouldersDisplay[wght].ttf`) lleva el mismo número de versión, pero dibuja los pesos gruesos más anchos: la misma frase en peso 700 mide 281 px en vez de 266. Con ese archivo cambiaría cómo se ven las cifras de toda la app. El de `google/fonts` mide lo mismo que la app de antes de este cambio.

## Para actualizar una tipografía

Bajar el archivo nuevo del mismo repositorio, anotar acá el commit o la etiqueta y el SHA-256, copiar su licencia y subir `CACHE_VERSION` en `sw.js`.
