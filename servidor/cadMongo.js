const { MongoClient } = require("mongodb");
const { ErrorNegocio } = require("./modelo");

class CadMongo {
  constructor(cliente, baseDatos) {
    this.cliente = cliente;
    this.baseDatos = baseDatos;
    this.usuarios = baseDatos.collection("usuarios");
  }

  static async conectar(uri, nombreBaseDatos) {
    if (!uri || !nombreBaseDatos) {
      throw new Error("Faltan MONGODB_URI o MONGODB_DB");
    }

    const cliente = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });

    try {
      await cliente.connect();

      const baseDatos = cliente.db(nombreBaseDatos);
      await baseDatos.command({ ping: 1 });

      const cad = new CadMongo(cliente, baseDatos);

          await cad.usuarios.createIndex(
      { googleSub: 1 },
      {
        unique: true,
        partialFilterExpression: {
          googleSub: { $type: "string" }
        }
      }
    );

      return cad;
    } catch (error) {
      await cliente.close();
      throw error;
    }
  }


  async buscarPorEmail(email) {
    return this.usuarios.findOne(
      { email },
      { projection: { _id: 0 } }
    );
  }
    async buscarPorGoogleSub(googleSub) {
    return this.usuarios.findOne(
      { googleSub },
      { projection: { _id: 0 } }
    );
  }

  async guardar(usuario) {
    const { _id, ...datos } = usuario;

    try {
      await this.usuarios.replaceOne(
        { email: datos.email, id: datos.id },
        datos,
        { upsert: true }
      );

      return { ...datos };
    } catch (error) {
      if (error.code === 11000) {
        throw new ErrorNegocio(
          "El email ya está registrado",
          409
        );
      }

      throw error;
    }
  }

  async listar() {
    return this.usuarios
      .find({}, { projection: { _id: 0 } })
      .toArray();
  }
    async confirmarCuenta(tokenHash, ahora) {
    return this.usuarios.findOneAndUpdate(
      {
        estado: "pendiente",
        confirmacionTokenHash: tokenHash,
        confirmacionCaducaEn: { $gt: ahora }
      },
      {
        $set: { estado: "activo" },
        $unset: {
          confirmacionTokenHash: "",
          confirmacionCaducaEn: ""
        }
      },
      {
        returnDocument: "after",
        includeResultMetadata: false,
        projection: { _id: 0 }
      }
    );
  }

  async cerrar() {
    await this.cliente.close();
  }
    async renovarConfirmacion(
    email,
    tokenHash,
    caducaEn,
    ahora
  ) {
    const limite = new Date(ahora.getTime() - 60000);

    const resultado = await this.usuarios.updateOne(
      {
        email,
        estado: "pendiente",
        $or: [
          { confirmacionEnviadaEn: { $exists: false } },
          { confirmacionEnviadaEn: { $lte: limite } }
        ]
      },
      {
        $set: {
          confirmacionTokenHash: tokenHash,
          confirmacionCaducaEn: caducaEn,
          confirmacionEnviadaEn: ahora
        }
      }
    );

    return resultado.modifiedCount === 1;
  }
}

module.exports = { CadMongo };