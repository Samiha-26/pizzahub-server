import { createRemoteJWKSet, jwtVerify } from 'jose';
import 'dotenv/config';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
let JWKS = null;
try {
  JWKS = createRemoteJWKSet(new URL(`${CLIENT_URL}/api/auth/jwks`));
} catch {}

const SECRET = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET || 'pizzahub_production_jwt_secret_key_2026'
);

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
    let payload = null;
    let verifyError = null;

    if (JWKS) {
      try {
        const result = await jwtVerify(token, JWKS);
        payload = result.payload;
      } catch (err) {
        verifyError = err;
      }
    }

    if (!payload) {
      try {
        const result = await jwtVerify(token, SECRET);
        payload = result.payload;
      } catch (err) {
        verifyError = err;
      }
    }

    if (!payload) {
      throw verifyError || new Error('Token verification failed');
    }

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

export function optionalToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return verifyToken(req, res, next);
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
