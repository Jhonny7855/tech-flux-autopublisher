import { ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  });

  const isDevelopment = c.env?.ENVIRONMENT === 'development';

  if ('status' in err && typeof err.status === 'number') {
    return c.json(
      {
        error: err.message || 'HTTP Exception',
        ...(isDevelopment && { stack: err.stack }),
      },
      err.status as any
    );
  }

  return c.json(
    {
      error: 'Internal Server Error',
      message: isDevelopment ? err.message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: err.stack }),
    },
    500
  );
};