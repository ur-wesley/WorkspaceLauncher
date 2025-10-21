-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_predefined BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    light_colors TEXT NOT NULL, -- JSON with HSL color values
    dark_colors TEXT NOT NULL,  -- JSON with HSL color values
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default theme (current colors from app.css)
INSERT INTO themes (name, description, is_predefined, is_active, light_colors, dark_colors) VALUES (
    'Default',
    'Classic light and dark theme',
    TRUE,
    TRUE,
    '{"background":"0 0% 100%","foreground":"240 10% 3.9%","card":"0 0% 100%","cardForeground":"240 10% 3.9%","popover":"0 0% 100%","popoverForeground":"240 10% 3.9%","primary":"240 5.9% 10%","primaryForeground":"0 0% 98%","secondary":"240 4.8% 95.9%","secondaryForeground":"240 5.9% 10%","muted":"240 4.8% 95.9%","mutedForeground":"240 3.8% 46.1%","accent":"240 4.8% 95.9%","accentForeground":"240 5.9% 10%","destructive":"0 84.2% 60.2%","destructiveForeground":"0 0% 98%","border":"240 5.9% 90%","input":"240 5.9% 90%","ring":"240 5.9% 10%"}',
    '{"background":"240 10% 3.9%","foreground":"0 0% 98%","card":"240 10% 3.9%","cardForeground":"0 0% 98%","popover":"240 10% 3.9%","popoverForeground":"0 0% 98%","primary":"0 0% 98%","primaryForeground":"240 5.9% 10%","secondary":"240 3.7% 15.9%","secondaryForeground":"0 0% 98%","muted":"240 3.7% 15.9%","mutedForeground":"240 5% 64.9%","accent":"240 3.7% 15.9%","accentForeground":"0 0% 98%","destructive":"0 62.8% 30.6%","destructiveForeground":"0 0% 98%","border":"240 3.7% 15.9%","input":"240 3.7% 15.9%","ring":"240 4.9% 83.9%"}'
);

-- Insert Catppuccin Latte (light) and Frappé (medium dark)
INSERT INTO themes (name, description, is_predefined, is_active, light_colors, dark_colors) VALUES (
    'Catppuccin Latte/Frappé',
    'Warm pastel theme with soothing colors',
    TRUE,
    FALSE,
    '{"background":"220 23% 97%","foreground":"234 16% 35%","card":"220 23% 97%","cardForeground":"234 16% 35%","popover":"220 23% 97%","popoverForeground":"234 16% 35%","primary":"217 92% 59%","primaryForeground":"220 23% 97%","secondary":"220 17% 88%","secondaryForeground":"234 16% 35%","muted":"220 17% 88%","mutedForeground":"233 13% 54%","accent":"218 54% 71%","accentForeground":"234 16% 35%","destructive":"347 87% 44%","destructiveForeground":"220 23% 97%","border":"220 16% 82%","input":"220 16% 82%","ring":"217 92% 59%"}',
    '{"background":"240 21% 15%","foreground":"227 68% 88%","card":"240 21% 15%","cardForeground":"227 68% 88%","popover":"240 21% 15%","popoverForeground":"227 68% 88%","primary":"217 92% 76%","primaryForeground":"240 21% 15%","secondary":"233 12% 27%","secondaryForeground":"227 68% 88%","muted":"233 12% 27%","mutedForeground":"228 39% 66%","accent":"220 57% 77%","accentForeground":"240 21% 15%","destructive":"347 87% 63%","destructiveForeground":"227 68% 88%","border":"237 16% 23%","input":"237 16% 23%","ring":"217 92% 76%"}'
);

-- Insert Catppuccin Macchiato (darker) and Mocha (darkest)
INSERT INTO themes (name, description, is_predefined, is_active, light_colors, dark_colors) VALUES (
    'Catppuccin Macchiato/Mocha',
    'Deep and rich dark color palette',
    TRUE,
    FALSE,
    '{"background":"233 25% 18%","foreground":"227 70% 87%","card":"233 25% 18%","cardForeground":"227 70% 87%","popover":"233 25% 18%","popoverForeground":"227 70% 87%","primary":"220 91% 71%","primaryForeground":"233 25% 18%","secondary":"233 12% 29%","secondaryForeground":"227 70% 87%","muted":"233 12% 29%","mutedForeground":"229 40% 65%","accent":"189 71% 72%","accentForeground":"233 25% 18%","destructive":"355 76% 66%","destructiveForeground":"227 70% 87%","border":"236 18% 26%","input":"236 18% 26%","ring":"220 91% 71%"}',
    '{"background":"240 21% 12%","foreground":"226 64% 88%","card":"240 21% 12%","cardForeground":"226 64% 88%","popover":"240 21% 12%","popoverForeground":"226 64% 88%","primary":"217 92% 76%","primaryForeground":"240 21% 12%","secondary":"240 13% 23%","secondaryForeground":"226 64% 88%","muted":"240 13% 23%","mutedForeground":"227 35% 65%","accent":"189 71% 73%","accentForeground":"240 21% 12%","destructive":"343 81% 75%","destructiveForeground":"226 64% 88%","border":"240 16% 20%","input":"240 16% 20%","ring":"217 92% 76%"}'
);


