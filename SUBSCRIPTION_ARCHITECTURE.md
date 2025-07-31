# Secure Subscription Architecture

## Overview

This document describes the **robust, webhook-driven subscription architecture** that replaces the previous insecure client-orchestrated system. The new architecture follows industry best practices and eliminates security vulnerabilities.

## 🚨 Previous Problems (Now Fixed)

The old system had critical security and architectural flaws:

- ❌ **Client orchestrated** entire subscription flow
- ❌ **Multiple API calls** controlled by client
- ❌ **Client passed Stripe IDs** across requests  
- ❌ **No webhook handling** for subscription events
- ❌ **Frequent polling** causing infinite requests
- ❌ **Security vulnerabilities** from trusting client data

## ✅ New Secure Architecture

### Core Principles

1. **Server Handles Everything** - Client cannot manipulate subscription logic
2. **Webhooks as Source of Truth** - Stripe events update database automatically  
3. **Single Secure Endpoints** - Minimal client interaction points
4. **Intelligent Caching** - Reduces unnecessary API calls
5. **Proper Error Handling** - Robust retry mechanisms

### Architecture Flow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   Client    │    │    Server    │    │   Stripe    │    │  Database    │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
       │                   │                   │                   │
       │ 1. Start Sub      │                   │                   │
       │ {email, userId}   │                   │                   │
       ├──────────────────►│                   │                   │
       │                   │ 2. Create Customer│                   │
       │                   ├──────────────────►│                   │
       │                   │ 3. Create Setup   │                   │
       │                   │    Intent         │                   │
       │                   ├──────────────────►│                   │
       │                   │ 4. Store Record   │                   │
       │                   ├──────────────────────────────────────►│
       │ 5. Client Secret  │                   │                   │
       │◄──────────────────┤                   │                   │
       │                   │                   │                   │
       │ 6. Confirm Setup  │                   │                   │
       │    (Stripe.js)    │                   │                   │
       ├──────────────────────────────────────►│                   │
       │                   │                   │ 7. Setup Success │
       │                   │                   │    Webhook       │
       │                   │◄──────────────────┤                   │
       │                   │ 8. Create Sub     │                   │
       │                   ├──────────────────►│                   │
       │                   │ 9. Update DB      │                   │
       │                   ├──────────────────────────────────────►│
       │ 10. Success       │                   │                   │
       │◄──────────────────┤                   │                   │
```

## 🔧 Implementation Details

### 1. Secure Subscription Creation

**Endpoint:** `POST /api/subscriptions/start`

```typescript
// Client sends minimal data
{
  email: string,
  userId: string,
  name?: string
}

// Server handles all Stripe operations internally
// Returns only client secret for payment setup
{
  clientSecret: string,
  status: 'setup_required' | 'error',
  message?: string
}
```

### 2. Comprehensive Webhook Handlers

**Endpoint:** `POST /api/payments/webhook`

Handles all subscription lifecycle events:

```typescript
// Subscription Events
'customer.subscription.created'     // → Create subscription record
'customer.subscription.updated'     // → Update subscription status  
'customer.subscription.deleted'     // → Mark as canceled

// Trial Events  
'customer.subscription.trial_will_end'  // → Send warning email

// Payment Events
'invoice.payment_succeeded'         // → Subscription renewal
'invoice.payment_failed'           // → Handle dunning

// Setup Events
'setup_intent.succeeded'           // → Create subscription
```

### 3. Intelligent Client Caching

```typescript
// 5-minute cache per user
let globalCache: { [userId: string]: SubscriptionStatus } = {};
let globalCacheTimestamp: { [userId: string]: number } = {};

// Only fetches fresh data when cache expires
// Webhooks keep server data fresh automatically
```

### 4. Simplified Client API

```typescript
// Old (insecure) way - REMOVED
const { customerId } = await fetch('/api/stripe/create-customer');
const { setupIntentId } = await fetch('/api/subscriptions/create');  
await fetch('/api/subscriptions/confirm');

// New (secure) way
const { clientSecret } = await SubscriptionService.startSubscription(email, userId);
// Webhooks handle everything else automatically
```

## 🛡️ Security Improvements

### Input Validation
- Server validates all user input
- Email format validation
- User authentication required
- Prevents duplicate subscriptions

### No Client Orchestration
- Client cannot manipulate subscription flow
- Server controls all Stripe operations
- No sensitive IDs passed through client

### Webhook Verification
- Stripe signature verification
- Idempotent webhook handling
- Proper error handling and retries

## 📊 Performance Improvements

### Reduced API Calls
- **Before:** 5-10 API calls per subscription
- **After:** 1 API call per subscription

### Intelligent Caching
- **Before:** Constant polling every few seconds
- **After:** 5-minute cache + webhook updates

### No Infinite Loops
- **Before:** Multiple components triggering requests
- **After:** Global subscriber pattern

## 🚀 Usage Examples

### Starting a Subscription

```typescript
const { startSubscription } = useSubscription();

try {
  const { clientSecret } = await startSubscription();
  // Use clientSecret with Stripe Elements
  // Webhooks handle subscription creation automatically
} catch (error) {
  // Handle user-friendly error
}
```

### Checking Subscription Status

```typescript
const { subscriptionStatus, isLoading } = useSubscription();

// Data is cached and updated via webhooks
// No manual polling required
if (subscriptionStatus.isSubscribed) {
  // User has active subscription
}
```

### Canceling Subscription

```typescript
const { cancelSubscription } = useSubscription();

try {
  await cancelSubscription();
  // Status updated automatically via webhooks
} catch (error) {
  // Handle error
}
```

## 🔄 Migration Guide

### Old Component Pattern (DEPRECATED)
```typescript
// DON'T USE - Security vulnerability
const handleSubscribe = async () => {
  const { customerId } = await fetch('/api/stripe/create-customer');
  const { setupIntentId } = await fetch('/api/subscriptions/create');
  await confirmSetup();
  await fetch('/api/subscriptions/confirm');
};
```

### New Component Pattern (SECURE)
```typescript
// USE THIS - Secure and simple
const handleSubscribe = async () => {
  const { clientSecret } = await startSubscription();
  // Server handles everything else via webhooks
};
```

## 🏆 Benefits

### For Developers
- ✅ **Simpler client code** - Less complexity to maintain
- ✅ **Better error handling** - Server-side validation
- ✅ **No race conditions** - Atomic operations
- ✅ **Easier testing** - Fewer integration points

### For Users  
- ✅ **Faster experience** - Reduced API calls
- ✅ **More reliable** - No failed partial states
- ✅ **Better feedback** - Clear error messages
- ✅ **No hanging requests** - Proper timeouts

### For Business
- ✅ **Security compliance** - Industry best practices
- ✅ **Reduced support tickets** - Fewer edge cases  
- ✅ **Better analytics** - Centralized logging
- ✅ **Easier maintenance** - Less complex flows

## 🔮 Future Enhancements

1. **Real-time Updates** - WebSocket notifications
2. **Advanced Caching** - Redis for multi-server deployments  
3. **Email Automation** - Trial reminders, payment failures
4. **Analytics Dashboard** - Subscription metrics
5. **Customer Portal** - Self-service subscription management

---

## 📝 Developer Notes

- **All old subscription endpoints have been removed**
- **Components updated to use new secure API**
- **Webhooks handle all subscription state changes**
- **Client polling reduced from every few seconds to 5-minute cache**
- **No more infinite request loops**

This architecture follows Stripe's recommended best practices and eliminates the security vulnerabilities present in the previous implementation. 