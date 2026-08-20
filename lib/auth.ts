import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = process.env.AUTH_SECRET;

if (!SECRET_KEY) {
  throw new Error(
    "Falta la variable de entorno AUTH_SECRET. Agregala a tu archivo .env (ver instrucciones)."
  );
}

const SECRET = new TextEncoder().encode(SECRET_KEY);

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

export type SessionPayload = {
  sub: string;
  usuario: string;
};
/**
 * Firma un token de sesión (JWT). El contenido no es secreto (no lleva la
 * contraseña ni nada sensible), pero está firmado: si alguien lo modifica
 * desde el navegador, la firma deja de coincidir y se lo rechaza.
 */
export async function crearSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(SECRET);
}

/**
 * Verifica la firma y vigencia de un token. Devuelve el payload si es válido,
 * o null si es inválido, está vencido, o fue manipulado.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.sub !== "number" || typeof payload.usuario !== "string") {
      return null;
    }
    return { sub: payload.sub, usuario: payload.usuario };
  } catch {
    return null;
  }
}