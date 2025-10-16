-- Migración para agregar sistema de Corazones Coleccionables
-- Ejecuta este script si ya tienes las tablas existentes

-- 1. Crear tabla de corazones coleccionados
CREATE TABLE IF NOT EXISTS collected_hearts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  hearts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, participant_id) -- Un registro por participante por sesión
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_collected_hearts_session ON collected_hearts(session_id);
CREATE INDEX IF NOT EXISTS idx_collected_hearts_participant ON collected_hearts(participant_id);

-- 3. Habilitar Row Level Security
ALTER TABLE collected_hearts ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS
DROP POLICY IF EXISTS "Permitir lectura de corazones" ON collected_hearts;
DROP POLICY IF EXISTS "Permitir creación de corazones" ON collected_hearts;
DROP POLICY IF EXISTS "Permitir actualización de corazones" ON collected_hearts;

CREATE POLICY "Permitir lectura de corazones" ON collected_hearts FOR SELECT USING (true);
CREATE POLICY "Permitir creación de corazones" ON collected_hearts FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de corazones" ON collected_hearts FOR UPDATE USING (true);

-- 5. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE collected_hearts;

-- Verificar
SELECT 'Migración de corazones completada exitosamente' as status;

SELECT tablename, '✅ Realtime habilitado' as estado
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename = 'collected_hearts';
