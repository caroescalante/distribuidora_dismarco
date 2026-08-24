import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { crearSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

// Mismo mensaje para usuario inexistente o contraseña incorrecta: así nadie
// puede "descubrir" qué usuarios existen probando distintos nombres.
function errorCredenciales() {
  return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json();

    if (!usuario?.trim() || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const user = await prisma.usuarios.findUnique({
      where: { usuario: usuario.trim() },
    });

    if (!user || user.activo === "no") {
      return errorCredenciales();
    }

    if (user.bloqueado_hasta && user.bloqueado_hasta.getTime() > Date.now()) {
      const minutosRestantes = Math.ceil(
        (user.bloqueado_hasta.getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        {
          error: `Demasiados intentos fallidos. Probá de nuevo en ${minutosRestantes} minuto(s).`,
        },
        { status: 429 }
      );
    }

    const passwordValida = await bcrypt.compare(password, user.password_hash);

    if (!passwordValida) {
      const intentos = user.intentos_fallidos + 1;
      const yaLlegoAlLimite = intentos >= MAX_INTENTOS;

      await prisma.usuarios.update({
        where: { id: user.id },
        data: {
          intentos_fallidos: yaLlegoAlLimite ? 0 : intentos,
          bloqueado_hasta: yaLlegoAlLimite
            ? new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000)
            : null,
        },
      });

      return errorCredenciales();
    }

    // Login correcto: reseteamos intentos fallidos y registramos el acceso.
    await prisma.usuarios.update({
      where: { id: user.id },
      data: { intentos_fallidos: 0, bloqueado_hasta: null, ultimo_acceso: new Date() },
    });

    const token = await crearSessionToken({ sub: String(user.id), usuario: user.usuario });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true, // JavaScript del navegador (ni el inspector) puede leer esta cookie.
      secure: process.env.NODE_ENV === "production", // HTTPS obligatorio en producción.
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return res;
  } catch (err) {
    console.error("Error en login:", err);
    return NextResponse.json({ error: "Ocurrió un error al iniciar sesión" }, { status: 500 });
  }
}