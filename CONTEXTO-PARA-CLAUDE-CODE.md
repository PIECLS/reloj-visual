# Contexto del proyecto: Reloj Visual PIE

Este documento le da contexto a Claude Code sobre qué es esta app, cómo está
construida, y qué funciones se quieren agregar. Léelo completo antes de empezar.

---

## Qué es esta app

Es una herramienta de apoyo visual para un equipo PIE (Programa de Integración
Escolar) de un colegio en Chile. La usan psicólogos, educadoras diferenciales,
fonoaudiólogas y terapeutas ocupacionales para trabajar **anticipación,
autorregulación y función ejecutiva** con estudiantes — muchos con TEA,
discapacidad intelectual o desafíos de regulación.

La app actual es un **reloj visual tipo Time Timer**: un temporizador donde el
tiempo se representa como un sector de color que se vacía o se llena, con un
pictograma central que indica la actividad. La filosofía pedagógica es traducir
lo abstracto (el tiempo) en algo visual y concreto que el estudiante pueda *ver*,
no leer.

Se usa en dos contextos: proyectada al curso completo, y en tablet/celular
individual con un estudiante.

## Principio de diseño que NO se debe perder

La app es deliberadamente **simple**. Un colega no técnico debe entenderla en
dos minutos. Cada función nueva debe respetar esto: nada de saturar la interfaz.
Si una función agrega complejidad visible, hay que esconderla detrás de ajustes
o modos, no ponerla al frente.

Otros criterios de diseño ya establecidos:
- Fondo blanco, estética limpia y plana (sin sombras exageradas ni gradientes).
- Pensado para sensibilidad sensorial: paletas configurables (sin rojo-alarma
  forzado), sonido activable/desactivable, opción de animación reducida.
- Accesible: tap targets grandes (mínimo 44px), funciona con dedo en touch.
- Totalmente responsivo: se adapta a desktop y a celular (en celular usa una
  barra inferior tipo app nativa).

---

## Cómo está construida (stack técnico)

- **React 18** + **Vite** como build tool.
- Un solo componente principal en `src/RelojVisual.jsx` (~740 líneas).
- Punto de entrada en `src/main.jsx`.
- Estilos en un bloque CSS dentro del componente (no usa Tailwind ni librerías
  de UI externas). Usa variables CSS y media queries para el responsive.
- Sin dependencias de UI externas — todo es React puro + CSS.
- Configurada como PWA básica (manifest.json, instalable en pantalla de inicio).
- Desplegada en **GitHub Pages** con `npm run deploy` (usa el paquete gh-pages).
- El SVG del reloj se dibuja con geometría calculada a mano (funciones `polar()`
  y `wedgePath()`), soporta orientación horaria e inversa.

### Funciones que YA tiene la app actual
- Temporizador con cuenta regresiva ("cuánto queda") o progresiva ("cuánto llevo").
- Manilla arrastrable (drag) o entrada de minutos por teclado.
- Pictograma central seleccionable (18 pictogramas de emoji + opción de subir
  imágenes propias, que por ahora se pierden al cerrar — ver función 1 abajo).
- Rutinas encadenadas: secuencia de actividades que avanzan automáticamente.
- Avisos de transición a los 5 y 1 minuto (cambio de color + chime sintético).
- Ajustes: 9 colores para el reloj, orientación horaria/inversa, 3 niveles de
  sonido, animación reducida, avisos on/off.
- Modo pantalla completa para proyección.

### IMPORTANTE sobre localStorage
La app NO usa localStorage actualmente porque fue prototipada en el entorno de
artifacts de Claude, donde localStorage está bloqueado. Pero ahora corre en
GitHub Pages, donde localStorage SÍ funciona perfectamente. Las funciones nuevas
de guardado deben usar localStorage (o IndexedDB para imágenes).

---

## Funciones que queremos agregar

Están ordenadas por prioridad. No es obligatorio hacerlas todas de una vez;
de hecho es mejor ir una por una, probando cada una antes de seguir.

### FUNCIÓN 1 — Guardado persistente de pictogramas propios (PRIORITARIA)

**Problema actual:** cuando un usuario sube una imagen propia como pictograma,
esta se pierde al cerrar la app.

**Qué se quiere:** que los pictogramas subidos se guarden de forma persistente
en el dispositivo del usuario, de modo que sigan ahí al volver a abrir la app.

**Detalles:**
- Independiente por dispositivo/persona (cada quien tiene su biblioteca local;
  no se comparten ni suben a ningún servidor).
- Como son imágenes (pueden pesar), usar **IndexedDB** en vez de localStorage,
  que tiene más capacidad. Si IndexedDB resulta muy complejo, localStorage con
  las imágenes en base64 es aceptable como primera versión, advirtiendo el
  límite de ~5MB.
