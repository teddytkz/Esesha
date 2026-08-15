# Esesha Frontend

React + TypeScript frontend for Esesha SSH/SFTP Manager, built with Vite and Wails.

## Tech Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Build tool:** Vite 5
- **Desktop integration:** Wails v2
- **Icons:** Lucide Icons (`lucide-react`)
- **Styling:** CSS Modules + CSS custom properties
- **Design system:** Professional Monochrome palette (see `docs/DESIGN-SYSTEM.md`)

## Project Structure

```
frontend/
├── src/
│   ├── components/        # React components (*.tsx + *.module.css pairs)
│   │   ├── App.tsx        # Root component
│   │   ├── FileExplorer.tsx
│   │   ├── Terminal.tsx
│   │   └── ...
│   ├── styles/
│   │   └── global.css     # Design tokens, global styles
│   ├── types/             # TypeScript type definitions
│   └── main.tsx           # React entry point
├── wailsjs/               # Generated Wails bindings (do not edit manually)
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
└── package.json
```

## Development

**Install dependencies:**

```bash
cd frontend
npm install
```

**Run dev server (Wails handles this automatically):**

```bash
# From project root
wails dev
```

**Build for production:**

```bash
# From project root
wails build
```

## Architecture

- **Components use CSS Modules** — each component has a paired `.module.css` file
- **Design tokens in `global.css`** — colors, spacing, typography defined as CSS custom properties
- **Wails bindings in `wailsjs/`** — generated from Go backend; provides frontend access to Go functions
- **No state management library** — uses React hooks (`useState`, `useEffect`) + local state

## Styling Guidelines

- Use design tokens from `src/styles/global.css` (never hardcode colors)
- Follow naming convention: `ComponentName.tsx` + `ComponentName.module.css`
- See `docs/DESIGN-SYSTEM.md` for color palette, typography, spacing

## Wails Integration

Frontend communicates with Go backend via Wails runtime:

```typescript
import { ConnectSSH } from '../wailsjs/go/main/App';

// Call Go backend function
await ConnectSSH(connectionId);
```

Bindings are auto-generated when you run `wails dev` or `wails build`.

## Notes

- Do not edit files in `wailsjs/` — they are auto-generated
- TypeScript references in `vite-env.d.ts` enable Vite type support
- Build output goes to `build/bin/` (configured in `wails.json`)
