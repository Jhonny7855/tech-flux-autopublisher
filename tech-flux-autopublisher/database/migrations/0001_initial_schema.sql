-- Tech Flux AutoPublisher 3.0 Database Schema
-- SQLite compatible (Cloudflare D1)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  user_agent TEXT,
  ip_address TEXT
);

-- YouTube OAuth tokens (encrypted)
CREATE TABLE IF NOT EXISTS youtube_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT UNIQUE NOT NULL,
  channel_name TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at INTEGER NOT NULL,
  scope TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Topics for research
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  source_url TEXT,
  source_type TEXT, -- 'trending', 'manual', 'api', 'news'
  trending_score REAL DEFAULT 0,
  relevance_score REAL DEFAULT 0,
  is_selected INTEGER DEFAULT 0,
  selected_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Research sources
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  credibility_score REAL DEFAULT 0,
  source_type TEXT, -- 'article', 'video', 'paper', 'news', 'api'
  is_verified INTEGER DEFAULT 0,
  fetched_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Video projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'researching', 'scripting', 'generating', 'rendering', 'reviewing', 'scheduled', 'published', 'failed', 'archived'
  priority INTEGER DEFAULT 0,
  scheduled_publish_at INTEGER,
  published_at INTEGER,
  youtube_video_id TEXT,
  youtube_url TEXT,
  duration_seconds INTEGER DEFAULT 30,
  resolution_width INTEGER DEFAULT 1080,
  resolution_height INTEGER DEFAULT 1920,
  fps INTEGER DEFAULT 30,
  format TEXT DEFAULT 'mp4',
  codec_video TEXT DEFAULT 'h264',
  codec_audio TEXT DEFAULT 'aac',
  file_size_bytes INTEGER,
  storage_path TEXT,
  thumbnail_path TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Scripts
CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  hook TEXT,
  body TEXT,
  call_to_action TEXT,
  full_text TEXT,
  word_count INTEGER,
  estimated_duration_seconds INTEGER,
  tone TEXT DEFAULT 'engaging',
  language TEXT DEFAULT 'en-US',
  is_approved INTEGER DEFAULT 0,
  approved_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Storyboards
CREATE TABLE IF NOT EXISTS storyboards (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  script_id TEXT NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  scene_order INTEGER NOT NULL,
  scene_type TEXT, -- 'intro', 'content', 'transition', 'outro', 'cta'
  narration TEXT,
  visual_prompt TEXT,
  visual_assets TEXT, -- JSON array of asset paths
  duration_seconds REAL DEFAULT 5,
  transition_type TEXT DEFAULT 'cut', -- 'cut', 'fade', 'slide', 'zoom'
  transition_duration REAL DEFAULT 0.5,
  effects TEXT, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Voice generations
CREATE TABLE IF NOT EXISTS voice_generations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storyboard_id TEXT NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  provider TEXT DEFAULT 'piper', -- 'piper', 'edge-tts', 'coqui'
  voice_id TEXT,
  voice_name TEXT,
  audio_path TEXT,
  duration_seconds REAL,
  sample_rate INTEGER DEFAULT 22050,
  bitrate INTEGER DEFAULT 128000,
  status TEXT DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Visual assets
CREATE TABLE IF NOT EXISTS visual_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storyboard_id TEXT REFERENCES storyboards(id) ON DELETE SET NULL,
  asset_type TEXT, -- 'background', 'character', 'icon', 'text', 'chart', 'animation'
  prompt TEXT,
  file_path TEXT,
  width INTEGER,
  height INTEGER,
  format TEXT,
  file_size_bytes INTEGER,
  generation_provider TEXT, -- 'stable-diffusion', 'dalle', 'midjourney', 'code', 'stock'
  generation_cost REAL DEFAULT 0,
  is_original INTEGER DEFAULT 1,
  license TEXT,
  attribution TEXT,
  created_at INTEGER NOT NULL
);

-- Subtitles
CREATE TABLE IF NOT EXISTS subtitles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storyboard_id TEXT NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  voice_generation_id TEXT REFERENCES voice_generations(id) ON DELETE SET NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  text TEXT NOT NULL,
  style TEXT, -- JSON for styling
  created_at INTEGER NOT NULL
);

