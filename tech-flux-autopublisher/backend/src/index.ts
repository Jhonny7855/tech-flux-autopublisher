import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';

import authRoutes from './routes/auth';
import topicRoutes from './routes/topics';
import projectRoutes from './routes/projects';
import scriptRoutes from './routes/scripts';
import storyboardRoutes from './routes/storyboards';
import voiceRoutes from './routes/voice';
import visualRoutes from './routes/visuals';
import videoRoutes from './routes/video';
import seoRoutes from './routes/seo';
import qualityRoutes from './routes/quality';
import youtubeRoutes from './routes/youtube';
import analyticsRoutes from './routes/analytics';
import automationRoutes from './routes/automation';
import notificationRoutes from './routes/notifications';
import settingsRoutes from './routes/settings';
import healthRoutes from './routes/health';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import { validationMiddleware } from './middleware/validation';
import { DB } from './db/client';
import { env } from './utils/env';

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    SECRETS: KVNamespace;
    STORAGE: R2Bucket;
    ENVIRONMENT: string;
    API_VERSION: string;
  };
}>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://tech-flux.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  maxAge: 86400,
}));

// Rate limiting
app.use('/api/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
}));

// Health check (no auth required)
app.route('/api/health', healthRoutes);

// Public auth routes
app.route('/api/auth', authRoutes);

// Protected routes
const protectedRoutes = new Hono();
protectedRoutes.use('*', authMiddleware);
protectedRoutes.use('*', validationMiddleware);

protectedRoutes.route('/topics', topicRoutes);
protectedRoutes.route('/projects', projectRoutes);
protectedRoutes.route('/scripts', scriptRoutes);
protectedRoutes.route('/storyboards', storyboardRoutes);
protectedRoutes.route('/voice', voiceRoutes);
protectedRoutes.route('/visuals', visualRoutes);
protectedRoutes.route('/video', videoRoutes);
protectedRoutes.route('/seo', seoRoutes);
protectedRoutes.route('/quality', qualityRoutes);
protectedRoutes.route('/youtube', youtubeRoutes);
protectedRoutes.route('/analytics', analyticsRoutes);
protectedRoutes.route('/automation', automationRoutes);
protectedRoutes.route('/notifications', notificationRoutes);
protectedRoutes.route('/settings', settingsRoutes);

app.route('/api', protectedRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// Global error handler
app.onError(errorHandler);

// Cron trigger for daily automation
export default {
  fetch: app.fetch,
  scheduled: async (event: ScheduledController, env: any, ctx: ExecutionContext) => {
    if (event.cron === '0 0 * * *') {
      // Trigger daily automation at 00:00 UTC (06:00 AM IST)
      await triggerDailyAutomation(env, ctx);
    }
  },
};

async function triggerDailyAutomation(env: any, ctx: ExecutionContext) {
  console.log('[CRON] Daily automation triggered at', new Date().toISOString());

  try {
    const db = new DB(env.DB);
    const settings = await db.getAutomationSettings('default-user');

    if (!settings || !settings.is_enabled) {
      console.log('[CRON] Automation is disabled');
      return;
    }

    // Check quota
    if (settings.youtube_quota_used >= settings.youtube_quota_limit * 0.9) {
      await db.createNotification({
        user_id: 'default-user',
        type: 'quota',
        title: 'YouTube Quota Warning',
        message: `YouTube API quota at ${Math.round(settings.youtube_quota_used / settings.youtube_quota_limit * 100)}% usage. Automation may be limited.`,
      });
    }

    // Trigger the automation workflow via GitHub Actions
    const response = await fetch('https://api.github.com/repos/YOUR_USERNAME/tech-flux-autopublisher/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        event_type: 'daily-automation',
        client_payload: {
          user_id: 'default-user',
          scheduled_at: Date.now(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub Actions dispatch failed: ${response.statusText}`);
    }

    console.log('[CRON] Daily automation workflow triggered successfully');

    // Log the trigger
    await db.createSystemLog({
      level: 'info',
      component: 'scheduler',
      message: 'Daily automation triggered via GitHub Actions',
      context: { trigger_time: Date.now() },
    });
  } catch (error) {
    console.error('[CRON] Daily automation failed:', error);

    await db.createSystemLog({
      level: 'error',
      component: 'scheduler',
      message: 'Daily automation trigger failed',
      context: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}