-- Add themes table for customizable color themes
CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_predefined INTEGER NOT NULL DEFAULT 0 CHECK (is_predefined IN (0, 1)),
    is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
    light_colors TEXT NOT NULL,
    dark_colors TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_themes_is_active ON themes(is_active);
CREATE INDEX IF NOT EXISTS idx_themes_is_predefined ON themes(is_predefined);

INSERT INTO themes (name, description, is_predefined, is_active, light_colors, dark_colors) VALUES
('Default', 'Clean and modern default theme', 1, 0, '{"primary":"#3b82f6","secondary":"#8b5cf6","accent":"#06b6d4","background":"#ffffff","surface":"#f8fafc","text":"#1e293b","textSecondary":"#64748b","border":"#e2e8f0","error":"#ef4444","warning":"#f59e0b","success":"#10b981","info":"#3b82f6"}', '{"primary":"#60a5fa","secondary":"#a78bfa","accent":"#22d3ee","background":"#0f172a","surface":"#1e293b","text":"#f1f5f9","textSecondary":"#94a3b8","border":"#334155","error":"#f87171","warning":"#fbbf24","success":"#34d399","info":"#60a5fa"}'),
('Ocean Blue', 'Calming ocean-inspired theme', 1, 0, '{"primary":"#0ea5e9","secondary":"#06b6d4","accent":"#14b8a6","background":"#ffffff","surface":"#f0f9ff","text":"#164e63","textSecondary":"#155e75","border":"#bae6fd","error":"#dc2626","warning":"#f59e0b","success":"#059669","info":"#0284c7"}', '{"primary":"#38bdf8","secondary":"#22d3ee","accent":"#2dd4bf","background":"#0c4a6e","surface":"#075985","text":"#e0f2fe","textSecondary":"#7dd3fc","border":"#0369a1","error":"#ef4444","warning":"#fbbf24","success":"#10b981","info":"#38bdf8"}'),
('Forest Green', 'Fresh and natural forest theme', 1, 0, '{"primary":"#22c55e","secondary":"#84cc16","accent":"#eab308","background":"#ffffff","surface":"#f0fdf4","text":"#14532d","textSecondary":"#166534","border":"#bbf7d0","error":"#dc2626","warning":"#f59e0b","success":"#16a34a","info":"#3b82f6"}', '{"primary":"#4ade80","secondary":"#a3e635","accent":"#facc15","background":"#14532d","surface":"#166534","text":"#f0fdf4","textSecondary":"#86efac","border":"#15803d","error":"#ef4444","warning":"#fbbf24","success":"#22c55e","info":"#60a5fa"}'),
('Sunset Purple', 'Warm and vibrant sunset theme', 1, 0, '{"primary":"#a855f7","secondary":"#ec4899","accent":"#f97316","background":"#ffffff","surface":"#faf5ff","text":"#581c87","textSecondary":"#7e22ce","border":"#e9d5ff","error":"#dc2626","warning":"#f59e0b","success":"#10b981","info":"#3b82f6"}', '{"primary":"#c084fc","secondary":"#f472b6","accent":"#fb923c","background":"#581c87","surface":"#6b21a8","text":"#faf5ff","textSecondary":"#d8b4fe","border":"#7e22ce","error":"#ef4444","warning":"#fbbf24","success":"#34d399","info":"#60a5fa"}'),
('Monochrome', 'Classic black and white theme', 1, 0, '{"primary":"#18181b","secondary":"#52525b","accent":"#a1a1aa","background":"#ffffff","surface":"#fafafa","text":"#09090b","textSecondary":"#71717a","border":"#e4e4e7","error":"#dc2626","warning":"#f59e0b","success":"#10b981","info":"#3b82f6"}', '{"primary":"#e4e4e7","secondary":"#a1a1aa","accent":"#52525b","background":"#09090b","surface":"#18181b","text":"#fafafa","textSecondary":"#d4d4d8","border":"#3f3f46","error":"#ef4444","warning":"#fbbf24","success":"#34d399","info":"#60a5fa"}');
