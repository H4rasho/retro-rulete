-- Migración para agregar funcionalidad de votación
-- Ejecuta este script si ya tienes las tablas sessions, participants, answers y reactions creadas

-- 1. Crear tabla de votos
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  voted_for_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, voter_id) -- Un participante solo puede votar una vez por sesión
);

-- 2. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_voted_for ON votes(voted_for_id);

-- 3. Habilitar Row Level Security
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS (eliminamos primero si existen)
DROP POLICY IF EXISTS "Permitir lectura de votos" ON votes;
DROP POLICY IF EXISTS "Permitir creación de votos" ON votes;
DROP POLICY IF EXISTS "Permitir actualización de votos" ON votes;
DROP POLICY IF EXISTS "Permitir eliminación de votos" ON votes;

CREATE POLICY "Permitir lectura de votos" ON votes FOR SELECT USING (true);
CREATE POLICY "Permitir creación de votos" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de votos" ON votes FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de votos" ON votes FOR DELETE USING (true);

-- 5. Habilitar Realtime para la tabla votes
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Verificar que se creó correctamente
SELECT 'Migración de votos completada exitosamente' as status;

-- Verificar que Realtime está habilitado
SELECT tablename, '✅ Realtime habilitado' as estado
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename = 'votes';
