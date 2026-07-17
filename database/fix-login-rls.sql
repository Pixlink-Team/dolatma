-- One-shot fix for production DBs that already applied FORCE RLS.
-- Run against the app database (psql "$DATABASE_URL" -f database/fix-login-rls.sql)
-- or restart the app so schema.sql re-applies equivalent settings.

ALTER TABLE users NO FORCE ROW LEVEL SECURITY;
ALTER TABLE system_settings NO FORCE ROW LEVEL SECURITY;
ALTER TABLE user_campaign_access NO FORCE ROW LEVEL SECURITY;
ALTER TABLE user_audit_events NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_app_bypass ON users;
DROP POLICY IF EXISTS system_settings_app_bypass ON system_settings;
DROP POLICY IF EXISTS user_campaign_access_app_bypass ON user_campaign_access;
DROP POLICY IF EXISTS user_audit_events_app_bypass ON user_audit_events;

DROP POLICY IF EXISTS users_app_access ON users;
CREATE POLICY users_app_access ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS system_settings_app_access ON system_settings;
CREATE POLICY system_settings_app_access ON system_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS user_campaign_access_app_access ON user_campaign_access;
CREATE POLICY user_campaign_access_app_access ON user_campaign_access FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS user_audit_events_app_access ON user_audit_events;
CREATE POLICY user_audit_events_app_access ON user_audit_events FOR ALL USING (true) WITH CHECK (true);
