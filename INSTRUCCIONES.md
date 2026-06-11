# Cómo publicar Reloj Visual en GitHub Pages

## Lo que vas a obtener
Una URL pública del tipo `https://TU-USUARIO.github.io/reloj-visual/`
que tus colegas abren desde cualquier celular — y pueden agregar
a su pantalla de inicio como si fuera una app instalada.

---

## Paso 1 — Instalar las herramientas necesarias

Necesitas **Node.js** en tu computador.
Descárgalo desde: https://nodejs.org  (elige la versión "LTS")

Para verificar que quedó instalado, abre la Terminal (Mac/Linux)
o PowerShell (Windows) y escribe:
```
node -v
```
Debe mostrar algo como `v20.x.x`.

---

## Paso 2 — Crear el repositorio en GitHub

1. Ve a https://github.com e inicia sesión
2. Haz clic en el botón verde **"New"** (esquina superior izquierda)
3. En "Repository name" escribe exactamente: `reloj-visual`
4. Deja el repositorio en **Public**
5. NO marques "Add a README file"
6. Haz clic en **"Create repository"**

GitHub te mostrará una página con instrucciones — la vamos a usar en el paso 4.

---

## Paso 3 — Preparar el proyecto en tu computador

1. Descarga la carpeta `reloj-visual` que te entregó Claude
   (el archivo ZIP o la carpeta completa)
2. Descomprímela donde quieras (por ejemplo, en tu escritorio)
3. Abre la Terminal / PowerShell y navega a esa carpeta:
   ```
   cd Desktop/reloj-visual
   ```
4. Instala las dependencias:
   ```
   npm install
   ```
   Esto descarga todo lo necesario (puede tardar 1-2 minutos).

---

## Paso 4 — Conectar con GitHub y subir

### 4a. Configura Git con tu usuario de GitHub
(Solo la primera vez en este computador)
```
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### 4b. Inicializa el repositorio local
```
git init
git add .
git commit -m "Versión inicial"
```

### 4c. Conecta con GitHub
Copia la URL de tu repositorio desde la página de GitHub.
Será algo como `https://github.com/TU-USUARIO/reloj-visual.git`
```
git remote add origin https://github.com/TU-USUARIO/reloj-visual.git
git branch -M main
git push -u origin main
```

---

## Paso 5 — Publicar con un solo comando

```
npm run deploy
```

Este comando construye la app y la sube automáticamente a GitHub Pages.
La primera vez puede pedir tu usuario y contraseña de GitHub
(o un token si tienes autenticación de dos factores — ver nota abajo).

---

## Paso 6 — Activar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** (pestaña superior)
3. En el menú lateral izquierdo, haz clic en **Pages**
4. En "Branch", selecciona **gh-pages** y haz clic en **Save**
5. Espera 1-2 minutos

Tu URL estará disponible en:
```
https://TU-USUARIO.github.io/reloj-visual/
```

---

## Cómo agregar la app a la pantalla de inicio (celular)

### En iPhone (Safari):
1. Abre la URL en Safari
2. Toca el botón de compartir (cuadrado con flecha hacia arriba)
3. Selecciona "Agregar a pantalla de inicio"
4. Ponle el nombre que quieras → "Agregar"

### En Android (Chrome):
1. Abre la URL en Chrome
2. Toca los tres puntos del menú
3. Selecciona "Agregar a pantalla de inicio" o "Instalar app"

La app aparecerá con el ícono del reloj y se abrirá en pantalla
completa, sin barra del navegador.

---

## Cómo actualizar la app en el futuro

Cada vez que quieras subir cambios:
```
git add .
git commit -m "Descripción del cambio"
git push
npm run deploy
```

---

## Nota sobre autenticación con token (GitHub)

Si GitHub te pide contraseña y no funciona, es porque desde 2021
GitHub requiere un token en vez de contraseña para operaciones Git.

Para crear un token:
1. Ve a GitHub → Settings → Developer Settings → Personal access tokens → Tokens (classic)
2. "Generate new token" → marca el permiso **repo**
3. Copia el token y úsalo como "contraseña" cuando Git lo pida

---

## ¿Algo no funciona?

Los errores más comunes:
- `npm: command not found` → Node.js no está instalado (volver al Paso 1)
- `remote origin already exists` → escribe `git remote remove origin` y repite el paso 4c
- La URL no carga → espera 2-3 minutos más, GitHub Pages tiene un delay inicial
- La app carga pero en blanco → verifica que en `vite.config.js` el `base`
  sea exactamente igual al nombre de tu repositorio
