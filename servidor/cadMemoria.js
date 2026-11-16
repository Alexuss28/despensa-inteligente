class CadMemoria {
  constructor() {
    this.usuarios = new Map();
  }

  async buscarPorEmail(email) {
    const usuario = this.usuarios.get(email);
    return usuario ? { ...usuario } : null;
  }
    async buscarPorGoogleSub(googleSub) {
    for (const usuario of this.usuarios.values()) {
      if (usuario.googleSub === googleSub) {
        return { ...usuario };
      }
    }

    return null;
  }

  async guardar(usuario) {
    this.usuarios.set(usuario.email, { ...usuario });
    return { ...usuario };
  }

  async listar() {
    return [...this.usuarios.values()].map(usuario => ({ ...usuario }));
  }
    async confirmarCuenta(tokenHash, ahora) {
    for (const [email, usuario] of this.usuarios) {
      if (
        usuario.estado === "pendiente" &&
        usuario.confirmacionTokenHash === tokenHash &&
        usuario.confirmacionCaducaEn instanceof Date &&
        usuario.confirmacionCaducaEn.getTime() > ahora.getTime()
      ) {
        const actualizado = {
          ...usuario,
          estado: "activo"
        };

        delete actualizado.confirmacionTokenHash;
        delete actualizado.confirmacionCaducaEn;

        this.usuarios.set(email, actualizado);

        return { ...actualizado };
      }
    }

    return null;
  }
    async renovarConfirmacion(
    email,
    tokenHash,
    caducaEn,
    ahora
  ) {
    const usuario = this.usuarios.get(email);

    if (!usuario || usuario.estado !== "pendiente") {
      return false;
    }

    const ultimoIntento = usuario.confirmacionEnviadaEn;

    if (
      ultimoIntento instanceof Date &&
      ahora.getTime() - ultimoIntento.getTime() < 60000
    ) {
      return false;
    }

    this.usuarios.set(email, {
      ...usuario,
      confirmacionTokenHash: tokenHash,
      confirmacionCaducaEn: caducaEn,
      confirmacionEnviadaEn: ahora
    });

    return true;
  }
}

module.exports = { CadMemoria };