-- ZAPILINK — Delegação de Acesso e Administração de Páginas
-- Execute este script no SQL Editor do Supabase (Dashboard > SQL Editor)

-- 1. Tabela de delegações de acesso
CREATE TABLE IF NOT EXISTS profile_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grantee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  invited_email varchar(255) NOT NULL,
  invited_at timestamp NOT NULL DEFAULT now(),
  accepted_at timestamp,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  invite_token uuid DEFAULT gen_random_uuid() UNIQUE,
  UNIQUE(profile_id, grantee_user_id)
);

-- 2. Tabela de permissões granulares
CREATE TABLE IF NOT EXISTS profile_access_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_access_id uuid NOT NULL REFERENCES profile_access(id) ON DELETE CASCADE,
  permission varchar(100) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(profile_access_id, permission)
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS profile_access_grantee_idx ON profile_access(grantee_user_id);
CREATE INDEX IF NOT EXISTS profile_access_profile_idx ON profile_access(profile_id);
CREATE INDEX IF NOT EXISTS profile_access_owner_idx ON profile_access(owner_user_id);
CREATE INDEX IF NOT EXISTS profile_access_status_idx ON profile_access(status);
CREATE INDEX IF NOT EXISTS profile_access_invite_token_idx ON profile_access(invite_token);
CREATE INDEX IF NOT EXISTS profile_access_permissions_access_idx ON profile_access_permissions(profile_access_id);

-- 4. Atualização automática de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS update_profile_access_updated_at ON profile_access;
CREATE TRIGGER update_profile_access_updated_at
    BEFORE UPDATE ON profile_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS para profile_access
ALTER TABLE profile_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_access_owner_select ON profile_access;
CREATE POLICY profile_access_owner_select ON profile_access FOR SELECT
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS profile_access_owner_insert ON profile_access;
CREATE POLICY profile_access_owner_insert ON profile_access FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS profile_access_owner_update ON profile_access;
CREATE POLICY profile_access_owner_update ON profile_access FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS profile_access_owner_delete ON profile_access;
CREATE POLICY profile_access_owner_delete ON profile_access FOR DELETE
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS profile_access_grantee_select ON profile_access;
CREATE POLICY profile_access_grantee_select ON profile_access FOR SELECT
  USING (grantee_user_id = auth.uid());

-- 6. RLS para profile_access_permissions
ALTER TABLE profile_access_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_access_permissions_owner_select ON profile_access_permissions;
CREATE POLICY profile_access_permissions_owner_select ON profile_access_permissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profile_access pa
    WHERE pa.id = profile_access_permissions.profile_access_id
    AND pa.owner_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS profile_access_permissions_owner_insert ON profile_access_permissions;
CREATE POLICY profile_access_permissions_owner_insert ON profile_access_permissions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profile_access pa
    WHERE pa.id = profile_access_permissions.profile_access_id
    AND pa.owner_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS profile_access_permissions_owner_update ON profile_access_permissions;
CREATE POLICY profile_access_permissions_owner_update ON profile_access_permissions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profile_access pa
    WHERE pa.id = profile_access_permissions.profile_access_id
    AND pa.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profile_access pa
    WHERE pa.id = profile_access_permissions.profile_access_id
    AND pa.owner_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS profile_access_permissions_owner_delete ON profile_access_permissions;
CREATE POLICY profile_access_permissions_owner_delete ON profile_access_permissions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profile_access pa
    WHERE pa.id = profile_access_permissions.profile_access_id
    AND pa.owner_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS profile_access_permissions_grantee_select ON profile_access_permissions;
CREATE POLICY profile_access_permissions_grantee_select ON profile_access_permissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profile_access pa
    WHERE pa.id = profile_access_permissions.profile_access_id
    AND pa.grantee_user_id = auth.uid()
  ));
