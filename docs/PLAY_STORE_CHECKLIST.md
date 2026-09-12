# Publicar MiRecibo en Google Play

## 1. Datos que debe aportar el propietario

- Correo público de soporte y privacidad.
- Nombre legal o comercial que figurará como desarrollador.
- ID de aplicación AdMob Android (`ca-app-pub-…~…`).
- ID de bloque de banner (`ca-app-pub-…/…`).
- Una clave de subida `.jks`, alias y contraseñas guardadas fuera del repositorio. Si no existe, se genera una sola vez.
- Acceso a Play Console y, cuando aplique, una lista de al menos 12 cuentas de Google para la prueba cerrada.

Nunca se deben enviar las contraseñas por chat ni añadirlas a Git. Se introducen como variables locales al compilar.

## 2. AdMob

1. Crear la aplicación Android con paquete `es.mirecibo.app`.
2. Crear un bloque **Banner** y copiar sus dos identificadores.
3. En Privacidad y mensajes, crear y publicar el mensaje de normativa europea para esta aplicación.
4. Añadir `https://raul-s-c.github.io/mirecibo/privacy.html` como política de privacidad.
5. Mantener los IDs oficiales de prueba mientras se verifica la aplicación. El build release se bloquea si detecta IDs de prueba.

## 3. Firma y AAB

Ejemplo para crear una clave de subida RSA de 4096 bits:

```powershell
keytool -genkeypair -v -keystore C:\ruta-segura\mirecibo-upload.jks -alias mirecibo-upload -keyalg RSA -keysize 4096 -validity 10000
```

Variables requeridas en la sesión de PowerShell:

```powershell
$env:MIRECIBO_ADMOB_APP_ID='ca-app-pub-…~…'
$env:MIRECIBO_ADMOB_BANNER_ID='ca-app-pub-…/…'
$env:MIRECIBO_KEYSTORE_PATH='C:\ruta-segura\mirecibo-upload.jks'
$env:MIRECIBO_KEYSTORE_PASSWORD='…'
$env:MIRECIBO_KEY_ALIAS='mirecibo-upload'
$env:MIRECIBO_KEY_PASSWORD='…'
pnpm android:play:bundle
```

Salida: `android/app/build/outputs/bundle/release/app-release.aab`.

La compilación `play` elimina los permisos de ubicación e instalación de APK y oculta el actualizador de GitHub. Google Play pasa a gestionar las actualizaciones.
También excluye siempre el token privado de MiRecibo: cada instalación pública usa un identificador aleatorio con límites independientes en el Worker.

## 4. Play Console

1. Crear una aplicación llamada MiRecibo, tipo aplicación, gratuita y con anuncios.
2. Aceptar Play App Signing y subir el `.aab` a **Prueba interna**.
3. Completar acceso a la app: no necesita credenciales.
4. Completar anuncios: sí contiene anuncios.
5. Completar seguridad de datos usando `DATA_SAFETY.md` como borrador y revisando cada respuesta.
6. Añadir la política de privacidad pública.
7. Completar público objetivo, clasificación de contenido y declaración de aplicaciones de noticias (no aplica).
8. Cargar icono 512×512, gráfico de funciones 1024×500 y al menos dos capturas de teléfono.
9. Probar la descarga desde Play, el consentimiento, anuncios, cámara, OCR, análisis de IA, snapshots y restauración.
10. Crear la prueba cerrada cuando la cuenta lo exija y mantener los testers requeridos durante el plazo indicado por Play.
11. Tras la prueba, solicitar acceso a producción y publicar gradualmente.

## 5. Comprobación previa obligatoria

- No aparece ningún anuncio de prueba en la compilación que se envía.
- El consentimiento se puede abrir de nuevo desde Ajustes.
- No hay anuncios sobre botones, formularios, cámara o contenido editable.
- La política y el formulario de seguridad de datos describen AdMob, Cloudflare y OpenAI.
- `versionCode` es mayor que el de cualquier bundle ya subido.
- El AAB está firmado con la misma clave de subida en todas las versiones.
