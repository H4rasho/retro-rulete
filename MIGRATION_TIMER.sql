-- Migración para agregar funcionalidad de Timer
-- Ejecuta este script si ya tienes la tabla sessions creada

-- 1. Agregar columnas de timer a la tabla sessions
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS timer_is_active BOOLEAN DEFAULT false;

-- 2. Agregar comentarios
COMMENT ON COLUMN sessions.timer_duration IS 'Duración del timer en segundos (0 = sin timer)';
COMMENT ON COLUMN sessions.timer_started_at IS 'Timestamp de cuándo se inició el timer';
COMMENT ON COLUMN sessions.timer_is_active IS 'Indica si el timer está actualmente corriendo';

-- Verificar que se agregaron las columnas
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND column_name IN ('timer_duration', 'timer_started_at', 'timer_is_active')
ORDER BY column_name;

SELECT 'Migración de timer completada exitosamente' as status;
