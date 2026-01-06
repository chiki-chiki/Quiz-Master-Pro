# QuizLive

## Overview

QuizLive is a real-time interactive quiz application designed for live events. It features a participant-facing interface for answering questions, a projector view for displaying questions and live results to an audience, and an admin panel for managing quizzes and controlling game flow. The application uses WebSockets for real-time updates across all connected clients.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth quiz transitions
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend has three main views:
1. **Home** (`/`) - Participant login and quiz answering interface
2. **Projector** (`/projector`) - Large-screen display for showing questions and live results
3. **Admin** (`/admin`) - Quiz management and game control panel

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Real-time Communication**: WebSocket server (ws library) mounted at `/ws`
- **Session Management**: express-session with MemoryStore
- **API Pattern**: REST endpoints under `/api/*`

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)

Key database tables:
- `users` - Participants with name, admin flag, and score
- `quizzes` - Quiz questions with 4 options (A-D) and correct answer
- `responses` - User answers linked to quizzes
- `appState` - Single-row table tracking current quiz and reveal state

### Real-time Updates
WebSocket events broadcast state changes to all clients:
- `STATE_UPDATE` - Game state changes (current quiz, results revealed)
- `QUIZ_UPDATE` - Quiz list modifications
- `RESPONSE_UPDATE` - New responses submitted
- `USER_JOIN` - New participant joined
- `SCORE_UPDATE` - Leaderboard changes

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Database schema, Zod validation schemas, and TypeScript types
- `routes.ts` - API route definitions with type-safe request/response schemas

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle Kit for schema migrations (`npm run db:push`)

### UI Component Libraries
- Radix UI primitives (dialogs, menus, forms, etc.)
- shadcn/ui pre-configured components in `client/src/components/ui/`

### Key Runtime Dependencies
- `express` - HTTP server
- `ws` - WebSocket server
- `drizzle-orm` / `pg` - Database access
- `express-session` / `memorystore` - Session handling
- `zod` - Runtime validation
- `@tanstack/react-query` - Data fetching and caching
- `framer-motion` - Animations

### Fonts
Google Fonts loaded via CDN:
- Outfit (display headings)
- Space Grotesk (body text)
- JetBrains Mono (monospace)