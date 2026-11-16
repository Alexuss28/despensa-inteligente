const express = require("express");
const { ErrorNegocio } = require("./modelo");

function guardarSesion(req) {
  return new Promise((resolve, reject) => {
    req.session.save(error => {
      if (error) return reject(error);
      resolve();
    });
  });
}

function regenerarSesion(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) return reject(error);
      resolve();
    });
  });
}

function crearAccesoGoogle(sistema, google) {
  const router = express.Router();

  router.get("/auth/google", async (req, res, next) => {
    try {
      if (!google) {
        throw new ErrorNegocio(
          "El acceso con Google no está disponible",
          503
        );
      }

      const { url, intento } = await google.iniciar();

      req.session.googleOAuth = intento;
      await guardarSesion(req);

      res.redirect(url);
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/auth/google/callback",
    async (req, res, next) => {
      try {
        if (!google) {
          throw new ErrorNegocio(
            "El acceso con Google no está disponible",
            503
          );
        }

        const intento = req.session.googleOAuth;

        // Consume el intento antes de contactar con Google.
        delete req.session.googleOAuth;
        await guardarSesion(req);

        if (req.query.error !== undefined) {
          throw new ErrorNegocio(
            "El acceso con Google se ha cancelado o rechazado. " +
            "Vuelve a intentarlo desde la página de inicio.",
            401
          );
        }

        const identidad = await google.completar(
          {
            code: req.query.code,
            state: req.query.state
          },
          intento
        );

        const usuario = await sistema.loginGoogle(identidad);

        // Sustituye la sesión anterior tras autenticar al usuario.
        await regenerarSesion(req);

        req.session.email = usuario.email;
        await guardarSesion(req);

        res.redirect("/");
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

module.exports = { crearAccesoGoogle };