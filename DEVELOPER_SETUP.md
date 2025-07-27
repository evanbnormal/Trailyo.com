# Developer Setup Guide

## Quick Start

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd trail-blaze-invest-earn
   npm install
   ```

2. **Environment Variables**:
   ```bash
   cp env.example .env
   # Edit .env with your actual values (see ENVIRONMENT_VARIABLES.md)
   ```

3. **Database Setup**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start Development**:
   ```bash
   npm run dev
   ```

## Required Accounts/Services

1. **Neon Database** (PostgreSQL): [console.neon.tech](https://console.neon.tech)
2. **Stripe** (Payments): [dashboard.stripe.com](https://dashboard.stripe.com)
3. **SendGrid** (Emails): [app.sendgrid.com](https://app.sendgrid.com)

## Key Features Implemented

- ✅ User authentication with email confirmation
- ✅ Subscription management (Free → Creator tier)
- ✅ Payment processing with Stripe
- ✅ Settings page with billing history and payment methods
- ✅ Trail creation and viewing system
- ✅ Responsive UI with Shadcn/UI components

## Architecture

- **Frontend**: Next.js 15 + React Router + Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Payments**: Stripe API
- **Emails**: SendGrid API
- **UI**: Shadcn/UI components

## Important Notes

- The app uses a hybrid routing system (Next.js App Router + React Router)
- Subscription status is cached in localStorage for performance
- Email confirmation links point to API routes that redirect to the homepage
- Payment methods are managed through Stripe's secure API

## Environment Variables Priority

**Critical** (app won't work without these):
1. `DATABASE_URL`
2. `STRIPE_SECRET_KEY` 
3. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. `SENDGRID_API_KEY`
5. `BASE_URL`

**Important** (features will break):
6. `STRIPE_WEBHOOK_SECRET`
7. `STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID`

**Optional** (nice to have):
8. `MICROLINK_API_KEY`
9. `NEXT_PUBLIC_PROXY_BASE_URL`

## Current Status

The application is fully functional for development with:
- Working subscription system
- Payment processing
- User management
- Settings/billing management
- Trail creation and viewing

See `ENVIRONMENT_VARIABLES.md` for detailed setup instructions. 