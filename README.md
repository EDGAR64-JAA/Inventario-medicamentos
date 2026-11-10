# Control Administrativo PWA — versión actualizada

## Funciones incluidas
- Pendientes laborales con selección múltiple de sucursales y prioridades.
- Apartado de seguimientos pendientes, con lista de registros abiertos y aviso del navegador al abrir la aplicación si se concedieron permisos.
- Catálogo inicial de sucursales 0127, 0331, 0333, 0334, 0336 y 1060; puedes agregar más desde el formulario de pendientes/actividades.
- Caja chica con fecha y hora de entrega, máximo de $2,000.00 MXN por registro y límite de $2,000.00 MXN acumulados pendientes por sucursal. Si un registro sigue pendiente más de 24 horas desde la entrega, aparece como **Atrasado**.
- Taxis como seguimiento mensual de importes por sucursal. El módulo solo muestra las sucursales que tengan un importe registrado en el mes consultado; se permite un importe por sucursal y mes y se puede reemplazar si se registra nuevamente.
- Calendario mensual de conteos de inventario perecedero, con selección múltiple de sucursales y lista de fechas próximas.
- Actividades fijas y generación manual de instancias mensuales.
- Exportación de respaldo en JSON y diseño adaptable para laptop y móvil.

## Probar en Windows 11
1. Extrae el ZIP en una carpeta, por ejemplo `C:\\ControlAdministrativo`.
2. Instala Node.js LTS si todavía no está instalado.
3. Abre PowerShell dentro de la carpeta y ejecuta `npx serve .`.
4. Abre la dirección local que indique el comando.

## Instalar en iPhone
Para instalar la PWA, primero publica la carpeta en un hosting con HTTPS. En Safari abre la URL, toca **Compartir** y elige **Agregar a pantalla de inicio**.

## Límites importantes
- Esta versión guarda los datos en el almacenamiento local del navegador. No sincroniza automáticamente laptop y iPhone, no tiene cuentas de usuario ni base de datos en la nube.
- Los recordatorios del navegador se muestran cuando se abre la aplicación. Para notificaciones diarias fiables con la aplicación cerrada se necesita configurar un servicio externo de notificaciones y una base de datos/servidor.
- Haz respaldos periódicos con **Exportar datos** y no ingreses información confidencial hasta conectar autenticación y almacenamiento seguro.


## Novedades de arqueos y tareas diarias
- Nuevo módulo para agendar arqueos por fecha y sucursal, marcar como concluidos y conservar el historial.
- En pendientes se puede marcar una actividad como diaria. Al concluirla, se crea automáticamente el pendiente del día siguiente.
- En Arqueos se incluye una opción para generar un resumen imprimible que se puede guardar como PDF desde el navegador.

Nota: el envío automático por correo a las 18:00 requiere un servicio backend programado y credenciales de correo. Esta versión no envía correos automáticamente; permite generar el PDF manualmente.
