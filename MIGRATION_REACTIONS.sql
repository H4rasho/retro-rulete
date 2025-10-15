-- Migración para agregar funcionalidad de reacciones
-- Ejecuta este script si ya tienes las tablas sessions, participants y answers creadas

-- 1. Crear tabla de reacciones
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID REFERENCES answers(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(answer_id, participant_id) -- Un participante solo puede dar un corazón por respuesta
);

-- 2. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_reactions_answer ON reactions(answer_id);
CREATE INDEX IF NOT EXISTS idx_reactions_participant ON reactions(participant_id);

-- 3. Habilitar Row Level Security
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Permitir lectura de reacciones" ON reactions FOR SELECT USING (true);
CREATE POLICY "Permitir creación de reacciones" ON reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir eliminación de reacciones" ON reactions FOR DELETE USING (true);

-- 5. Habilitar Realtime para la tabla reactions
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;

-- Verificar que se creó correctamente
SELECT 'Migración completada exitosamente' as status;

-- Verificar que Realtime está habilitado
SELECT tablename, '✅ Realtime habilitado' as estado
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename = 'reactions';
