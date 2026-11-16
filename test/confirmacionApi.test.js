const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { crearApp } = require("../servidor/app");
const { Sistema } = require("../servidor/modelo");
const { CadMemoria } = require("../servidor/cadMemoria");

function preparar() {
  const enviados = [];
  const cad = new CadMemoria();
  const sistema = new Sistema(cad);

  const correo = {
    async enviarConfirmacion(email, token) {
      enviados.push({ email, token });
    }
  };

  const app = crearApp(sistema, {
    secret: "secreto-de-pruebas-con-al-menos-32-caracteres",
    produccion: false,
    correo
  });

  return { app, cad, enviados };
}

test("El registro envía el token sin exponerlo en la respuesta", async () => {
  const { app, cad, enviados } = preparar();

  const respuesta = await request(app)
    .post("/api/registro")
    .send({
      email: "correo@example.com",
      password: "ClavePrueba123"
    })
    .expect(201);

  assert.equal(respuesta.body.correoEnviado, true);
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].email, "correo@example.com");

  assert.match(enviados[0].token, /^[a-f0-9]{64}$/);

  assert.equal(
    JSON.stringify(respuesta.body).includes(enviados[0].token),
    false
  );

  assert.equal(respuesta.body.usuario.passwordHash, undefined);
  assert.equal(
    respuesta.body.usuario.confirmacionTokenHash,
    undefined
  );

  const guardado = await cad.buscarPorEmail("correo@example.com");

  assert.equal(guardado.estado, "pendiente");
  assert.notEqual(
    guardado.confirmacionTokenHash,
    enviados[0].token
  );
});

test("La API confirma sin sesión y permite después iniciar sesión", async () => {
  const { app, enviados } = preparar();

  await request(app)
    .post("/api/registro")
    .send({
      email: "acceso@example.com",
      password: "ClavePrueba123"
    })
    .expect(201);

  await request(app)
    .post("/api/login")
    .send({
      email: "acceso@example.com",
      password: "ClavePrueba123"
    })
    .expect(403);

  await request(app)
    .post("/api/confirmar-cuenta")
    .send({ token: enviados[0].token })
    .expect(200);

  await request(app)
    .post("/api/login")
    .send({
      email: "acceso@example.com",
      password: "ClavePrueba123"
    })
    .expect(200);

  await request(app)
    .post("/api/confirmar-cuenta")
    .send({ token: enviados[0].token })
    .expect(400);
});

test("La API rechaza un token inventado", async () => {
  const { app } = preparar();

  await request(app)
    .post("/api/confirmar-cuenta")
    .send({ token: "a".repeat(64) })
    .expect(400);
});