Recommended Tech Stack (2026)
Category	Technology
Framework	Next.js 15 (App Router)
Language	TypeScript 5.9+
Styling	Tailwind CSS v4
Components	shadcn/ui
State Management	Redux Toolkit
Server State	TanStack Query v5
HTTP Client	Axios
Forms	React Hook Form
Validation	Zod
Tables	TanStack Table
Charts	Recharts
Icons	Lucide React
Theme	next-themes
Authentication	Auth.js or Clerk
Notifications	Sonner
Loading	React Suspense + Skeleton
Code Quality	Biome
Git Hooks	Husky + lint-staged
Testing	Vitest + Playwright
Monitoring	Sentry
Enterprise Folder Structure
src/
│
├── app/
│   ├── (auth)/
│   ├── (dashboard)/ role wise dashboard access and protected route
│   ├── api/
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── not-found.tsx
│
├── components/
│   ├── ui/
│   ├── common/
│   ├── forms/
│   ├── layouts/
│   ├── tables/
│   ├── charts/
│   └── shared/
│
├── features/
│   ├── auth/-componenets
│   ├── users/
│   ├── products/
│   └── notifications/
│
├── services/
│   ├── api/
│   ├── auth.service.ts
│   ├── user.service.ts
│   └── product.service.ts
│
├── lib/
│   ├── axios.ts
│   ├── query-client.ts
│   ├── utils.ts
│   └── env.ts
│
├── hooks/
    global
    /auth
    
│
├── providers/
│
├── store/
│   ├── index.ts
│   ├── hooks.ts
│   └── slices/
    features wise seprate
│
├── types/
│
├── constants/
│
├── config/
│
├── utils/
│
├── schemas/
│
├── actions/
│
├── middleware/
│
└── assets/
API Layer
services/
    auth.service.ts
    user.service.ts
    notification.service.ts
    product.service.ts

Example

export const UserService = {
    getUsers() {},
    getUser() {},
    createUser() {},
    updateUser() {},
    deleteUser() {},
}
Axios Setup
lib/
    axios.ts

Contains

Base URL
Timeout
Request interceptor
Response interceptor
JWT token injection
Refresh token handling
Error handling
React Query
hooks/query/

useUsers.ts

useProducts.ts

useNotifications.ts

Example

useQuery()

useMutation()

invalidateQueries()

prefetchQuery()
Redux Toolkit
store/

index.ts

hooks.ts

slices/

auth.slice.ts

theme.slice.ts

notification.slice.ts

Redux should only hold client/UI state, such as:

Authentication state
Theme
Sidebar state
Selected organization
Notification count

Keep API data in TanStack Query, not Redux.

API Client Pattern
Axios

↓

API Client

↓

Service Layer

↓

React Query Hook

↓

Component

Example

axios.ts

↓

user.service.ts

↓

useUsers.ts

↓

UsersTable.tsx
Feature Structure
features/

users/

components/

hooks/

schemas/

services/

types/

constants/

Everything related to a feature stays together.

Providers
providers/

ReduxProvider.tsx

QueryProvider.tsx

ThemeProvider.tsx

Wrapped in

app/layout.tsx
Authentication Flow
Login

↓

Store Access Token

↓

Axios Interceptor

↓

Expired?

↓

Refresh Token

↓

Retry Request
Environment Variables
.env

.env.local

.env.production

Validated with Zod.

Enterprise Packages
next

react

typescript

tailwindcss

shadcn/ui

axios

@reduxjs/toolkit

react-redux

@tanstack/react-query

react-hook-form

zod

@hookform/resolvers

lucide-react

sonner

next-themes

class-variance-authority

clsx

tailwind-merge

date-fns

js-cookie