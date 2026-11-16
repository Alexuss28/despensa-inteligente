class CadMemoria {
  constructor() {
    this.usuarios = new Map();
  }

  async buscarPorEmail(email) {
    const usuario = this.usuarios.get(email);
    return usuario ? { ...usuario } : null;
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
}

module.exports = { CadMemoria };