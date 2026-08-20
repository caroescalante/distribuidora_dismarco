// Script para crear (o resetear la contraseña de) un usuario del sistema.
// SOLO lo corrés vos, localmente, desde la terminal. Nunca existe una
// pantalla web para esto — es la forma en que vos controlás quién entra.
//
// Uso:
//   node scripts/crear-usuario.mjs <usuario> <password> [nombre]
//
// Ejemplo:
//   node scripts/crear-usuario.mjs dismarco "Un4Clave$Segura2026" "Cliente Dismarco"

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [, , usuario, password, nombre] = process.argv;

  if (!usuario || !password) {
    console.error("Uso: node scripts/crear-usuario.mjs <usuario> <password> [nombre]");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("La contraseña debería tener al menos 8 caracteres.");
    process.exit(1);
  }

  const existente = await prisma.usuarios.findUnique({ where: { usuario } });

  // bcrypt con "cost factor" 12: buen balance entre seguridad y velocidad hoy en día.
  const password_hash = await bcrypt.hash(password, 12);

  if (existente) {
    const actualizado = await prisma.usuarios.update({
      where: { usuario },
      data: {
        password_hash,
        nombre: nombre ?? existente.nombre,
        activo: "si",
        intentos_fallidos: 0,
        bloqueado_hasta: null,
      },
    });
    console.log(`Contraseña actualizada para el usuario "${actualizado.usuario}" (id ${actualizado.id}).`);
  } else {
    const creado = await prisma.usuarios.create({
      data: { usuario, password_hash, nombre: nombre ?? null },
    });
    console.log(`Usuario creado: "${creado.usuario}" (id ${creado.id}).`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
