import { createRemoteJWKSet, jwtVerify } from 'jose';

const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export class AuthenticationError extends Error {}

/** Token Firebase ID; nunca aceitar uid, e-mail ou privilégios informados pelo cliente. */
export async function requireFirebaseUid(request: Request, projectId: string | undefined): Promise<string> {
  if (!projectId || !/^[a-zA-Z0-9_-]{3,100}$/.test(projectId)) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }
  const header = request.headers.get('Authorization') ?? '';
  const found = /^Bearer\s+([^\s]+)$/.exec(header);
  if (!found) throw new AuthenticationError('TOKEN_AUSENTE');
  try {
    const { payload } = await jwtVerify(found[1], firebaseKeys, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
      clockTolerance: 5,
    });
    const uid = payload.sub;
    const authTime = payload.auth_time;
    if (!uid || uid.length > 128 ||
        typeof authTime !== 'number' || !Number.isSafeInteger(authTime) ||
        authTime > Math.floor(Date.now() / 1000) + 5) {
      throw new Error('CLAIMS_INVALIDAS');
    }
    return uid;
  } catch {
    throw new AuthenticationError('TOKEN_INVALIDO');
  }
}
