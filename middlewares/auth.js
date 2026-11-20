import { createRemoteJWKSet, jwtVerify } from 'jose';
import 'dotenv/config';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const JWKS = createRemoteJWKSet(new URL(`${CLIENT_URL}/api/auth/jwks`));

export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired access token',
      details: err.message,
    });
  }
}

export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before checking permissions',
      });
    }

    if (req.user.status === 'blocked' || req.user.isBlocked) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account has been suspended by platform administration',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of [${roles.join(', ')}] role`,
      });
    }

    next();
  };
}
