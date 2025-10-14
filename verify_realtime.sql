-- Script para verificar que Realtime está correctamente configurado
-- Ejecuta este script en el SQL Editor de Supabase después de crear las tablas

-- 1. Verificar que las tablas existen
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('sessions', 'participants', 'answers') THEN '✅ Existe'
    ELSE '❌ No encontrada'
  END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('sessions', 'participants', 'answers')
ORDER BY table_name;

-- 2. Verificar que Realtime está habilitado para las tablas
SELECT 
  schemaname,
  tablename,
  '✅ Realtime habilitado' as estado
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('sessions', 'participants', 'answers')
ORDER BY tablename;

-- 3. Verificar políticas RLS
SELECT 
  tablename,
  policyname,
  '✅ Política activa' as estado
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('sessions', 'participants', 'answers')
ORDER BY tablename, policyname;

-- 4. Verificar índices
SELECT 
  tablename,
  indexname,
  '✅ Índice creado' as estado
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('sessions', 'participants', 'answers')
ORDER BY tablename, indexname;

-- Si todo está correcto, deberías ver:
-- ✅ 3 tablas existentes
-- ✅ 3 tablas con Realtime habilitado
-- ✅ Varias políticas RLS activas
-- ✅ Varios índices creados
