CREATE TABLE IF NOT EXISTS history_entries (
    id TEXT PRIMARY KEY,
    entry_type TEXT NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NULL,
    source_lang TEXT NULL,
    target_lang TEXT NULL,
    sign_language TEXT NULL,
    cultural_note TEXT NULL,
    formality_level TEXT NULL,
    regional_variant TEXT NULL,
    sentiment_json TEXT NULL,
    metadata_json TEXT NULL,
    extra_json TEXT NULL,
    is_phrasebook INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_entries_type_created_at
    ON history_entries (entry_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_history_entries_phrasebook_created_at
    ON history_entries (is_phrasebook, created_at DESC);
