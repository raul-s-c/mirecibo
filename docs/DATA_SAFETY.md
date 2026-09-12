# Declaración de seguridad de datos · borrador operativo

Este documento es una ayuda para rellenar Play Console. Debe revisarse contra el comportamiento exacto de la compilación final y los formularios vigentes.

## Recopilación y compartición

La aplicación no crea cuentas. Lista, historial, despensa, categorías, planificación y repostajes permanecen en almacenamiento local y solo salen del dispositivo si el usuario exporta manualmente un snapshot.

### Funciones de IA bajo petición

- Fotografías de tickets y texto reconocido: se transmiten cifrados a Cloudflare y OpenAI para prestar la función solicitada.
- Texto de listas y menús: se transmite cifrado cuando el usuario pulsa generar o interpretar.
- Identificador aleatorio de instalación y métricas de tokens: seguridad, prevención de abuso y control de costes.
- La app debe declararlo en la sección que corresponda a contenido generado por el usuario, fotos y actividad de la aplicación, según las opciones que presente Play Console.

### Google Mobile Ads SDK 25.4.0

Según la declaración vigente del SDK, recoge o comparte automáticamente para publicidad, analítica y prevención del fraude:

- ubicación aproximada derivada de la dirección IP;
- interacciones con la aplicación;
- diagnósticos;
- identificadores del dispositivo u otros identificadores, incluido el ID de publicidad cuando está disponible.

Los datos se cifran en tránsito. La aplicación integra UMP 4.0.0 y no solicita anuncios hasta que `canRequestAds()` lo permite. En Ajustes existe acceso a las opciones de privacidad cuando corresponda.

## Respuestas orientativas

- ¿La app recopila o comparte datos obligatorios? **Sí**, por IA bajo petición y AdMob.
- ¿Los datos se cifran en tránsito? **Sí**.
- ¿Se puede solicitar eliminación? Los datos funcionales se eliminan desde Ajustes o desinstalando; para incidencias se ofrece el canal de soporte y debe añadirse el correo definitivo.
- ¿Cuenta de usuario? **No**, por lo que la eliminación de cuenta no aplica.
- ¿Publicidad? **Sí**.
- ¿ID de publicidad? **Sí**, declarado por el SDK de anuncios.

Referencia que debe volver a comprobarse al enviar cada actualización: https://developers.google.com/admob/android/privacy/play-data-disclosure
