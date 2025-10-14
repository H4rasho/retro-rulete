# 🎡 Ruleta de Retrospectiva Scrum

Una aplicación interactiva de Next.js para facilitar retrospectivas de Scrum mediante una ruleta animada con preguntas de reflexión para equipos ágiles.

## ✨ Características

- 🎨 **Diseño moderno** - UI construida con shadcn/ui y Tailwind CSS
- 🎡 **Ruleta animada** - Animación suave con 18 preguntas de retrospectiva
- 📝 **Banco de preguntas** - Preguntas clásicas de retrospectiva Scrum
- 📊 **Historial** - Seguimiento de las últimas 5 preguntas seleccionadas
- 📱 **Responsivo** - Funciona perfectamente en móvil, tablet y desktop
- ⚡ **Rendimiento** - Optimizado con Next.js 15 y React Server Components

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

### Instalación

1. Clona el repositorio
2. Instala las dependencias:

```bash
npm install
```

3. Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## 🛠️ Stack Tecnológico

- **Framework**: [Next.js 15](https://nextjs.org/)
- **UI**: [shadcn/ui](https://ui.shadcn.com/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Fuentes**: [Geist Font Family](https://vercel.com/font)

## 📦 Estructura del Proyecto

```
scrum-retro-wheel/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Layout principal
│   │   ├── page.tsx         # Página de inicio
│   │   └── globals.css      # Estilos globales
│   ├── components/
│   │   ├── ui/              # Componentes shadcn/ui
│   │   └── RetroWheel.tsx   # Componente de la ruleta
│   └── lib/
│       └── utils.ts         # Utilidades
├── public/                  # Archivos estáticos
└── README.md               # Este archivo
```

## 🎮 Cómo Usar

1. Haz clic en el botón **"Girar la Ruleta"**
2. Espera a que la ruleta se detenga (aproximadamente 4 segundos)
3. La pregunta seleccionada aparecerá destacada debajo de la ruleta
4. Discute la pregunta con tu equipo
5. El historial muestra las últimas 5 preguntas para referencia
6. Usa el botón **"Reiniciar"** para limpiar el historial y empezar de nuevo

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
