# 🎡 Ruleta de Retrospectiva Scrum

Una aplicación interactiva de Next.js para facilitar retrospectivas de Scrum mediante una ruleta animada con preguntas de reflexión para equipos ágiles. **¡Ahora con colaboración en tiempo real!**

## ✨ Características

- 🎨 **Diseño moderno** - UI construida con shadcn/ui y Tailwind CSS
- 🎡 **Ruleta animada** - Animación suave con 18 preguntas de retrospectiva
- 👥 **Colaboración en tiempo real** - Múltiples participantes trabajando simultáneamente
- 🔄 **Sincronización automática** - Powered by Supabase Realtime
- 🎯 **Ruletas individuales** - Cada participante tiene su propia ruleta
- 👨‍💼 **Vista de moderador** - El moderador ve todas las respuestas en tiempo real
- 📝 **Banco de preguntas** - Preguntas clásicas de retrospectiva Scrum
- 📊 **Historial** - Cada participante ve sus propias respuestas guardadas
- 📱 **Responsivo** - Funciona perfectamente en móvil, tablet y desktop
- ⚡ **Rendimiento** - Optimizado con Next.js 15 y React Server Components
- 💾 **Exportación** - Exporta todos los resultados a archivo de texto

## 🎯 Preguntas Incluidas

La ruleta incluye 18 preguntas de retrospectiva, como:

- ¿Qué salió bien en este sprint?
- ¿Qué podemos mejorar?
- ¿Qué obstáculos enfrentamos?
- ¿Qué aprendimos?
- Y muchas más...

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 18.17 o superior
- npm, yarn, pnpm o bun
- Cuenta de Supabase (gratuita)

### Instalación

1. Clona el repositorio

2. Instala las dependencias:

```bash
npm install
```

3. **Configura Supabase** (Ver [SETUP_SUPABASE.md](SETUP_SUPABASE.md) para instrucciones detalladas):
   - Crea un proyecto en [Supabase](https://supabase.com)
   - Ejecuta el script SQL de `supabase_schema.sql` en tu proyecto
   - Copia `env.example` a `.env.local` y agrega tus credenciales

4. Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## 🛠️ Stack Tecnológico

- **Framework**: [Next.js 15](https://nextjs.org/)
- **UI**: [shadcn/ui](https://ui.shadcn.com/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime)
- **Fuentes**: [Geist Font Family](https://vercel.com/font)

## 🎮 Cómo Usar

### Crear una Sesión (Moderador)

1. En la página principal, haz clic en **"Crear Nueva Sesión"**
2. Ingresa un nombre para la retrospectiva (ej: "Sprint 15 - Retro")
3. Ingresa tu nombre
4. Haz clic en **"Crear Sesión"**
5. Comparte el **código de 6 caracteres** con tu equipo

### Unirse a una Sesión (Participante)

1. En la página principal, haz clic en **"Unirse a Sesión"**
2. Ingresa el código compartido por el moderador
3. Ingresa tu nombre
4. Haz clic en **"Unirse a Sesión"**

### Durante la Retrospectiva

- **Gira tu ruleta**: Haz clic en el botón para girar y obtener una pregunta aleatoria
- **Responde**: Escribe tu respuesta en el campo de texto
- **Guarda**: Las respuestas se sincronizan automáticamente
- **Continúa**: Puedes girar la ruleta cuantas veces quieras

### Finalizar Sesión (Solo Moderador)

1. Haz clic en **"Finalizar Sesión"**
2. Automáticamente serás redirigido a la vista de resultados
3. Ve todas las respuestas de todos los participantes
4. Exporta los resultados a un archivo de texto

## 📦 Estructura del Proyecto

```
scrum-retro-wheel/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Layout principal
│   │   ├── page.tsx                   # Página de lobby/inicio
│   │   ├── session/[code]/page.tsx    # Página de sesión activa
│   │   ├── moderator/[code]/page.tsx  # Vista de resultados del moderador
│   │   └── globals.css                # Estilos globales
│   ├── components/
│   │   ├── ui/                        # Componentes shadcn/ui
│   │   ├── SessionLobby.tsx           # Lobby para crear/unirse
│   │   ├── RetroWheel.tsx             # Ruleta original (standalone)
│   │   └── RetroWheelCollaborative.tsx # Ruleta colaborativa
│   ├── lib/
│   │   ├── utils.ts                   # Utilidades
│   │   └── supabase.ts                # Cliente y funciones de Supabase
│   └── types/
│       └── database.ts                # Tipos TypeScript para la DB
├── public/                            # Archivos estáticos
├── supabase_schema.sql                # Schema de la base de datos
├── SETUP_SUPABASE.md                  # Guía de configuración
├── env.example                        # Ejemplo de variables de entorno
└── README.md                          # Este archivo
```

## 🎨 Personalización

### Agregar más preguntas

Edita el array `RETRO_QUESTIONS` en `src/components/RetroWheel.tsx`:

```typescript
const RETRO_QUESTIONS = [
  "Tu nueva pregunta aquí",
  // ... más preguntas
];
```

### Cambiar colores

Modifica el array `COLORS` en el mismo archivo para personalizar los colores de los segmentos.

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## 🚀 Deploy

### Vercel (Recomendado)

La forma más fácil de deployar es usar [Vercel](https://vercel.com/new):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Otras plataformas

También puedes deployar en cualquier plataforma que soporte Next.js:

- Netlify
- AWS Amplify
- Docker
- Servidor propio con Node.js

## 🤝 Contribuir

Las contribuciones son bienvenidas. Si tienes ideas para nuevas preguntas o mejoras, no dudes en abrir un issue o pull request.

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/) por el framework
- [shadcn/ui](https://ui.shadcn.com/) por los componentes UI
- [Vercel](https://vercel.com/) por el hosting y las fuentes
