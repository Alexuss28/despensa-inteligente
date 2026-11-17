const nodemailer = require("nodemailer");

function escaparHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function htmlConfirmacion(enlace) {
  const url = escaparHtml(enlace);

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f4f7f2;font-family:Arial,sans-serif;color:#24352b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="max-width:520px;background:#ffffff;border:1px solid #dce5d8;border-radius:12px;">
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#27633e;">Despensa Inteligente</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
                Bienvenido. Para activar tu cuenta, confirma tu correo electrónico.
              </p>
              <p style="margin:0 0 24px;">
                <a href="${url}"
                  style="display:inline-block;padding:12px 20px;background:#27633e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
                  Confirmar mi cuenta
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:14px;color:#526458;">
                El enlace caduca en 24 horas y solo puede utilizarse una vez.
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#526458;">
                Si el botón no funciona, copia esta dirección en tu navegador:<br>
                <span style="word-break:break-all;">${url}</span>
              </p>
              <p style="margin:0;font-size:13px;color:#87988b;">
                Si no has solicitado esta cuenta, ignora este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// El parámetro "transporte" permite simular el envío en las pruebas.
function crearCorreo(env = process.env, { transporte: transporteInyectado } = {}) {
  const { SMTP_USER, SMTP_PASSWORD, APP_URL } = env;

  if (!SMTP_USER || !SMTP_PASSWORD || !APP_URL) {
    throw new Error("Falta configurar el correo o APP_URL");
  }

  const base = new URL(APP_URL);

  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password
  ) {
    throw new Error("APP_URL no es válida");
  }

  if (
    env.NODE_ENV === "production" &&
    base.protocol !== "https:"
  ) {
    throw new Error("APP_URL debe utilizar HTTPS en producción");
  }

  const transporte = transporteInyectado || nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });

  return {
    verificar() {
      return transporte.verify();
    },

    async enviarConfirmacion(email, token) {
      if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/.test(token)
      ) {
        throw new Error("Token de confirmación no válido");
      }

      const enlace = new URL(base);
      enlace.hash = `confirmacion=${token}`;

      await transporte.sendMail({
        from: {
          name: "Despensa Inteligente",
          address: SMTP_USER
        },
        to: email,
        subject: "Confirma tu cuenta de Despensa Inteligente",
        text: [
          "Bienvenido a Despensa Inteligente.",
          "",
          "Para confirmar tu cuenta, abre este enlace:",
          enlace.toString(),
          "",
          "El enlace caduca en 24 horas y solo puede utilizarse una vez.",
          "",
          "Si no has solicitado esta cuenta, ignora este mensaje."
        ].join("\n"),
        html: htmlConfirmacion(enlace.toString())
      });
    }
  };
}

module.exports = { crearCorreo, htmlConfirmacion, escaparHtml };