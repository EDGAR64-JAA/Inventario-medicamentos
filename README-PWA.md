# Inventario de Medicamentos — PWA para GitHub Pages

Tu inventario de medicamentos en casa, como app instalable en tu iPhone, igual que Control Administrativo.

## Qué hace

- Escanea el código de barras de la caja con la cámara (o escríbelo a mano) y busca el nombre solo: primero en tus registros y luego en la base pública Open Food Facts. Si el código no está en ninguna base, escribes el nombre una sola vez y la app lo recuerda para ese código.
- Guarda por medicamento: nombre, uso, fecha de caducidad, stock en casa, marca/presentación y código de barras.
- Panel de alertas arriba con tres tarjetas que filtran la lista: **Por vencer este mes** (vence en 30 días o menos), **Stock bajo** (2 unidades o menos) y **Vencidos**.
- Botones **+ / −** para subir o bajar el stock, buscador, editar y eliminar.
- Respaldo: botones para exportar e importar tus datos en JSON.

## Limitaciones honestas (igual que Control Administrativo)

- **Tus datos viven solo en el localStorage de ese teléfono/navegador.** No hay backend ni cuenta: si borras los datos del navegador o cambias de teléfono, se pierden salvo que hayas exportado el respaldo JSON.
- **Los avisos solo aparecen cuando abres la app.** Al abrirla revisa las caducidades y, si diste permiso, muestra una notificación local. Con la app cerrada no avisa: para eso haría falta un servicio push (Firebase/OneSignal), que se puede añadir después si quieres.
- El nombre no viene dentro del código de barras: viene de una base de datos. La fecha de caducidad y el uso **siempre** se leen de la caja y los escribes tú.
- El escaneo usa la librería html5-qrcode desde internet (CDN), así que para escanear necesitas conexión. Escribir el código a mano y buscar el nombre también necesita internet para la base pública; registrar a mano sin código funciona sin internet una vez cargada la app.

## Publicarla en GitHub Pages (paso a paso)

1. En GitHub, crea un repositorio nuevo llamado **`inventario-medicamentos`** (público; si lo haces privado, GitHub Pages gratis no lo publica).
2. Sube **todos** los archivos de esta carpeta a la raíz del repositorio (`index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `icon-512.png`). El README es opcional.
3. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` → carpeta `/ (root)` → Save**.
4. Espera 1–2 minutos. Tu app quedará en:
   `https://edgar64-jaa.github.io/inventario-medicamentos/`
5. Si ves una página en blanco, espera un poco más y recarga; revisa que los archivos estén en la raíz, no dentro de otra carpeta.

## Instalarla en tu iPhone

1. Abre en Safari del iPhone: `https://edgar64-jaa.github.io/inventario-medicamentos/`
2. Toca **Compartir** (el cuadrado con la flecha) → **Agregar a pantalla de inicio** → **Agregar**.
3. Abre la app desde el ícono nuevo. Ya funciona como app, a pantalla completa.
4. Dentro de la app, toca **Activar avisos** y permite las notificaciones cuando el iPhone lo pregunte. Recuerda: los avisos salen al abrir la app.

> Requisito: iOS 16.4 o más reciente para notificaciones de apps web instaladas.

## Cómo se usa

1. Toca **Escanear código de barras** y apunta al código de la caja. Si no abre la cámara, escribe el código a mano y toca **Buscar código**.
2. Confirma o corrige el nombre que se llenó solo. La app te dice de dónde salió: “Base pública”, “Tu registro anterior” o “Escríbelo”.
3. Escribe el **uso** y la **fecha de caducidad** de la caja, pon el **stock** y toca **Guardar medicamento**.
4. En la lista, usa **+ / −** para ajustar el stock cuando tomes o compres medicamentos.
5. Toca las tarjetas de arriba (**Por vencer este mes**, **Stock bajo**, **Vencidos**) para ver solo esos.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | La app (estructura) |
| `styles.css` | Los colores y el diseño (tablero con alertas, azul petróleo #0e6390, pasteles) |
| `app.js` | La lógica: escaneo, búsqueda de nombre, caducidades, stock, respaldo |
| `manifest.webmanifest` | Datos de la PWA (nombre, ícono, pantalla completa) |
| `sw.js` | Service worker: guarda la app para usarla sin internet (caché v1) |
| `icon.svg` / `icon-512.png` | Ícono de la app |
| `README-PWA.md` | Este archivo |

## Datos

- Clave en localStorage: `inventarioMedicamentos.v1` (medicamentos + asociaciones código → nombre).
- Empieza vacía: no trae medicamentos de ejemplo.
- “Por vencer” = vence en 30 días o menos. “Vencido” = ya pasó la fecha. Las fechas se comparan en hora local de La Paz (America/Mazatlan, UTC-07:00).
