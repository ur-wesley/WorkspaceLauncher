# WorkspaceLauncher Landing Page

A modern, responsive landing page for the WorkspaceLauncher project built with Astro.js, Solid.js, and UnoCSS.

## Features

- **Modern Design**: Clean, professional design with smooth animations
- **Responsive**: Fully responsive across all device sizes
- **Performance**: Optimized with Astro's islands architecture
- **Type-Safe**: Built with TypeScript
- **Styling**: Powered by UnoCSS for utility-first CSS

## Tech Stack

- [Astro](https://astro.build) - Web framework for building fast content sites
- [SolidJS](https://www.solidjs.com) - Reactive JavaScript library
- [UnoCSS](https://unocss.dev) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org) - Typed JavaScript

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

The dev server will start at `http://localhost:4321`

## Docker Deployment

You can easily deploy the landing page using Docker:

### Using Docker Compose (Recommended)

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The landing page will be available at `http://localhost:8080`

### Using Docker directly

```bash
# Build the image
docker build -t workspacelauncher-landing .

# Run the container
docker run -d -p 8080:80 --name landing workspacelauncher-landing
```

## Project Structure

```
landing/
├── public/           # Static assets
├── src/
│   ├── assets/       # Images and media
│   ├── components/   # Astro/SolidJS components
│   │   ├── Navigation.astro
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── TechStack.tsx
│   │   ├── Footer.astro
│   │   └── DocsSidebar.astro
│   ├── layouts/      # Astro layouts
│   │   ├── BaseLayout.astro
│   │   └── DocsLayout.astro
│   └── pages/        # Route pages
│       ├── index.astro
│       └── docs/     # Documentation pages
├── Dockerfile        # Docker build configuration
├── docker-compose.yml # Docker compose configuration
├── nginx.conf        # Nginx web server config
├── astro.config.mjs  # Astro configuration
├── uno.config.ts     # UnoCSS configuration
├── package.json
└── README.md
```

## Sections

- **Hero**: Eye-catching header with CTA buttons
- **Features**: Showcase of key application features
- **Tech Stack**: Technologies used in the project
- **Docs**: Quick start guide and documentation
- **Footer**: Links and additional information