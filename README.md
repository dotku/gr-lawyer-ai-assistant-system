# GR Lawyer Assistant System

An AI-powered legal assistance platform for efficient case management and document processing.

## Features

- **Internationalization Ready**: Built with next-intl for easy multi-language support (currently English only)
- **Authentication**: Secure user authentication with NextAuth.js and credential-based login
- **Database**: PostgreSQL database with Prisma ORM for managing:
  - Users and authentication
  - Legal cases and case management
  - Client information
  - Documents and file management
  - Tasks and to-dos
  - Case notes
  - AI conversation history
- **Responsive Design**: Mobile-first responsive UI built with Tailwind CSS
- **AI Integration**: Ready for OpenAI integration for legal assistance features

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Internationalization**: next-intl
- **AI**: OpenAI API (configured)
- **Backend**: Supabase (optional)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the following variables:
     ```env
     DATABASE_URL="postgresql://user:password@localhost:5432/lawyer_assistant"
     NEXTAUTH_URL="http://localhost:3000"
     NEXTAUTH_SECRET="your-secret-key-here"
     OPENAI_API_KEY="your-openai-api-key"
     ```

4. Set up the database:
   ```bash
   # Push the database schema
   npx prisma db push

   # Or create and run migrations
   npx prisma migrate dev --name init
   ```

5. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── [locale]/          # Internationalized pages
│   │   │   ├── auth/          # Authentication pages (login, register)
│   │   │   ├── layout.tsx     # Locale-specific layout
│   │   │   └── page.tsx       # Home page
│   │   ├── api/               # API routes
│   │   │   └── auth/          # Authentication API endpoints
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── Header.tsx         # Navigation header
│   │   ├── LanguageSwitcher.tsx
│   │   └── Providers.tsx      # Context providers
│   ├── lib/                   # Utility libraries
│   │   ├── prisma.ts          # Prisma client
│   │   └── auth.ts            # NextAuth configuration
│   ├── generated/             # Generated Prisma client
│   ├── i18n.ts                # Internationalization config
│   └── middleware.ts          # Next.js middleware for i18n
├── messages/                  # Translation files
│   ├── en.json               # English translations
│   └── zh.json               # Chinese translations
├── prisma/
│   └── schema.prisma         # Database schema
└── public/                   # Static assets
```

## Database Schema

The application includes the following models:

- **User**: System users (lawyers, paralegals, admins, clients)
- **Client**: Client information
- **Case**: Legal cases with status tracking
- **Document**: Document management with categorization
- **Task**: Case-related tasks and to-dos
- **Note**: Case notes and annotations
- **AIConversation**: AI assistant conversation history

## Available Routes

- `/[locale]` - Home page
- `/[locale]/auth/login` - Login page
- `/[locale]/auth/register` - Registration page
- `/api/auth/*` - Authentication API endpoints

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Database Management

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Create a new migration
npx prisma migrate dev --name migration_name

# Push schema changes without migrations
npx prisma db push

# Reset database (warning: deletes all data)
npx prisma migrate reset
```

## Deployment

The easiest way to deploy this app is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Set up environment variables
4. Deploy

Make sure to set up a production PostgreSQL database (e.g., on Supabase, Railway, or Neon).

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
