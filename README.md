# Zapilink

Next.js application with Supabase backend for profile management and scheduling.

## 🚀 Features

- Multi-profile management system
- Rich text editor for profile descriptions
- Schedule/agenda functionality with calendar view
- Google Calendar integration
- Security hardening with structured logging
- Row Level Security (RLS) implementation
- AES-256-GCM token encryption

## 🛠️ Tech Stack

- **Frontend**: Next.js 16.3.1, React 18.3.1, TypeScript
- **Backend**: Supabase (Auth, Database, Storage)
- **Styling**: Tailwind CSS, PostCSS
- **Integration**: Google Calendar API
- **Email**: Resend API

## 📋 Prerequisites

- Node.js 20.9.0+ (required for Next.js 16)
- Supabase project with PostgreSQL database
- Google Cloud project (for Google Calendar integration)
- Resend account (for email notifications)

## 🔧 Setup

### 1. Clone the repository

```bash
git clone https://github.com/SEU_USUARIO/zapilink.git
cd zapilink
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your-client-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret

# Encryption
SCHEDULE_TOKEN_ENCRYPTION_KEY=your-32-byte-encryption-key

# Email
RESEND_API_KEY=your-resend-api-key
SCHEDULE_EMAIL_FROM=noreply@yourdomain.com

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run database migrations

Execute the SQL scripts in Supabase SQL Editor in order:

1. `supabase/schema.sql` - Base schema
2. `scripts/migrate-multi-profile.sql` - Multi-profile support
3. `scripts/migrate-social-links.sql` - Social links
4. `scripts/migrate-blocks.sql` - Profile blocks
5. `scripts/migrate-schedule.sql` - Schedule/agenda system
6. `scripts/setup-storage.sql` - Storage buckets
7. `scripts/migrate-access-delegation.sql` - Access delegation / multi-user admin
8. `scripts/migrate-loyalty.sql` - Loyalty program (stars)

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Documentation

- [Environment Setup Guide](docs/ENVIRONMENT_SETUP.md)
- [GitHub Publishing Guide](docs/GITHUB_PUBLISHING.md)
- [Project Specifications](docs/superpowers/specs/)

## 🎨 Features Overview

### Profile Management
- Create and manage multiple profiles per account
- Rich text editor for profile descriptions
- Custom theme colors and accents
- Photo upload with Supabase Storage
- Social links integration

### Schedule/Agenda
- Calendar-based availability display
- Custom availability rules by day of week
- Exception handling (block dates, adjust capacity)
- Google Calendar sync
- Booking approval workflow
- Email notifications

### Security
- Supabase Auth integration
- Row Level Security (RLS)
- AES-256-GCM encryption for tokens
- Structured security logging
- Input validation and sanitization
- HTML sanitization for rich text

## 🏗️ Project Structure

```
zapilink/
├── app/                    # Next.js app directory
│   ├── [username]/        # Dynamic profile pages
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   └── dashboard/        # Dashboard pages
├── components/           # React components
│   ├── auth/            # Auth components
│   ├── dashboard/       # Dashboard components
│   ├── profile/         # Profile display components
│   └── schedule/        # Schedule components
├── lib/                 # Utility functions
│   ├── auth.ts         # Auth helpers
│   ├── supabase/       # Supabase clients
│   └── security-logger.ts
├── scripts/            # Database migration scripts
├── types/              # TypeScript type definitions
└── docs/              # Documentation
```

## 🚀 Deployment

Antes de publicar, siga o [Checklist de Publicação](docs/PUBLICACAO_CHECKLIST.md) — variáveis de ambiente, migrações SQL (incluindo `scripts/migrate-loyalty.sql`), OAuth e verificação pós-deploy.

### Dokploy (Recommended)

Dokploy is a self-hosted PaaS that simplifies deployment with automatic Git integration:

1. Install Dokploy on your server: `curl -sSL https://dokploy.com/install.sh | sh`
2. Connect your GitHub repository
3. Configure environment variables in Dokploy dashboard
4. Deploy with Dockerfile
5. Automatic SSL via Traefik

For detailed Dokploy deployment instructions, see [Dokploy Deployment Guide](docs/DOKPLOY_DEPLOYMENT.md).

### Vercel

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

## 📝 Development

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint (flat config em eslint.config.mjs)
npm run typecheck  # Run tsc --noEmit
```

### Code Style

- TypeScript for type safety
- Tailwind CSS for styling
- Component-based architecture
- Server-side rendering where appropriate

## 🔒 Security Considerations

- Never commit `.env.local` files
- Use environment variables for secrets
- Implement proper RLS policies in Supabase
- Validate all user inputs
- Sanitize HTML content
- Use HTTPS in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues and questions, please refer to the documentation in the `docs/` directory.

---

Built with [Next.js](https://nextjs.org/) and [Supabase](https://supabase.com/)
