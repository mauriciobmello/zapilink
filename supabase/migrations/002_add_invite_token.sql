-- Migração: Adicionar token de convite único
-- Aplique esta migração após a 001_create_profile_access_tables.sql

ALTER TABLE profile_access
ADD COLUMN IF NOT EXISTS invite_token uuid DEFAULT gen_random_uuid() UNIQUE;

CREATE INDEX IF NOT EXISTS profile_access_invite_token_idx
ON profile_access(invite_token);
