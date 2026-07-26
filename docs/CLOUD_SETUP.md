# Configurar la copia en la nube (Supabase)

La app funciona **100 % en local** sin necesidad de esto. Sigue esta guía solo si
quieres poder **subir y bajar tus datos** a tu cuenta para pasarlos entre el móvil
y el PC (respaldo en la nube). Es gratis para uso personal.

Al terminar tendrás dos valores (`SUPABASE_URL` y `SUPABASE_ANON_KEY`) que pegarás
en `js/supabase-config.js`. **Ambos son públicos y es seguro publicarlos**: la
seguridad real la dan las políticas RLS y el enlace mágico, no ocultar las claves.

---

## 1. Crea el proyecto

1. Entra en <https://supabase.com> y crea una cuenta (puedes usar tu cuenta de GitHub).
2. **New project** → ponle un nombre, elige una contraseña de base de datos (guárdala)
   y una región cercana. Espera 1-2 minutos a que se aprovisione.

## 2. Crea la tabla y las reglas de seguridad

1. En el proyecto, ve a **SQL Editor** → **New query**.
2. Copia y pega el contenido de [`supabase/schema.sql`](../supabase/schema.sql).
3. Pulsa **Run**. Debe decir _Success_.

Esto crea la tabla `backups` (una fila por usuario) con **RLS** activado: cada
usuario solo puede ver y tocar su propia fila.

## 3. Activa el acceso por enlace mágico

1. Ve a **Authentication → Providers → Email**.
2. Asegúrate de que **Email** está habilitado. El "Magic Link" viene activado por
   defecto (no necesitas contraseñas).

## 4. Autoriza la URL de tu app

El enlace mágico, al pulsarlo, debe volver a **tu** app.

1. Ve a **Authentication → URL Configuration**.
2. En **Site URL** y en **Redirect URLs** añade la URL donde publicas la app.
   Con GitHub Pages suele ser:
   `https://TU-USUARIO.github.io/GestorPersonal/`
3. Si también la pruebas en local, añade además `http://localhost:8000/` (o el
   puerto que uses).

> Importante: la URL debe coincidir **exactamente** (incluida la barra final).
> El cifrado del navegador (WebCrypto) requiere **HTTPS**, así que usa la app
> desde su URL de GitHub Pages, no abriendo el archivo con `file://`.

## 5. Copia tus dos claves

1. Ve a **Project Settings → API**.
2. Copia **Project URL** → será tu `SUPABASE_URL`.
3. Copia **Project API keys → `anon` `public`** → será tu `SUPABASE_ANON_KEY`.

> Nunca uses ni publiques la clave **`service_role`**: esa sí es secreta.

## 6. Pégalas en la app

Edita `js/supabase-config.js`:

```js
const SUPABASE_URL = "https://abcdxyz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...tu-clave-anon...";
```

Haz commit y despliega (GitHub Pages se actualiza solo con el push a `main`).

## 7. Úsala

1. Abre la app → **Ajustes** → aparecerá la tarjeta **☁️ Copia en la nube**.
2. Escribe tu correo → **Enviarme un enlace de acceso**.
3. Abre el correo **en el mismo dispositivo** y pulsa el enlace: volverás a la app
   con la sesión iniciada.
4. **Subir a la nube** guarda tu estado; **Bajar de la nube** lo restaura en otro
   dispositivo (tras iniciar sesión con el mismo correo).

### Cifrado de extremo a extremo (opcional)

Si escribes una **frase de cifrado** antes de subir, tus datos se cifran en tu
dispositivo (AES-GCM) y el servidor **solo guarda texto cifrado**. Para bajarlos en
otro dispositivo tendrás que escribir la **misma frase**. Si la pierdes, la copia
no se puede recuperar: apúntala en un lugar seguro.

---

## Preguntas frecuentes

- **¿Es gratis?** El plan gratuito de Supabase sobra para uso personal.
- **¿Puedo dejar de usarlo?** Sí. Vacía los dos valores en `js/supabase-config.js`
  y la app vuelve a ser 100 % local; la tarjeta de nube desaparece.
- **¿Se sincroniza solo?** Todavía no: por ahora es subir/bajar manual (respaldo).
  La sincronización automática es el siguiente paso.
