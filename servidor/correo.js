const nodemailer = require("nodemailer");

function crearCorreo(env = process.env) {
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

  const transporte = nodemailer.createTransport({
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
        ].join("\n")
      });
    }
  };
}

module.exports = { crearCorreo };