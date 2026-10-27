-- Sonnet 5.5 blir standardmodell for KI. Superadmin kan fortsatt velge Haiku under Innstillinger → KI.
UPDATE ai_settings SET model = 'claude-sonnet-5-5', updated_at = now() WHERE model = 'claude-haiku-5-5';
