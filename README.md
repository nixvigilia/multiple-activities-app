# Multiple Activities App

A secure web application with authentication and multiple activity features. Users can create accounts, manage todos, share photos, review food and Pokemon, create markdown notes, and interact with friends.

## Features

- 🔐 **Authentication System**
  - User registration with strong password validation
  - Password strength indicator with real-time feedback
  - Login/Logout functionality
  - Account deletion
  - Email confirmation via Supabase

- ✅ **Activity 1: Todo List**
  - Create, edit, and delete todos
  - Mark todos as complete/incomplete
  - Optimistic UI updates

- 📸 **Activity 2: Photo Gallery**
  - Upload and manage photos
  - View photo gallery
  - Delete photos

- 🍽️ **Activity 3: Food Review**
  - Upload food photos
  - Rate and review food items
  - Browse food reviews

- ⚡ **Activity 4: Pokemon Review**
  - Review Pokemon characters
  - Rate and comment on Pokemon
  - Browse Pokemon reviews

- 📝 **Activity 5: Markdown Notes**
  - Create and edit markdown notes
  - Rich text formatting support
  - Note management

- 👥 **Friend System**
  - Browse all users
  - Send friend requests
  - Accept friend requests
  - View friends' content
  - 401 unauthorized protection for non-friends

## Tech Stack

### Frontend

- **Next.js 16.0.1** - React framework with App Router
- **React 19.2.0** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI
  - Alert Dialog
  - Button
  - Card
  - Input
  - Label
  - Textarea
  - Sonner (Toast notifications)

### Backend

- **Next.js Server Actions** - Server-side actions
- **Supabase** - Authentication and database
  - Supabase Auth for user management
  - PostgreSQL database
  - Row Level Security (RLS)

### Database & ORM

- **Prisma 6.18.0** - Type-safe ORM
- **PostgreSQL** - Relational database
- Database triggers for automatic profile creation and user deletion

### UI/UX Libraries

- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **Class Variance Authority** - Component variants
- **clsx** & **tailwind-merge** - Conditional styling utilities

### Validation

- **Zod 4.1.12** - Schema validation

### Testing

- **Jest 30.2.0** - JavaScript testing framework
- **React Testing Library 16.3.0** - React component testing utilities
- **@testing-library/user-event 14.6.1** - User interaction simulation
- **@testing-library/jest-dom 6.9.1** - Custom Jest matchers for DOM testing
- **jest-environment-jsdom** - Browser-like environment for Jest

### Development Tools

- **ESLint** - Code linting
- **TypeScript** - Static type checking
- **dotenv** - Environment variable management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- PostgreSQL database (via Supabase)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd multiple-activities-app
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database Connection (for Prisma)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

Get these values from:

- Supabase API settings: https://supabase.com/dashboard/project/_/settings/api
- Database settings: https://supabase.com/dashboard/project/_/settings/database

4. Set up the database:
   - Run the SQL script in `prisma/setup-triggers.sql` in your Supabase SQL Editor
   - This creates triggers for automatic profile creation and user deletion

5. Generate Prisma Client:

```bash
npm run db:generate
```

6. Push the schema to the database:

```bash
npm run db:push
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

After installation, you can run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
multiple-activities-app/
├── app/
│   ├── (auth)/
│   │   ├── auth/
│   │   │   └── confirm/        # Email confirmation route
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page (with tests)
│   │   │   ├── page.tsx
│   │   │   └── page.test.tsx   # Unit and integration tests
│   │   └── error/              # Error page
│   ├── actions/
│   │   ├── auth.ts             # Authentication actions
│   │   ├── todos.ts            # Todo management actions
│   │   ├── photos.ts           # Photo management actions
│   │   ├── food-photos.ts      # Food review actions
│   │   ├── pokemon-reviews.ts  # Pokemon review actions
│   │   ├── pokemon.ts          # Pokemon data actions
│   │   ├── notes.ts            # Notes management actions
│   │   ├── reviews.ts          # Review actions
│   │   ├── friends.ts          # Friend management actions
│   │   └── secret.ts           # Secret message actions
│   ├── api/
│   │   └── friends/            # API routes for friend messages
│   ├── todos/                  # Activity 1: Todo List
│   ├── photos/                 # Activity 2: Photo Gallery
│   ├── food-review/            # Activity 3: Food Review
│   ├── pokemon-review/         # Activity 4: Pokemon Review
│   ├── notes/                  # Activity 5: Markdown Notes
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Homepage (activity hub)
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── todo-list.tsx
│   ├── photo-gallery.tsx
│   ├── food-review-gallery.tsx
│   ├── pokemon-review-gallery.tsx
│   ├── notes-list.tsx
│   ├── friends-list.tsx
│   ├── users-list.tsx
│   ├── pending-requests.tsx
│   ├── password-input.tsx
│   ├── password-strength-indicator.tsx
│   ├── logout-button.tsx
│   ├── delete-account-button.tsx
│   ├── back-button.tsx
│   └── secret-message-form.tsx
├── lib/
│   ├── prisma.ts               # Prisma client
│   ├── password-strength.ts    # Password validation logic
│   └── utils.ts                # Utility functions
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── setup-triggers.sql      # Database triggers
├── utils/
│   └── supabase/               # Supabase client utilities
│       ├── client.ts           # Client-side Supabase client
│       ├── server.ts           # Server-side Supabase client
│       └── middlware.ts        # Middleware for session management
├── jest.config.ts              # Jest configuration
└── components.json             # shadcn/ui configuration
```

## Database Schema

### Profile

- User profile information
- Links to auth.users via UUID
- Stores secret messages

### Friendship

- Friend relationships
- Status: pending, accepted, rejected
- Bidirectional relationships

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations

## Testing

This project includes comprehensive unit and integration tests using Jest and React Testing Library.

### Test Coverage

The signup page (`app/(auth)/signup/page.test.tsx`) includes:

#### Unit Tests

- ✅ Correct input field labels and accessibility
- ✅ Input field types (email, password)
- ✅ Form input validation and error messages
- ✅ Password strength validation
- ✅ Password matching validation
- ✅ Form submission validation

#### Integration Tests

- ✅ End-to-end signup flow with valid data
- ✅ Form data structure validation
- ✅ ActionResult structure verification
- ✅ Error handling and toast notifications
- ✅ Loading states during async operations

#### Additional Requirements

- ✅ Navigation link tests (prevents breaking changes)
- ✅ Supabase API properties tests (ensures API contract)
  - Verifies `error.message` property exists
  - Tests success/error response structures
  - Validates error handling fallbacks

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run specific test file
npm test app/(auth)/signup/page.test.tsx
```

### Test Structure

Tests are organized by functionality:

- **Rendering Tests** - Verify UI elements render correctly
- **Form Input Tests** - Test user interactions
- **Validation Tests** - Test form validation logic
- **Form Submission Tests** - Test complete submission flow
- **Integration Tests** - Test end-to-end user flows
- **Navigation Tests** - Ensure navigation links work
- **API Property Tests** - Verify external API contracts

### Test Reasoning

Tests are written to:

- Ensure accessibility and prevent breaking changes
- Verify security (password fields, input validation)
- Test error handling and user feedback
- Validate integration flows
- Protect against API contract changes
- Prevent navigation issues from code updates

## Security

- Password strength validation (client and server-side)
- Strong password requirements (uppercase, lowercase, numbers, special characters)
- Server-side authentication checks
- Protected API routes
- Row-level security with Supabase
- Prisma query validation
- Email confirmation for new accounts
- Secure session management with Supabase SSR

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library Documentation](https://testing-library.com/react)

## License

This project is private.
