import { MiddlewareHandler } from 'hono';
import { verify } from 'hono/jwt';
import { DB } from '../db/client';

export const authMiddleware: MiddlewareHandler<{
  Bindings: { DB: D1Database; SECRETS: KVNamespace };
  Variables: { user: any; db: DB };
}> = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized: No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const db = new DB(c.env.DB);

    // Verify JWT token
    let payload: any;
    try {
      const secret = await c.env.SECRETS.get('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT secret not configured');
      }
      payload = await verify(token, secret);
    } catch (jwtError) {
      return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }

    // Check session in database
    const session = await db.getSessionByToken(token);
    if (!session) {
      return c.json({ error: 'Unauthorized: Session expired' }, 401);
    }

    // Get user
    const user = await db.getUserById(session.user_id);
    if (!user || !user.is_active) {
      return c.json({ error: 'Unauthorized: User not found or inactive' }, 401);
    }

    c.set('user', user);
    c.set('db', db);
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

export const optionalAuthMiddleware: MiddlewareHandler<{
  Bindings: { DB: D1Database; SECRETS: KVNamespace };
  Variables: { user?: any; db: DB };
}> = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    const db = new DB(c.env.DB);
    c.set('db', db);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const secret = await c.env.SECRETS.get('JWT_SECRET');
      if (secret) {
        try {
          const payload = await verify(token, secret);
          const session = await db.getSessionByToken(token);
          if (session) {
            const user = await db.getUserById(session.user_id);
            if (user && user.is_active) {
              c.set('user', user);
            }
          }
        } catch {
          // Ignore invalid tokens in optional auth
        }
      }
    }

    await next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    await next();
  }
};