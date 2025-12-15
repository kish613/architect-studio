# Architect Studio

## Overview

Architect Studio is a web application that transforms 2D floorplans into 3D visualizations using AI. Users can upload architectural floorplans (images or PDFs), which are processed through a two-stage AI pipeline: first generating isometric views using Google's Gemini AI, then creating full 3D models via the Meshy API. The application provides project management, real-time processing status, and an interactive 3D viewer.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state, Zustand for client state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **3D Rendering**: React Three Fiber with Three.js for interactive 3D model viewing
- **Animations**: Framer Motion for UI transitions
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx
- **API Pattern**: RESTful endpoints under `/api/*`
- **File Handling**: Multer for multipart uploads (images and PDFs up to 20MB)
- **PDF Processing**: pdftoppm system utility for PDF-to-image conversion

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Three main tables - `users`, `projects`, `floorplanModels`
- **Relationships**: Projects contain multiple floorplan models (one-to-many with cascade delete)
- **Migrations**: Drizzle Kit for schema management (`npm run db:push`)

### AI Integration Pipeline
1. **Isometric Generation**: Google Gemini AI transforms 2D floorplans into isometric 3D visualizations
2. **3D Model Generation**: Meshy API converts isometric images into full 3D models with PBR textures

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI components (layout, home, projects, viewer)
│   │   ├── pages/       # Route pages (Home, Projects, Upload, Viewer)
│   │   ├── lib/         # API client, utilities, stores
│   │   └── hooks/       # Custom React hooks
├── server/           # Express backend
│   ├── routes.ts     # API endpoint definitions
│   ├── storage.ts    # Database operations
│   ├── gemini.ts     # Gemini AI integration
│   └── meshy.ts      # Meshy 3D API integration
├── shared/           # Shared TypeScript types and schema
└── migrations/       # Database migration files
```

## External Dependencies

### AI Services
- **Google Gemini AI**: Used for transforming 2D floorplans into isometric visualizations. Configured via Replit AI Integrations (`AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`)
- **Meshy API**: Converts isometric images to 3D models with PBR materials. Requires `MESHY_API_KEY` environment variable

### Database
- **PostgreSQL**: Primary data store. Connection configured via `DATABASE_URL` environment variable

### System Dependencies
- **pdftoppm**: System utility for converting PDF floorplans to images (from poppler-utils)

### Key NPM Packages
- `@google/genai`: Google Generative AI SDK
- `drizzle-orm` / `drizzle-kit`: Database ORM and migration tooling
- `@tanstack/react-query`: Server state management
- `@react-three/fiber` / `@react-three/drei`: 3D rendering in React
- `multer`: File upload handling
- `p-retry` / `p-limit`: Rate limiting and retry logic for AI API calls