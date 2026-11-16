# Despensa Inteligente

Proyecto de Israel Amador Rodelgo para la asignatura Procesos de Ingeniería Software.

Aplicación:
[Despensa Inteligente](https://despensa-inteligente-599179699590.europe-west1.run.app)

## Tecnologías y arquitectura

La aplicación utiliza JavaScript, Node.js 24 y Express en el servidor,
y HTML, CSS y JavaScript en el cliente.

Se organiza en capas y componentes:

- `cliente/`: interfaz y consultas a la API mediante fetch.
- `servidor/api.js`: rutas HTTP de usuarios, autenticación y confirmación.
- `servidor/accesoGoogle.js`: rutas de inicio y retorno del acceso con Google.
- `servidor/google.js`: comunicación con Google y verificación de identidad.
- `servidor/modelo.js`: reglas de negocio y comprobación de permisos.
- `servidor/cadMongo.js`: almacenamiento de usuarios en MongoDB Atlas.
- `servidor/cadMemoria.js`: almacenamiento en memoria utilizado en las pruebas.
- `servidor/confirmacion.js`: generación y resumen de tokens de confirmación.
- `servidor/correo.js`: envío de correos mediante Nodemailer y Gmail.
- `servidor/sesion.js`: configuración de las sesiones y cookies.
- `servidor/app.js`: configuración de Express y middleware.
- `servidor/registroActividad.js`: registros estructurados de peticiones.
- `index.js`: conexión a MongoDB y arranque del servidor.

Express sirve el frontend y la API desde el mismo origen.
La lógica de negocio y los permisos se ejecutan en el servidor.

bcrypt genera los hashes de las contraseñas.
express-session gestiona las sesiones y connect-mongo las almacena
en MongoDB. google-auth-library verifica los tokens de identidad de Google.

## Ejecución local

Requisitos:

- Node.js 24 y npm.
- Acceso a una base de datos MongoDB Atlas.
- Una cuenta Gmail con contraseña de aplicación para enviar correos.
- Credenciales OAuth de aplicación web para habilitar el acceso con Google.

Instalar las dependencias:

```powershell
npm.cmd ci
```

Si no existe un archivo `.env`, crearlo a partir del ejemplo:

```powershell
Copy-Item .env.example .env
```

Si ya existe un `.env` configurado, conservarlo.

Generar una clave de sesión:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Completar la configuración local:

```dotenv
PORT=3000
NODE_ENV=development
SESSION_SECRET=REEMPLAZAR_POR_CLAVE_ALEATORIA
MONGODB_URI=REEMPLAZAR_POR_CADENA_DE_CONEXION
MONGODB_DB=despensa_inteligente
ENABLE_TEST_ACCOUNT=false

APP_URL=http://localhost:3000
SMTP_USER=REEMPLAZAR_POR_CORREO_GMAIL
SMTP_PASSWORD=REEMPLAZAR_POR_CONTRASENA_DE_APLICACION

GOOGLE_CLIENT_ID=REEMPLAZAR_POR_ID_DE_CLIENTE
GOOGLE_CLIENT_SECRET=REEMPLAZAR_POR_SECRETO_DE_CLIENTE
```

Los valores anteriores son marcadores y deben sustituirse por los reales.

La cadena de MongoDB debe incluir las credenciales del usuario de base
de datos. Los caracteres especiales de la contraseña deben codificarse
para una URL.

La IP del equipo debe estar autorizada en la lista de acceso de Atlas.
El usuario de conexión necesita el rol `readWrite` sobre
`despensa_inteligente`.

Para el correo se utiliza una contraseña de aplicación de Google,
no la contraseña habitual de Gmail.

El cliente OAuth debe ser de tipo aplicación web y tener autorizada
esta URI de redireccionamiento local:

```text
http://localhost:3000/api/auth/google/callback
```

`GOOGLE_CLIENT_ID` es el identificador que termina en
`.apps.googleusercontent.com`. Es diferente de `GOOGLE_CLIENT_SECRET`.

Para ejecutar sin acceso con Google, dejar ambas variables de Google
vacías. Las rutas de Google devolverán 503 mientras no esté configurado.

Arrancar:

```powershell
npm.cmd start
```

Abrir [http://localhost:3000](http://localhost:3000).

Reiniciar el servidor después de modificar las variables de entorno.

En otros terminales puede utilizarse `npm` en lugar de `npm.cmd`.

## Variables de entorno

| Variable | Finalidad |
|---|---|
| `PORT` | Puerto HTTP. Cloud Run lo proporciona automáticamente. |
| `NODE_ENV` | `development` en local y `production` en Cloud Run. |
| `SESSION_SECRET` | Clave aleatoria de al menos 32 caracteres para firmar la cookie de sesión. |
| `MONGODB_URI` | Cadena de conexión privada a MongoDB Atlas. |
| `MONGODB_DB` | Nombre de la base de datos: `despensa_inteligente`. |
| `ENABLE_TEST_ACCOUNT` | `true` para preparar una cuenta activa de prueba; `false` para deshabilitar su preparación. |
| `TEST_ACCOUNT_EMAIL` | Correo de la cuenta de prueba, si se habilita. |
| `TEST_ACCOUNT_PASSWORD` | Contraseña de la cuenta de prueba, si se habilita. |
| `APP_URL` | URL base de la aplicación. Se utiliza para los enlaces de confirmación y el retorno de Google. |
| `SMTP_USER` | Cuenta Gmail que envía los correos. |
| `SMTP_PASSWORD` | Contraseña de aplicación de la cuenta Gmail. |
| `GOOGLE_CLIENT_ID` | Identificador del cliente OAuth de Google. |
| `GOOGLE_CLIENT_SECRET` | Secreto del cliente OAuth de Google. |

`.env` contiene configuración privada y no se sube al repositorio.
`.env.example` documenta las variables sin credenciales reales.

En producción, `APP_URL` debe utilizar HTTPS.

En Cloud Run se utiliza `ENABLE_TEST_ACCOUNT=false`.
Deshabilitar la preparación no elimina una cuenta que ya esté guardada.

## Funcionalidades desarrolladas

### Hito 1: gestión de usuarios

- Separación entre API, lógica de negocio y acceso a datos.
- Creación y consulta de usuarios.
- Estados `pendiente`, `activo` y `eliminado`.
- Eliminación lógica de cuentas.

### Hito 2: autenticación y sesiones

- Interfaz de registro e inicio de sesión.
- Contraseñas almacenadas mediante hash bcrypt.
- Registro de cuentas pendientes de confirmación.
- Inicio de sesión para cuentas activas.
- Consulta y cierre de sesión.
- Protección de rutas que requieren autenticación.

### Hito 3: persistencia, permisos y registros

- Usuarios almacenados en MongoDB Atlas.
- Sesiones persistentes mediante connect-mongo.
- Índice único sobre el email para impedir duplicados.
- Índice TTL para eliminar sesiones caducadas.
- Roles `usuario` y `administrador`.
- Permisos comprobados consultando la cuenta almacenada.
- Listado y consulta de cuentas reservados al administrador.
- Eliminación de la propia cuenta o de otras cuentas por un administrador.
- Panel gráfico exclusivo para administradores con email, rol y estado.
- Actualización del listado y mensajes de carga, lista vacía y errores.
- Limpieza del panel al cerrar sesión.
- Registros JSON de operaciones, estados HTTP y duración.
- Despliegue en Cloud Run conectado a Atlas.

### Hito 4: confirmación por correo y acceso con Google

- Envío de un enlace de confirmación al registrar una cuenta con contraseña.
- Tokens aleatorios de confirmación con caducidad de 24 horas.
- Almacenamiento del resumen SHA-256 del token.
- Confirmación de cuentas pendientes mediante un token de un solo uso.
- Reenvío de confirmación con un intervalo mínimo de un minuto.
- Cada nuevo enlace sustituye al anterior.
- Respuesta genérica al solicitar el reenvío para cuentas no elegibles.
- Si falla el envío inicial, la cuenta permanece pendiente y puede solicitarse el reenvío.
- Acceso con Google mediante el flujo de código de autorización.
- Verificación del token de identidad y del correo verificado.
- Comprobación de `state`, `nonce` y uso de PKCE.
- Intentos de acceso con Google con caducidad de diez minutos.
- Creación de cuentas de Google activas y con rol `usuario`.
- Identificación de cuentas de Google mediante `googleSub`.
- Índice único parcial sobre `googleSub`.
- Rechazo del acceso a cuentas eliminadas.
- Conservación del rol almacenado de las cuentas existentes.
- Regeneración de la sesión tras completar el acceso.

Las cuentas existentes no se vinculan automáticamente con Google
por coincidencia de email. Si el correo ya está registrado mediante
otro método, debe utilizarse su método de acceso original.

Las cuentas creadas mediante Google no reciben una contraseña local.

## Persistencia

Los usuarios y las sesiones se almacenan en las colecciones `usuarios`
y `sesiones` de la base `despensa_inteligente`.

La persistencia permite conservar los datos tras reiniciar el servidor
y compartirlos entre instancias.

Para conservar una sesión también deben mantenerse su cookie,
su vigencia y el mismo `SESSION_SECRET`.

Cambiar `SESSION_SECRET` invalida las cookies firmadas con la clave anterior.

## API

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/salud` | Público |
| POST | `/api/registro` | Público |
| POST | `/api/confirmar-cuenta` | Público; requiere token válido |
| POST | `/api/reenviar-confirmacion` | Público |
| POST | `/api/login` | Público |
| GET | `/api/auth/google` | Público; inicia el acceso con Google |
| GET | `/api/auth/google/callback` | Público; valida el retorno de Google |
| POST | `/api/logout` | Cierre de sesión |
| GET | `/api/sesion` | Usuario autenticado |
| GET | `/api/usuarios` | Administrador |
| GET | `/api/usuarios/:email/activo` | Administrador |
| DELETE | `/api/usuarios/:email` | Administrador o propietario de la cuenta |
| POST | `/api/prueba/bloqueo` | Público; ejercicio técnico de cálculo de bloqueo |

### Registro y confirmación

`POST /api/registro` recibe:

```json
{
  "email": "usuario@example.com",
  "password": "UnaContrasenaDeEjemplo123!"
}
```

Crea una cuenta con rol `usuario` y estado `pendiente`.
La respuesta indica si se ha podido enviar el correo.

`POST /api/confirmar-cuenta` recibe:

```json
{
  "token": "TOKEN_RECIBIDO_EN_EL_ENLACE"
}
```

Un token válido activa la cuenta y queda consumido.
Los tokens inválidos, caducados o ya utilizados se rechazan.

`POST /api/reenviar-confirmacion` recibe:

```json
{
  "email": "usuario@example.com"
}
```

El servidor intenta enviar un nuevo enlace si la cuenta está pendiente
y ha transcurrido el intervalo mínimo entre solicitudes.

### Acceso con Google

El navegador inicia el flujo visitando `/api/auth/google`.
Google devuelve al usuario a `/api/auth/google/callback`.

El servidor valida la respuesta antes de crear una sesión y redirige
a la página inicial cuando el acceso termina correctamente.

Los errores se devuelven actualmente en formato JSON.

### Cálculo de bloqueo

`POST /api/prueba/bloqueo` recibe un array `fallos` con fechas
y una fecha `ahora`.

Esta ruta calcula un resultado para el ejercicio técnico.
No registra automáticamente los fallos de inicio de sesión
ni aplica un bloqueo al login real.

### Datos públicos y administración

Los datos públicos del usuario incluyen `id`, `email`, `rol` y `estado`.
No incluyen contraseñas, hashes ni tokens de confirmación.

La cuenta administrativa de prueba se preparó manualmente en Atlas.
No existe un formulario público para asignar el rol de administrador.
Su contraseña no se incluye en el repositorio.

## Pruebas automatizadas

Ejecutar:

```powershell
npm.cmd test
```

En la última validación se aprobaron 71 pruebas automatizadas.

Cubren lógica de negocio, autenticación, sesiones, API, entrega del
frontend, permisos, confirmación, reenvío, acceso con Google
y el ejercicio técnico de bloqueo.

Las pruebas de Google comprueban, entre otros casos:

- Creación de cuentas activas con rol usuario.
- Rechazo de correos no verificados e identidades sin identificador.
- Conservación de la identidad y del rol de una cuenta existente.
- Rechazo de cuentas eliminadas.
- Ausencia de vinculación automática por coincidencia de email.
- Inicio del flujo mediante redirección.
- Creación y cierre de sesión.
- Rechazo de retornos sin intento previo.
- Rechazo de un estado incorrecto en el componente simulado.
- Consumo del intento cuando el acceso se cancela.
- Respuesta 503 cuando Google no está configurado.

Las pruebas HTTP de Google utilizan un componente simulado:
no contactan con Google ni requieren credenciales reales.
No constituyen una comprobación criptográfica de tokens reales.

Las pruebas de negocio y HTTP utilizan almacenamiento en memoria.
No modifican Atlas ni sustituyen las pruebas de integración
con MongoDB y los proveedores externos.

GitHub Actions ejecuta las pruebas en los pull requests hacia `main`
y en los cambios integrados en `main`.

## Validaciones manuales realizadas

- Conexión local a MongoDB Atlas.
- Sesión conservada tras reiniciar el servidor local.
- Acceso a una cuenta persistida con `ENABLE_TEST_ACCOUNT=false`.
- Listado de usuarios por administrador en local y en Cloud Run.
- Rechazo de operaciones administrativas para usuarios sin permisos.
- Respuestas de listado sin `passwordHash`.
- Registro estructurado de una respuesta 403 con nivel `WARNING`.
- Envío SMTP comprobado en local.
- Registro, recepción del correo, confirmación e inicio de sesión en producción.
- Rechazo de un enlace de confirmación ya utilizado en producción.
- Reenvío de confirmación y sustitución del enlace anterior en local.
- Acceso real con Google en local y en Cloud Run.
- Conservación de la sesión al recargar tras acceder con Google.
- Cierre de sesión y nuevo acceso con Google.
- Compilación y despliegue de las ampliaciones mediante Cloud Build.

## Registros de actividad

Las peticiones a `/api` generan registros JSON con:

- Identificador de solicitud.
- Fecha.
- Método HTTP.
- Operación.
- Estado HTTP.
- Duración en milisegundos.
- Nivel `INFO`, `WARNING` o `ERROR` según el estado.

El middleware de actividad no incluye cuerpos de petición,
contraseñas, cookies, cadenas de conexión, emails de las rutas
ni parámetros de consulta del retorno de Google.

Esta descripción corresponde a los registros generados por la aplicación.
Los registros de solicitudes de la infraestructura se gestionan por separado.

Se consultan en Cloud Run, en **Observabilidad → Registros**.
Cloud Logging reconoce `severity` como nivel del registro.

## Despliegue

Cloud Build está conectado al repositorio de GitHub.
Los cambios integrados en `main` construyen la imagen mediante
el Dockerfile y se despliegan en Cloud Run.

- Servicio: `despensa-inteligente`.
- Región: `europe-west1`.
- Rama del activador de despliegue: `main`.

### Configuración de producción

- `NODE_ENV=production`.
- `ENABLE_TEST_ACCOUNT=false`.
- `MONGODB_DB=despensa_inteligente`.
- `SESSION_SECRET` configurado de forma privada.
- `APP_URL=https://despensa-inteligente-599179699590.europe-west1.run.app`.
- `SMTP_USER` configurado con la cuenta de envío.
- `GOOGLE_CLIENT_ID` configurado con el identificador OAuth.

Las credenciales privadas se referencian desde Secret Manager:

| Variable | Secreto |
|---|---|
| `MONGODB_URI` | `mongodb-uri` |
| `SMTP_PASSWORD` | `smtp-password` |
| `GOOGLE_CLIENT_SECRET` | `google-client-secret` |

Cloud Run debe referenciar la versión correspondiente de cada secreto.

Su cuenta de servicio necesita el rol
**Secret Manager Secret Accessor** sobre esos secretos.

El usuario de conexión de Atlas tiene `readWrite` sobre
`despensa_inteligente`.

### Configuración de Google

El cliente OAuth tiene autorizadas las siguientes URI de redireccionamiento:

```text
http://localhost:3000/api/auth/google/callback
```

```text
https://despensa-inteligente-599179699590.europe-west1.run.app/api/auth/google/callback
```

Las credenciales configuradas deben pertenecer al mismo cliente OAuth.

## Limitaciones y tareas pendientes

- La gestión de alimentos se desarrollará posteriormente.
- La cuenta administrativa se prepara manualmente.
- No se ha implementado la vinculación de una cuenta local con Google.
- No se ha implementado la recuperación de contraseñas.
- Los errores del flujo de Google se muestran actualmente como JSON.
- El intervalo de reenvío se aplica por cuenta; no es un límite global
  de peticiones ni sustituye otras medidas contra el abuso.
- Las pruebas automatizadas descritas no utilizan un MongoDB real
  ni realizan llamadas a los proveedores de correo o Google.
- El acceso de red de Atlas utilizado para Cloud Run se ha habilitado
  mediante una entrada temporal `0.0.0.0/0`.
- Debe resolverse la configuración de red de Atlas antes de que
  caduque esa entrada para evitar una nueva pérdida de acceso.

La entrada `0.0.0.0/0` permite intentar conexiones desde cualquier
dirección IPv4, aunque siguen siendo necesarias las credenciales
de MongoDB.