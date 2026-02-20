export enum UserRole {
  CONSUMER = 'consumer',
  PROVIDER = 'provider',
  ADMIN = 'admin',
}

/** Shape stored inside the JWT (standard + custom claims). */
export interface JwtPayload {
  sub: string; // userId
  roles: UserRole[];
  sessionId: string;
  iat?: number; // added automatically by JWT library on sign; present on decode
  exp?: number; // added automatically by JWT library on sign; present on decode
}

/** Mapped user context attached to every authenticated request. */
export interface AuthenticatedUser {
  userId: string;
  roles: UserRole[];
  sessionId: string;
}

// ----- Module augmentations -----

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload; // raw decoded token
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Populated by authenticate hook; undefined on public routes. */
    currentUser?: AuthenticatedUser;
  }
}