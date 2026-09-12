# MiRecibo

Aplicación local-first para Android y web que reúne lista de compra, interpretación inteligente de tickets, despensa, menús, estadísticas y repostajes.

## Funciones incluidas

- Alta de varios productos escribiendo o hablando en español.
- Lista filtrable, edición, categorías y marcado automático desde tickets.
- Captura híbrida: OCR local y visión multimodal se contrastan para recuperar líneas pequeñas sin depender de una plantilla fija.
- Salida estructurada y validada para evitar convertir IVA, bases imponibles o totales en productos.
- Auditoría de confianza, conciliación con el total y detección de tickets duplicados antes de guardar.
- OCR local conservado únicamente como herramienta de respaldo y depuración.
- Revisión editable de establecimiento, fecha, productos, cantidades, importes y total.
- Registro manual de compras sin ticket físico, con establecimiento, fecha, importe, concepto y categoría.
- Historial y detalle de tickets, con búsqueda local por nombre de producto, número de coincidencias y total gastado calculado desde los importes de línea.
- Cada coincidencia identifica ticket, comercio, fecha, cantidad, precio unitario e importe.
- Repostajes asociados a vehículos.
- Estadísticas por categoría y establecimiento, con recategorización directa de cualquier concepto y actualización inmediata de todos los totales.
- Despensa local editable que puede rellenarse manualmente o desde productos de tickets.
- Generación de tres recetas o una planificación semanal basada en la despensa, con filtros dietéticos y lista de ingredientes faltantes.
- Planes guardados reutilizables sin nuevas consultas de IA y alta directa de faltantes en la lista de compra.
- Persistencia local versionada, funcionamiento como PWA y copias exportables/restaurables.
- Snapshot completo de la base local, compatible con versiones anteriores y con recuperación previa a cada restauración.
- Categorías personalizadas con color, orden, archivado y fusión de todo su historial.
- Gastos periódicos semanales, mensuales o anuales, automáticos o sujetos a confirmación.
- Actualización integrada desde GitHub Releases sin abrir el navegador.
- Publicidad discreta mediante un bloque adaptativo integrado entre secciones de Inicio, Tickets y Análisis; nunca desplaza la navegación ni aparece sobre formularios, con consentimiento UMP y acceso a preferencias desde Ajustes.

La comparación de cestas y el mapa de supermercados están retirados temporalmente de la aplicación mientras se revisan cobertura, precisión y consumo de recursos.

## Desarrollo

```powershell
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Android

El proyecto nativo está en `android/`. Para actualizarlo y crear un APK de depuración:

```powershell
pnpm android:sync
cd android
./gradlew assembleDebug
```

El APK se genera en `android/app/build/outputs/apk/debug/app-debug.apk`.

Para Google Play existe una compilación separada que oculta el actualizador externo y elimina los permisos de ubicación e instalación de APK. Consulta [la guía completa](docs/PLAY_STORE_CHECKLIST.md), [el texto de la ficha](docs/PLAY_STORE_LISTING.md) y [el borrador de seguridad de datos](docs/DATA_SAFETY.md). El AAB se genera con:

```powershell
pnpm android:play:bundle
```

La tarea exige identificadores AdMob reales y una clave de subida; falla de forma intencionada si detecta los IDs oficiales de prueba o si falta la firma.

Las versiones instalables se publican en [GitHub Releases](https://github.com/raul-s-c/mirecibo/releases). Desde **Ajustes → Actualizaciones**, la aplicación consulta la última versión, descarga el APK en su almacenamiento privado y abre el instalador de Android. El sistema puede solicitar una vez autorización para instalar desde MiRecibo.

Cada actualización debe firmarse con la misma clave de Android antes de adjuntarla a GitHub Releases; de ese modo puede instalarse sobre la versión anterior sin borrar datos.

## Servicio de IA

El backend seguro está en `worker/`. La clave de OpenAI se guarda como secreto de Cloudflare y nunca se incluye en el APK. Consulta [worker/README.md](worker/README.md) para configurarlo y desplegarlo.

En una compilación privada, la URL y el token de acceso se pueden inyectar durante el build mediante `VITE_MIRECIBO_ACCESS_TOKEN`; nunca se escriben en el repositorio. Para una publicación pública, un token compartido dentro del APK no debe considerarse secreto: antes de Play Store hay que sustituirlo por identidad de usuario o validación de integridad de la aplicación y aplicar límites de consumo en el servidor.

## Privacidad y publicación

La lista, el historial y las estadísticas siguen guardándose localmente. Solo la fotografía que el usuario decide escanear se envía cifrada al backend y de ahí a OpenAI para interpretarla. Para publicar en Google Play hace falta una política de privacidad que describa este tratamiento, además del nombre comercial, identificador de paquete, iconos y firma de producción.

### Estado de Google Play

- Los correos de la prueba cerrada son cuentas de Google de testers; MiRecibo no necesita incorporar un acceso por correo para cumplir este requisito.
- Las cuentas personales de desarrollador creadas después del 13 de noviembre de 2023 deben mantener al menos 12 testers inscritos de forma continua durante 14 días antes de solicitar acceso a producción: [requisito oficial](https://support.google.com/googleplay/android-developer/answer/14151465?hl=es).
- La lista se configura en **Play Console → Pruebas → Prueba cerrada → Gestionar track → Testers** y admite direcciones individuales o Grupos de Google: [configuración oficial](https://support.google.com/googleplay/android-developer/answer/9845334?hl=es).
- La APK privada de GitHub sigue siendo una compilación de depuración. La variante Play genera un AAB firmado, usa Google Mobile Ads 25.4.0 y UMP 4.0.0, y bloquea una publicación con IDs publicitarios de prueba.
