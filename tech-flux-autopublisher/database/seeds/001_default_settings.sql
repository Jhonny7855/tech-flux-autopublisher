-- Default automation settings seed
-- Run after initial schema

INSERT OR IGNORE INTO automation_settings (
  id,
  user_id,
  is_enabled,
  schedule_time,
  timezone,
  max_daily_videos,
  min_quality_score,
  auto_publish,
  notify_on_success,
  notify_on_failure,
  notify_on_quota_warning,
  piper_voice_model,
  youtube_quota_limit,
  youtube_quota_used,
  created_at,
  updated_at
) VALUES (
  'default-settings',
  'default-user',
  0,
  '06:00',
  'Asia/Kolkata',
  1,
  0.7,
  1,
  1,
  1,
  1,
  'en_US-lessac-medium',
  10000,
  0,
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);

-- Sample trending topics for testing
INSERT OR IGNORE INTO topics (
  id,
  title,
  description,
  category,
  source_type,
  trending_score,
  relevance_score,
  is_selected,
  created_at,
  updated_at
) VALUES
  ('topic-1', 'AI Breakthrough: New Model Beats Human Experts', 'Latest AI model achieves superhuman performance on complex reasoning tasks', 'AI & ML', 'trending', 95, 90, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('topic-2', 'Quantum Computing Milestone: 1000 Qubits Achieved', 'Major breakthrough in quantum hardware brings practical quantum computing closer', 'Quantum Computing', 'trending', 88, 85, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('topic-3', 'SpaceX Starship Successful Orbital Flight', 'Starship completes full orbital flight test, paving way for Mars missions', 'Space Tech', 'trending', 92, 88, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('topic-4', 'Brain-Computer Interface Restores Movement', 'Paralyzed patient controls robotic arm with thoughts using new BCI', 'Neurotech', 'trending', 85, 92, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('topic-5', 'Fusion Energy Net Positive Reaction Achieved', 'Historic fusion experiment produces more energy than consumed', 'Energy Tech', 'trending', 90, 87, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);