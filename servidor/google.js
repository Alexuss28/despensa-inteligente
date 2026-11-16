const { randomBytes } = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");
const { ErrorNegocio } = require("./modelo");

function crearGoogle(env = process.env) {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    APP_URL
  } = env;

  // Permite ejecutar las pruebas sin credenciales reales.
  if (!GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_SECRET) {
    return null;
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !APP_URL) {
    throw new Error("Falta configurar el acceso con Google");
  }

  const base = new URL(APP_URL);

  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  ) {
    throw new Error("APP_URL no es válida");
  }

  if (
    env.NODE_ENV === "production" &&
    base.protocol !== "https:"
  ) {
    throw new Error("APP_URL debe usar HTTPS en producción");
  }

  const callback = new URL(
    "/api/auth/google/callback",
    base
  ).toString();

  const cliente = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    callback
  );

  function errorAcceso() {
    return new ErrorNegocio(
      "No se ha podido completar el acceso con Google. " +
      "Vuelve a intentarlo.",
      401
    );
  }

  return {
    async iniciar() {
      const state = randomBytes(32).toString("hex");
      const nonce = randomBytes(32).toString("hex");

      const {
        codeVerifier,
        codeChallenge
      } = await cliente.generateCodeVerifierAsync();

      const url = cliente.generateAuthUrl({
        scope: ["openid", "email"],
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        prompt: "select_account"
      });

      return {
        url,
        intento: {
          state,
          nonce,
          codeVerifier,
          caducaEn: Date.now() + 10 * 60 * 1000
        }
      };
    },

    async completar({ code, state }, intento) {
      if (
        !intento ||
        typeof code !== "string" ||
        code.length === 0 ||
        typeof state !== "string" ||
        state !== intento.state ||
        typeof intento.nonce !== "string" ||
        typeof intento.codeVerifier !== "string" ||
        !Number.isFinite(intento.caducaEn) ||
        Date.now() >= intento.caducaEn
      ) {
        throw errorAcceso();
      }

      try {
        const { tokens } = await cliente.getToken({
          code,
          codeVerifier: intento.codeVerifier
        });

        if (!tokens.id_token) {
          throw errorAcceso();
        }

        const ticket = await cliente.verifyIdToken({
          idToken: tokens.id_token,
          audience: GOOGLE_CLIENT_ID
        });

        const identidad = ticket.getPayload();

        if (
          !identidad ||
          identidad.nonce !== intento.nonce ||
          identidad.email_verified !== true ||
          typeof identidad.sub !== "string" ||
          !identidad.sub ||
          typeof identidad.email !== "string" ||
          !identidad.email
        ) {
          throw errorAcceso();
        }

        return {
          sub: identidad.sub,
          email: identidad.email,
          email_verified: true
        };
      } catch {
        // Evita mostrar tokens o detalles privados del proveedor.
        throw errorAcceso();
      }
    }
  };
}

module.exports = { crearGoogle };