- Mantener la función de renombrar y eliminar pictogramas que ya existe.
- Advertir al usuario (con un texto pequeño) que los datos viven en el
  dispositivo: si borra el caché o cambia de equipo, los pierde.

### FUNCIÓN 2 — Audios de aviso en hitos de tiempo

**Qué se quiere:** que además de los chimes actuales, la app reproduzca avisos
de audio en hitos configurables de tiempo restante.

**Detalles:**
- Hitos deseados: 5 min, 3 min, 2 min, 1 min, 30 seg, 5 seg.
- Que cada hito se pueda activar/desactivar individualmente en ajustes.
- Dos posibilidades (idealmente ambas, o empezar por la primera):
  a) Audios incluidos en la app (empaquetados), iguales para todos. Pueden ser
     avisos hablados ("quedan dos minutos") o sonidos distintivos por hito.
  b) Audios que el usuario sube, guardados con la misma técnica de persistencia
     de la función 1.
- Los avisos hablados son especialmente valiosos para estudiantes que aún no
  leen el reloj visual (refuerzan por el canal auditivo).
- Respetar el ajuste de sonido existente (si está en "sin sonido", no suenan).

### FUNCIÓN 3 — Reestructurar en MODOS (Reloj / Semáforo / Tareas)

Esta es la más grande y conviene hacerla cuando 1 y 2 estén estables. Convierte
la app de "un reloj" a "una caja de herramientas visuales" con un selector de
modo en la pantalla de inicio.

**Arquitectura deseada:** una sola app, con un selector que permita elegir entre
tres herramientas. Las tres comparten la configuración sensorial (paletas,
sonido, animación reducida) y la biblioteca de pictogramas. El usuario elige la
herramienta según lo que necesite en el momento.

#### Modo A — Reloj
Es la app actual, sin cambios mayores. Se convierte en uno de los tres modos.

#### Modo B — Semáforo táctil
Tres luces (verde, amarillo, rojo) grandes, que se activan/cambian al tocar.

- Sirve para autorregulación emocional, gestión de turnos, anticipación de
  transiciones.
- Decisión de diseño a resolver con el usuario antes de programar:
  ¿lo controla el adulto, el estudiante, o ambos? ¿es solo indicador visual o
  también dispara algo (sonido, registro)?
- Por defecto, partir simple: tres luces grandes, una activa a la vez, toque
  para cambiar. Debe verse bien tanto proyectado como en celular.

#### Modo C — Timer con lista de tareas
El reloj actual + un panel lateral (o inferior en móvil) con una lista de tareas
que se pueden marcar/tachar al completarse.

- Apunta a función ejecutiva: secuenciación, automonitoreo, sensación de logro.
- Las tareas deben poder agregarse, marcarse como completadas (tachado visual),
  y eliminarse.
- Idealmente las tareas se guardan con la persistencia de la función 1.
- Posible extensión futura (no obligatoria ahora): que cada tarea tenga su propio
  bloque de minutos, fusionando esto con las rutinas encadenadas que ya existen.

---

## Sobre licencias de pictogramas (IMPORTANTE si se integra ARASAAC)

Existe la tentación de integrar el banco de pictogramas ARASAAC (estándar en
Chile para CAA). PERO: los pictogramas ARASAAC usan licencia Creative Commons
BY-NC-SA, que **prohíbe el uso comercial** y obliga a compartir la obra derivada
bajo la misma licencia.

Implicancia: mientras la app sea gratuita, se puede usar ARASAAC citando la
fuente (autor: Sergio Palao; procedencia: ARASAAC; licencia: CC BY-NC-SA). Pero
si alguna vez se quiere monetizar la app, ARASAAC queda descartado.

Recomendación: por ahora NO integrar ARASAAC directamente en el código. Mantener
y potenciar la función de "subir tus propios pictogramas" (función 1), que deja
al usuario libre de cargar lo que quiera sin atar la app a una licencia
restrictiva. Si se decide integrar ARASAAC más adelante, será una decisión
consciente sobre el modelo de la app.

---

## Cómo trabajar este proyecto

- Hacer una función a la vez y probar antes de seguir. No abordar las tres
  funciones de golpe.
- Después de cada cambio, verificar que compila con `npm run build`.
- Para publicar cambios: `git add .` → `git commit -m "..."` → `git push` →
  `npm run deploy`.
- Mantener el código en español en los textos visibles al usuario (la app es
  para usuarios chilenos).
- Respetar el principio de simplicidad: ante la duda, la opción más simple y
  clara gana.
- Conservar la accesibilidad: tap targets grandes, contraste adecuado, soporte
  touch, responsive móvil/desktop.
