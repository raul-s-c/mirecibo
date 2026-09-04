# Servicio de análisis de tickets

El Worker recibe una fotografía, la envía a OpenAI con visión y devuelve un JSON validado por esquema. La aplicación nunca contiene `OPENAI_API_KEY`.

Antes de desplegar hay que iniciar sesión en Cloudflare y cargar dos secretos de forma interactiva:

```powershell
pnpm exec wrangler login
pnpm exec wrangler secret put OPENAI_API_KEY --config worker/wrangler.jsonc
pnpm exec wrangler secret put APP_ACCESS_TOKEN --config worker/wrangler.jsonc
pnpm worker:deploy
```

El segundo secreto debe ser un token aleatorio largo. Después se introduce la URL desplegada y ese token en **Ajustes > Análisis inteligente** dentro de la APK.

## Casos reales de validación

`evals/ground-truth.json` contiene los resultados esperados de un ticket de combustible Plenergy y uno de compra Mercadona. El evaluador comprueba, entre otras cosas, que una reserva de combustible no se use como total, que las líneas de IVA no aparezcan como productos y que se interpreten correctamente artículos vendidos por peso.
