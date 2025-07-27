# Environment Variables Setup Guide

This document lists all the environment variables required to run the Trail Blaze Invest Earn application.

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

### 1. Database Configuration
```bash
# PostgreSQL Database URL (Neon Database)
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```
**Purpose**: Connects to the Neon PostgreSQL database for user data, subscriptions, and trail content.

### 2. Stripe Payment Processing
```bash
# Stripe Secret Key (Server-side)
STRIPE_SECRET_KEY="sk_test_..." # For development, sk_live_... for production

# Stripe Publishable Key (Client-side) 
STRIPE_PUBLISHABLE_KEY="pk_test_..." # For development, pk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." # Same as above, but accessible on client-side

# Stripe Webhook Secret (for payment confirmations)
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Creator Subscription Price ID
STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID="price_1Rn2UFCksBPHzazD0sJhzUxa" # Current test price ID
```
**Purpose**: Handles all payment processing, subscriptions, and billing management.

### 3. Email Service (SendGrid)
```bash
# SendGrid API Key for email sending
SENDGRID_API_KEY="SG...."
```
**Purpose**: Sends email confirmations, password resets, and welcome emails.

### 4. Application Configuration
```bash
# Base URL for the application (important for email links)
BASE_URL="http://localhost:3001" # For development
# BASE_URL="https://yourdomain.com" # For production
```
**Purpose**: Used for generating correct links in emails and redirects.

### 5. External APIs (Optional)
```bash
# Microlink API for URL preview/metadata (optional feature)
MICROLINK_API_KEY="your_microlink_api_key" # Optional
```
**Purpose**: Provides URL preview functionality for trail content.

### 6. Proxy Configuration (Optional)
```bash
# Proxy base URL for external content
NEXT_PUBLIC_PROXY_BASE_URL="http://localhost:3002" # Development default
```
**Purpose**: Used for proxying external content in the creator view.

## Setup Instructions

1. **Copy the example file**:
   ```bash
   cp env.example .env
   ```

2. **Fill in the values** based on your accounts:
   - **Stripe**: Get keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - **SendGrid**: Get API key from [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
   - **Database**: Get connection string from [Neon Console](https://console.neon.tech/)

3. **Important Notes**:
   - Use test keys for development (sk_test_, pk_test_)
   - Use live keys for production (sk_live_, pk_live_)
   - Never commit the `.env` file to git
   - The `.env` file is already in `.gitignore`

## Critical for Production

The following variables are **absolutely required** for the application to function:

1. `DATABASE_URL` - Without this, no data persistence
2. `STRIPE_SECRET_KEY` - Without this, no payments work
3. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Without this, Stripe forms won't load
4. `STRIPE_WEBHOOK_SECRET` - Without this, payment confirmations fail
5. `SENDGRID_API_KEY` - Without this, no emails are sent
6. `BASE_URL` - Without this, email links are broken

## Current Development Status

- ✅ Database: Connected to Neon PostgreSQL
- ✅ Stripe: Configured with test keys
- ⚠️ SendGrid: API key present but sender email `noreply@trailyo.com` needs verification
- ✅ Base URL: Configured for local development

## Troubleshooting

- If payments fail: Check Stripe keys and webhook secret
- If emails don't send: Verify SendGrid API key and sender email
- If database errors: Check DATABASE_URL connection string
- If email links are broken: Verify BASE_URL is correct

## Security Notes

- Keep all secret keys secure
- Use different keys for development and production
- Regularly rotate API keys
- Never expose secret keys in client-side code 