-- Background music and SFX
CREATE TABLE IF NOT EXISTS audio_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_type TEXT, -- 'music', 'sfx', 'ambience'
  title TEXT,
  file_path TEXT,
  source_url TEXT,
  license TEXT, -- 'cc0', 'cc-by', 'youtube-audio-library', 'custom'
  attribution TEXT,
  duration_seconds REAL,
  volume_level REAL DEFAULT 0.3,
  start_time REAL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- SEO metadata
CREATE TABLE IF NOT EXISTS seo_metadata (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  tags TEXT, -- JSON array
  hashtags TEXT, -- JSON array
  category_id TEXT DEFAULT '28', -- Science & Technology
  privacy_status TEXT DEFAULT 'private', -- 'private', 'unlisted', 'public'
  publish_at INTEGER,
  made_for_kids INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Quality checks
CREATE TABLE IF NOT EXISTS quality_checks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  check_type TEXT, -- 'duration', 'resolution', 'audio', 'copyright', 'content', 'technical'
  status TEXT DEFAULT 'pending', -- 'pending', 'passed', 'failed', 'warning'
  details TEXT, -- JSON
  checked_at INTEGER,
  created_at INTEGER NOT NULL
);

-- Publishing logs
CREATE TABLE IF NOT EXISTS publishing_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage TEXT, -- 'upload', 'processing', 'published', 'failed'
  status TEXT, -- 'started', 'in_progress', 'completed', 'failed'
  message TEXT,
  youtube_response TEXT, -- JSON
  error_details TEXT,
  retry_attempt INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Analytics
CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  subscribers_gained INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,
  average_view_duration REAL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  click_through_rate REAL DEFAULT 0,
  traffic_sources TEXT, -- JSON
  geography TEXT, -- JSON
  age_gender TEXT, -- JSON
  fetched_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(project_id, date)
);

-- Automation settings
CREATE TABLE IF NOT EXISTS automation_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_enabled INTEGER DEFAULT 0,
  schedule_time TEXT DEFAULT '06:00', -- IST
  timezone TEXT DEFAULT 'Asia/Kolkata',
  max_daily_videos INTEGER DEFAULT 1,
  min_quality_score REAL DEFAULT 0.7,
  auto_publish INTEGER DEFAULT 1,
  notify_on_success INTEGER DEFAULT 1,
  notify_on_failure INTEGER DEFAULT 1,
  notify_on_quota_warning INTEGER DEFAULT 1,
  gemini_api_key_encrypted TEXT,
  piper_voice_model TEXT DEFAULT 'en_US-lessac-medium',
  stable_diffusion_model TEXT,
  youtube_quota_limit INTEGER DEFAULT 10000,
  youtube_quota_used INTEGER DEFAULT 0,
  youtube_quota_reset_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  type TEXT, -- 'info', 'success', 'warning', 'error', 'quota'
  title TEXT NOT NULL,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  read_at INTEGER,
  action_url TEXT,
  created_at INTEGER NOT NULL
);

-- System logs
CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  level TEXT, -- 'debug', 'info', 'warn', 'error', 'critical'
  component TEXT, -- 'api', 'worker', 'renderer', 'uploader', 'scheduler'
  message TEXT NOT NULL,
  context TEXT, -- JSON
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_youtube_tokens_user_id ON youtube_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topics_is_selected ON topics(is_selected);
CREATE INDEX IF NOT EXISTS idx_sources_topic_id ON sources(topic_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_scheduled_publish_at ON projects(scheduled_publish_at);
CREATE INDEX IF NOT EXISTS idx_projects_youtube_video_id ON projects(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_scripts_project_id ON scripts(project_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_project_id ON storyboards(project_id);
CREATE INDEX IF NOT EXISTS idx_voice_generations_project_id ON voice_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_project_id ON visual_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_subtitles_project_id ON subtitles(project_id);
CREATE INDEX IF NOT EXISTS idx_audio_assets_project_id ON audio_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_metadata_project_id ON seo_metadata(project_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_project_id ON quality_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_publishing_logs_project_id ON publishing_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_project_id ON analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);