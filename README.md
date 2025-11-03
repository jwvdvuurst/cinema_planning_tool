# Film Theater Planner

A production-ready scheduling webapp for volunteer-run film theaters built with Next.js, TypeScript, Prisma, and Supabase.

## Features

- **Role-based Access Control**: PROGRAMMA, TECHNIEK, ZAALWACHT, ADMIN roles
- **Automatic Planning**: Intelligent assignment algorithm with fairness heuristics
- **Availability Management**: Volunteers can mark their availability
- **Swap System**: Request and manage assignment swaps
- **Email Notifications**: Automated notifications for assignments and alerts
- **Calendar Views**: Visual scheduling interface
- **Export Options**: ICS calendar export and PDF roster generation
- **Constraint Management**: Configurable planning constraints

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI primitives
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth with magic links
- **Email**: SMTP integration for notifications
- **Validation**: Zod schemas
- **Forms**: React Hook Form
- **Styling**: Tailwind CSS with custom design system

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Supabase account
- SMTP email service (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd planning_tool
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

Fill in your environment variables:
```env
# Next
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/film_theater_planner"

# Mail (optional)
SMTP_HOST=smtp.example.org
SMTP_PORT=587
SMTP_USER=apikey_or_user
SMTP_PASS=secret
SMTP_FROM="Filmtheater Planner <noreply@filmtheater.nl>"
```

4. Set up the database:
```bash
# Push the schema to your database
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed with demo data
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Database Schema

The application uses the following main entities:

- **User**: Volunteers with roles and contact information
- **Film**: Movie library with metadata
- **Screening**: Scheduled film showings
- **Availability**: Volunteer availability per screening/role
- **Assignment**: Final staffing assignments
- **SwapRequest**: Assignment swap requests
- **Constraint**: Planning configuration
- **SkillTag**: Volunteer skill tags
- **AuditLog**: System activity tracking

## Core Features

### Automatic Planning

The planner algorithm:
1. Finds available volunteers for each screening
2. Applies constraints (weekly/monthly limits)
3. Sorts by fairness (fewer recent assignments, older last assignment, higher skills)
4. Assigns exactly 2 people per role per screening
5. Reports deficits when insufficient volunteers

### Role-based Access

- **ADMIN**: Full system access, can manage users and settings
- **PROGRAMMA**: Manage films and screenings, run planner
- **TECHNIEK**: Manage technical availability and assignments
- **ZAALWACHT**: Manage usher availability and assignments

### Swap System

Volunteers can request swaps for their assignments. The system supports:
- Requesting swaps for own assignments
- Accepting/rejecting incoming swap requests
- Configurable approval workflows

## API Endpoints

- `POST /api/planner/run` - Run the automatic planner
- `POST /api/availability/set` - Set volunteer availability
- `POST /api/swaps/request` - Request assignment swap
- `POST /api/swaps/accept` - Accept swap request
- `POST /api/swaps/reject` - Reject swap request
- `POST /api/constraints/set` - Update planning constraints
- `GET /api/films` - List films
- `POST /api/films` - Create film
- `GET /api/screenings` - List screenings
- `POST /api/screenings` - Create screening
- `POST /api/emails/send` - Send notification emails

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript checks
- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed database with demo data
- `npm run db:studio` - Open Prisma Studio

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── films/             # Films management
│   ├── screenings/        # Screenings management
│   ├── availability/      # Availability management
│   ├── plan/              # Planner interface
│   ├── swaps/             # Swap management
│   └── settings/          # System settings
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Layout components
├── lib/                  # Utility libraries
│   ├── auth.ts          # Authentication helpers
│   ├── db.ts            # Database client
│   ├── email.ts         # Email utilities
│   ├── planner.ts       # Planning algorithm
│   └── utils.ts         # General utilities
└── middleware.ts        # Next.js middleware
```

## Deployment

The application is designed to be deployed on Vercel:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Ensure all environment variables are set in your production environment, including:
- Supabase credentials
- Database connection string
- SMTP email configuration
- Site URL

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.

