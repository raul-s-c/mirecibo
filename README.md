# MiRecibo

Aplicación local-first para Android y web que reúne lista de compra, interpretación inteligente de tickets, historial de precios, estadísticas y repostajes.

## Funciones incluidas

- Alta de varios productos escribiendo o hablando en español.
- Lista filtrable, edición, categorías y marcado automático desde tickets.
- Captura híbrida: OCR local y visión multimodal se contrastan para recuperar líneas pequeñas sin depender de una plantilla fija.
- Salida estructurada y validada para evitar convertir IVA, bases imponibles o totales en productos.
- Auditoría de confianza, conciliación con el total y detección de tickets duplicados antes de guardar.
- OCR local conservado únicamente como herramienta de respaldo y depuración.
- Revisión editable de establecimiento, fecha, productos, cantidades, importes y total.
- Registro manual de compras sin ticket físico, con establecimiento, fecha, importe, concepto y categoría.
- Historial y detalle de tickets.
- Repostajes asociados a vehículos.
- Estadísticas por categoría y establecimiento.
- Alertas calculadas a partir de cambios en el precio unitario histórico.
- Persistencia local versionada, funcionamiento como PWA y copias exportables/restaurables.
- Actualización integrada desde GitHub Releases sin abrir el navegador.

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

Las versiones instalables se publican en [GitHub Releases](https://github.com/raul-s-c/mirecibo/releases). Desde **Ajustes → Actualizaciones**, la aplicación consulta la última versión, descarga el APK en su almacenamiento privado y abre el instalador de Android. El sistema puede solicitar una vez autorización para instalar desde MiRecibo.

Cada actualización debe firmarse con la misma clave de Android antes de adjuntarla a GitHub Releases; de ese modo puede instalarse sobre la versión anterior sin borrar datos.

## Servicio de IA

El backend seguro está en `worker/`. La clave de OpenAI se guarda como secreto de Cloudflare y nunca se incluye en el APK. Consulta [worker/README.md](worker/README.md) para configurarlo y desplegarlo.

En una compilación privada, la URL y el token de acceso se pueden inyectar durante el build mediante `VITE_MIRECIBO_ACCESS_TOKEN`; nunca se escriben en el repositorio. Para una publicación pública, un token compartido dentro del APK no debe considerarse secreto: antes de Play Store hay que sustituirlo por identidad de usuario o validación de integridad de la aplicación y aplicar límites de consumo en el servidor.

## Privacidad y publicación

La lista, el historial y las estadísticas siguen guardándose localmente. Solo la fotografía que el usuario decide escanear se envía cifrada al backend y de ahí a OpenAI para interpretarla. Para publicar en Google Play hace falta una política de privacidad que describa este tratamiento, además del nombre comercial, identificador de paquete, iconos y firma de producción.
