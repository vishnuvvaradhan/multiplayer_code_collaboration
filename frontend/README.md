# Frontend - Multiplayer Code Collaboration

This is a [Next.js](https://nextjs.org) project for the multiplayer code collaboration platform.

## Getting Started

First, install dependencies:

```bash
npm install
```

### Environment Setup

Create a `.env.local` file in the `frontend` directory:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your credentials:

#### 1. Linear API Key
```
NEXT_PUBLIC_LINEAR_API_KEY=your_linear_api_key_here
```
Get your API key from: https://linear.app/settings/api

#### 2. GitHub OAuth Credentials
Each developer needs to create their own GitHub OAuth App:

1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Relay (or your app name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**
6. Add to `.env.local`:
   ```
   NEXT_PUBLIC_GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   ```

**Important Notes:**
- The `.env.local` file is gitignored and will not be committed
- Each developer must create their own GitHub OAuth App (Client IDs are per-app)
- The Client ID is safe to expose (it's public in OAuth flows)
- The Client Secret must be kept private and never committed

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── page.tsx      # Main page
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Global styles
│   └── components/       # React components
│       ├── ChatPanel.tsx
│       ├── DiffView.tsx
│       ├── EmptyState.tsx
│       ├── LeftSidebar.tsx
│       ├── LoadingState.tsx
│       ├── PRView.tsx
│       ├── RightPanel.tsx
│       ├── TopBar.tsx
│       ├── messages/     # Message components
│       └── ui/           # UI component library (Radix UI + shadcn)
├── public/               # Static assets
└── ...                   # Configuration files
```

## Features

- **Real-time Collaboration UI**: Interface for collaborative code editing
- **Chat Panel**: Team communication interface
- **Diff View**: Visual comparison of code changes
- **PR Management**: Pull request viewing and management
- **Modern UI**: Built with Radix UI and Tailwind CSS
- **Type Safety**: Full TypeScript support

## Technology Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS 4
- **State Management**: React Hooks
- **Icons**: Lucide React

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)

## Contributing

When making changes to the frontend, please ensure:
1. TypeScript types are properly defined
2. Components are properly tested
3. Code follows the existing style conventions
4. UI remains responsive and accessible

