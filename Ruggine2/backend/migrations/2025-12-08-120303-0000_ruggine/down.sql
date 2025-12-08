-- drop index (se esiste)
DROP INDEX IF EXISTS chat_components_one_admin_per_chat;

-- drop tables (IF EXISTS per evitare errori se già rimosse)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS invites CASCADE;
DROP TABLE IF EXISTS chat_components CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS users CASCADE;