-- Schema para Ruleta de Retrospectiva Scrum con Colaboración en Tiempo Real

-- Tabla de Sesiones
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  moderator_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de Participantes
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_moderator BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, name)
);

-- Tabla de Respuestas
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Reacciones (corazones)
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID REFERENCES answers(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(answer_id, participant_id) -- Un participante solo puede dar un corazón por respuesta
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_sessions_code ON sessions(code);
CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_answers_session ON answers(session_id);
CREATE INDEX idx_answers_participant ON answers(participant_id);
CREATE INDEX idx_reactions_answer ON reactions(answer_id);
CREATE INDEX idx_reactions_participant ON reactions(participant_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Permitir lectura pública (para simplificar, puedes ajustar según necesites)
CREATE POLICY "Permitir lectura de sesiones" ON sessions FOR SELECT USING (true);
CREATE POLICY "Permitir creación de sesiones" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de sesiones" ON sessions FOR UPDATE USING (true);

CREATE POLICY "Permitir lectura de participantes" ON participants FOR SELECT USING (true);
CREATE POLICY "Permitir creación de participantes" ON participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir lectura de respuestas" ON answers FOR SELECT USING (true);
CREATE POLICY "Permitir creación de respuestas" ON answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de respuestas" ON answers FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de respuestas" ON answers FOR DELETE USING (true);

CREATE POLICY "Permitir lectura de reacciones" ON reactions FOR SELECT USING (true);
CREATE POLICY "Permitir creación de reacciones" ON reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir eliminación de reacciones" ON reactions FOR DELETE USING (true);

-- Función para generar código de sesión único
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  characters VARCHAR(32) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(characters, floor(random() * length(characters) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar el timestamp de finalización
CREATE OR REPLACE FUNCTION update_finished_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    NEW.finished_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar finished_at automáticamente
CREATE TRIGGER set_finished_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_finished_at();

-- ============================================
-- HABILITAR REALTIME (MUY IMPORTANTE)
-- ============================================
-- Esto permite la sincronización en tiempo real de las tablas

-- Habilitar publicación de cambios para Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;

-- Nota: Si el comando anterior falla, intenta con:
-- ALTER publication supabase_realtime SET (publish = 'insert, update, delete');

-- Insertar datos de ejemplo (opcional, puedes comentar o eliminar)
-- INSERT INTO sessions (code, name, moderator_name) 
-- VALUES (generate_session_code(), 'Sesión de Prueba', 'Moderador');
