export class DB {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // Users
  async getUserById(id: string) {
    return await this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  }

  async getUserByEmail(email: string) {
    return await this.db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  }

  async createUser(user: any) {
    const { id, email, password_hash, name, role = 'user' } = user;
    const now = Date.now();
    return await this.db.prepare(
      'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, email, password_hash, name, role, now, now).run();
  }

  // Sessions
  async createSession(session: any) {
    const { id, user_id, token_hash, expires_at, user_agent, ip_address } = session;
    const now = Date.now();
    return await this.db.prepare(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, user_id, token_hash, expires_at, now, user_agent, ip_address).run();
  }

  async getSessionByToken(tokenHash: string) {
    return await this.db.prepare(
      'SELECT s.*, u.email, u.name, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ?'
    ).bind(tokenHash, Date.now()).first();
  }

  async deleteSession(tokenHash: string) {
    return await this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }

  // YouTube Tokens
  async getYouTubeTokens(userId: string) {
    return await this.db.prepare('SELECT * FROM youtube_tokens WHERE user_id = ? AND is_active = 1').bind(userId).first();
  }

  async saveYouTubeTokens(tokens: any) {
    const { id, user_id, channel_id, channel_name, access_token_encrypted, refresh_token_encrypted, token_expires_at, scope } = tokens;
    const now = Date.now();
    return await this.db.prepare(`
      INSERT INTO youtube_tokens
      (id, user_id, channel_id, channel_name, access_token_encrypted, refresh_token_encrypted, token_expires_at, scope, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        token_expires_at = excluded.token_expires_at,
        updated_at = excluded.updated_at
    `).bind(id, user_id, channel_id, channel_name, access_token_encrypted, refresh_token_encrypted, token_expires_at, scope, now, now).run();
  }

  // Topics
  async getTopics(options: { limit?: number; offset?: number; isSelected?: boolean } = {}) {
    const { limit = 20, offset = 0, isSelected } = options;
    let query = 'SELECT * FROM topics';
    const params: any[] = [];

    if (isSelected !== undefined) {
      query += ' WHERE is_selected = ?';
      params.push(isSelected ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await this.db.prepare(query).bind(...params).all();
    return results;
  }

  async createTopic(topic: any) {
    const { id, title, description, category, source_url, source_type = 'manual', trending_score = 0, relevance_score = 0 } = topic;
    const now = Date.now();
    return await this.db.prepare(`
      INSERT INTO topics (id, title, description, category, source_url, source_type, trending_score, relevance_score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, title, description, category, source_url, source_type, trending_score, relevance_score, now, now).run();
  }

  async selectTopic(id: string) {
    const now = Date.now();
    return await this.db.prepare(
      'UPDATE topics SET is_selected = 1, selected_at = ?, updated_at = ? WHERE id = ?'
    ).bind(now, now, id).run();
  }

  // Sources
  async getSourcesByTopic(topicId: string) {
    const { results } = await this.db.prepare('SELECT * FROM sources WHERE topic_id = ? ORDER BY credibility_score DESC').bind(topicId).all();
    return results;
  }

  async createSource(source: any) {
    const { id, topic_id, title, url, content, summary, credibility_score = 0, source_type = 'article' } = source;
    const now = Date.now();
    return await this.db.prepare(`
      INSERT INTO sources (id, topic_id, title, url, content, summary, credibility_score, source_type, fetched_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, topic_id, title, url, content, summary, credibility_score, source_type, now, now).run();
  }

  // Projects
  async getProjects(options: { limit?: number; offset?: number; status?: string } = {}) {
    const { limit = 20, offset = 0, status } = options;
    let query = 'SELECT p.*, t.title as topic_title FROM projects p LEFT JOIN topics t ON p.topic_id = t.id';
    const params: any[] = [];

    if (status) {
      query += ' WHERE p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await this.db.prepare(query).bind(...params).all();
    return results;
  }

  async getProjectById(id: string) {
    return await this.db.prepare('SELECT p.*, t.title as topic_title FROM projects p LEFT JOIN topics t ON p.topic_id = t.id WHERE p.id = ?').bind(id).first();
  }

  async createProject(project: any) {
    const { id, topic_id, user_id, title, description, status = 'draft', priority = 0 } = project;
    const now = Date.now();
    return await this.db.prepare(`
      INSERT INTO projects (id, topic_id, user_id, title, description, status, priority, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, topic_id, user_id, title, description, status, priority, now, now).run();
  }

  async updateProjectStatus(id: string, status: string, additionalData: any = {}) {
    const now = Date.now();
    let query = 'UPDATE projects SET status = ?, updated_at = ?';
    const params: any[] = [status, now];

    for (const [key, value] of Object.entries(additionalData)) {
      query += `, ${key} = ?`;
      params.push(value);
    }

    query += ' WHERE id = ?';
    params.push(id);

    return await this.db.prepare(query).bind(...params).run();
  }

  // Scripts
  async getScriptByProject(projectId: string) {
    return await this.db.prepare('SELECT * FROM scripts WHERE project_id = ? ORDER BY version DESC LIMIT 1').bind(projectId).first();
  }

  async createScript(script: any) {
    const { id, project_id, version = 1, hook, body, call_to_action, full_text, word_count, estimated_duration_seconds, tone = 'engaging', language = 'en-US' } = script;
    const now = Date.now();
    return await this.db.prepare(`
      INSERT INTO scripts (id, project_id, version, hook, body, call_to_action, full_text, word_count, estimated_duration_seconds, tone, language, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, project_id, version, hook, body, call_to_action, full_text, word_count, estimated_duration_seconds, tone, language, now, now).run();
  }

  // Storyboards
  async getStoryboardByProject(projectId: string) {
    const { results } = await this.db.prepare('SELECT * FROM storyboards WHERE project_id = ? ORDER BY scene_order ASC').bind(projectId).all();
    return results;
  }

  async createStoryboardScene(scene: any) {
    const { id, project_id, script_id, scene_order, scene_type, narration, visual_prompt, visual_assets, duration_seconds, transition_type, transition_duration, effects } = scene;
    const now = Date.now();
    return await this.db.prepare(`
      INSERT INTO storyboards (id, project_id, script_id, scene_order, scene_type, narration, visual_prompt, visual_assets, duration_seconds, transition_type, transition_duration, effects, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, project_id, script_id, scene_order, scene_type, narration, visual_prompt, visual_assets, duration_seconds, transition_type, transition_duration, effects, now, now).run();
  }

  // Automation Settings
  async getAutomationSettings(userId: string) {
    return await this.db.prepare('SELECT * FROM automation_settings WHERE user_id = ?').bind(userId).first();
  }

  async updateAutomationSettings(userId: string, settings: any) {
    const now = Date.now();
    let query = 'UPDATE automation_settings SET updated_at = ?';
    const params: any[] = [now];

    for (const [key, value] of Object.entries(settings)) {
      query += `, ${key} = ?`;
      params.push(value);
    }

    query += ' WHERE user_id = ?';
    params.push(userId);

    return await this.db.prepare(query).bind(...params).run();
  }

  // Notifications
  async getNotifications(userId: string, unreadOnly = false) {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    if (unreadOnly) {
      query += ' AND is_read = 0';
    }
    query += ' ORDER BY created_at DESC LIMIT 50';

    const { results } = await this.db.prepare(query).bind(userId).all();
    return results;
  }

  async createNotification(notification: any) {
    const { id = crypto.randomUUID(), user_id, project_id, type = 'info', title, message, action_url } = notification;
    const now = Date.now();
    return await this.db.prepare(`
      INSERT INTO notifications (id, user_id, project_id, type, title, message, action_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, user_id, project_id, type, title, message, action_url, now).run();
  }

  // System Logs
  async createSystemLog(log: any) {
    const { id = crypto.randomUUID(), level = 'info', component, message, context, user_id, project_id } = log;
    const now = Date.now();
    return await this.db.prepare(`
      INSERT INTO system_logs (id, level, component, message, context, user_id, project_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, level, component, message, JSON.stringify(context || {}), user_id, project_id, now).run();
  }
}