# 🚀 Configuración de Supabase para Ruleta Retrospectiva

Esta guía te ayudará a configurar Supabase para habilitar la colaboración en tiempo real.

## 📋 Requisitos Previos

- Cuenta de Supabase (gratuita): [https://supabase.com](https://supabase.com)
- Node.js 18.17 o superior

## 🔧 Paso 1: Instalar Dependencias

```bash
npm install @supabase/supabase-js
```

## 🗄️ Paso 2: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Espera a que el proyecto se inicialice (puede tomar unos minutos)

## 🔑 Paso 3: Obtener Credenciales

1. En tu proyecto de Supabase, ve a **Settings** > **API**
2. Copia las siguientes credenciales:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon/public key** (NEXT_PUBLIC_SUPABASE_ANON_KEY)

## 📝 Paso 4: Configurar Variables de Entorno

1. Crea un archivo `.env.local` en la raíz del proyecto:

```bash
cp env.example .env.local
```

2. Edita `.env.local` y agrega tus credenciales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

## 🗃️ Paso 5: Crear Tablas en Supabase

1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Crea un nuevo query
3. Copia y pega el contenido completo del archivo `supabase_schema.sql`
4. Ejecuta el script (botón "Run" o Ctrl/Cmd + Enter)

Esto creará:
- ✅ Tabla `sessions` (sesiones de retrospectiva)
- ✅ Tabla `participants` (participantes de cada sesión)
- ✅ Tabla `answers` (respuestas de los participantes)
- ✅ Índices para mejor rendimiento
- ✅ Políticas de seguridad (Row Level Security)
- ✅ Funciones auxiliares

## 🔄 Paso 6: Habilitar Realtime

### Método 1: Mediante SQL (Recomendado - Ya incluido en el script)

El script `supabase_schema.sql` ya incluye los comandos para habilitar Realtime automáticamente:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
```

Si ejecutaste el script completo, Realtime ya debería estar habilitado. ✅

### Método 2: Mediante la UI de Supabase

Si prefieres verificar o habilitar manualmente:

1. Ve a **Database** > **Replication** en el panel de Supabase
2. Busca las siguientes tablas:
   - `sessions`
   - `participants`
   - `answers`
3. Activa el toggle de "Realtime" para cada tabla

**Nota:** Si ves "Coming Soon" o el toggle no está disponible:
- Es posible que tu proyecto use una versión antigua de Supabase
- **Solución:** Los comandos SQL del Paso 5 ya habilitan Realtime automáticamente
- No te preocupes por la UI, si el SQL se ejecutó correctamente, funcionará

### Verificar que Realtime esté habilitado

Para verificar que Realtime está correctamente configurado, ejecuta este query en SQL Editor:

```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

Deberías ver las tablas `sessions`, `participants` y `answers` en los resultados.

## ✅ Paso 7: Verificar Configuración

1. Reinicia tu servidor de desarrollo:

```bash
npm run dev
```

2. Abre [http://localhost:3000](http://localhost:3000)
3. Intenta crear una sesión
4. Si todo funciona correctamente, verás el código de sesión

## 🎮 Cómo Usar la Aplicación

### Como Moderador

1. **Crear Sesión**
   - Ve a la página principal
   - Ingresa el nombre de la sesión y tu nombre
   - Haz clic en "Crear Sesión"
   - Comparte el código de 6 caracteres con tu equipo

2. **Durante la Sesión**
   - Gira tu ruleta y responde preguntas como cualquier participante
   - Ve el contador de participantes en tiempo real
   - Haz clic en "Finalizar Sesión" cuando todos terminen

3. **Ver Resultados**
   - Automáticamente serás redirigido a la página de resultados
   - Ve todas las respuestas de todos los participantes
   - Exporta los resultados a un archivo de texto

### Como Participante

1. **Unirse a Sesión**
   - Ve a la página principal
   - Ingresa el código de sesión que te compartió el moderador
   - Ingresa tu nombre
   - Haz clic en "Unirse a Sesión"

2. **Durante la Sesión**
   - Gira tu ruleta individual
   - Responde las preguntas que salgan
   - Tus respuestas se guardan automáticamente
   - Ve el historial de tus respuestas en el panel lateral

3. **Finalización**
   - Cuando el moderador finalice la sesión, serás notificado
   - Puedes salir de la sesión en cualquier momento

## 🔒 Seguridad

Las políticas RLS (Row Level Security) están configuradas para:
- ✅ Cualquiera puede leer sesiones activas
- ✅ Cualquiera puede crear sesiones y participantes
- ✅ Solo los participantes pueden ver respuestas de su sesión
- ⚠️ Para producción, considera implementar autenticación adicional

## 🐛 Solución de Problemas

### Error: "Supabase credentials not found"
- Verifica que el archivo `.env.local` exista
- Verifica que las variables estén correctamente configuradas
- Reinicia el servidor de desarrollo

### Error: "Cannot read properties of null"
- Verifica que las tablas estén creadas en Supabase
- Verifica que Realtime esté habilitado para todas las tablas
- Revisa la consola del navegador para más detalles

### Las actualizaciones en tiempo real no funcionan
- Verifica que Realtime esté habilitado en la configuración de Supabase
- Revisa la pestaña de Network en DevTools para ver si hay conexiones WebSocket
- Intenta refrescar la página

### No puedo unirme a una sesión
- Verifica que el código sea correcto (6 caracteres)
- Verifica que la sesión no haya sido finalizada
- Verifica que no exista otro participante con el mismo nombre

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 💡 Mejoras Futuras

- [ ] Autenticación con email/password
- [ ] Salas privadas con contraseña
- [ ] Exportar a PDF
- [ ] Categorización de respuestas
- [ ] Votación de respuestas
- [ ] Modo anónimo
- [ ] Timer para la sesión
- [ ] Notificaciones push

## 🤝 Soporte

Si encuentras algún problema, revisa:
1. Los logs del servidor (terminal donde corre `npm run dev`)
2. La consola del navegador (F12 > Console)
3. La pestaña Network para ver las peticiones a Supabase
