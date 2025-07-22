import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET(request: NextRequest) {
  console.log('GET /api/billing/history called');
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    console.log('Billing history request:', { userId, email });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // First, find the customer by userId
    const customers = await stripe.customers.list({
      limit: 100,
    });

    const customer = customers.data.find(c => 
      c.metadata.userId === userId || 
      (email && c.email === email)
    );

    console.log('Found customer:', customer ? customer.id : 'none');

    if (!customer) {
      console.log('No customer found, returning empty history');
      return NextResponse.json({ invoices: [] });
    }

    // Get invoices for the customer
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 50,
    });

    console.log('Found invoices:', invoices.data.length);

    // Get payment intents for the customer (for one-time payments)
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customer.id,
      limit: 50,
    });

    console.log('Found payment intents:', paymentIntents.data.length);

    // Get charges for the customer (another source of payment history)
    const charges = await stripe.charges.list({
      customer: customer.id,
      limit: 50,
    });

    console.log('Found charges:', charges.data.length);

    // Combine all payment sources
    const billingHistory = [];

    // Add invoices
    invoices.data.forEach(invoice => {
      billingHistory.push({
        id: invoice.id,
        type: 'invoice',
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        date: new Date(invoice.created * 1000).toISOString(),
        description: invoice.description || `Subscription invoice for ${invoice.currency.toUpperCase()} ${(invoice.amount_paid / 100).toFixed(2)}`,
        invoiceUrl: invoice.hosted_invoice_url,
        subscriptionId: (invoice as any).subscription,
      });
    });

    // Add successful payment intents that aren't already covered by invoices
    paymentIntents.data
      .filter(pi => pi.status === 'succeeded' && pi.amount > 0)
      .forEach(paymentIntent => {
        // Check if this payment intent is already covered by an invoice
        const existingInvoice = billingHistory.find(item => 
          item.subscriptionId && (paymentIntent as any).invoice === item.id
        );
        
        if (!existingInvoice) {
          billingHistory.push({
            id: paymentIntent.id,
            type: 'payment',
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            date: new Date(paymentIntent.created * 1000).toISOString(),
            description: paymentIntent.description || `Payment for ${paymentIntent.currency.toUpperCase()} ${(paymentIntent.amount / 100).toFixed(2)}`,
            invoiceUrl: null,
            subscriptionId: null,
          });
        }
      });

    // Add successful charges that aren't already covered
    charges.data
      .filter(charge => charge.status === 'succeeded' && charge.amount > 0)
      .forEach(charge => {
        // Check if this charge is already covered by an invoice or payment intent
        const existingItem = billingHistory.find(item => 
          (item.type === 'invoice' && (charge as any).invoice === item.id) ||
          (item.type === 'payment' && charge.payment_intent === item.id)
        );
        
        if (!existingItem) {
          billingHistory.push({
            id: charge.id,
            type: 'charge',
            amount: charge.amount,
            currency: charge.currency,
            status: charge.status,
            date: new Date(charge.created * 1000).toISOString(),
            description: charge.description || `Charge for ${charge.currency.toUpperCase()} ${(charge.amount / 100).toFixed(2)}`,
            invoiceUrl: null,
            subscriptionId: null,
          });
        }
      });

    // Sort by date (newest first)
    billingHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('Final billing history items:', billingHistory.length);

    return NextResponse.json({ 
      invoices: billingHistory,
      customer: {
        id: customer.id,
        email: customer.email,
      }
    });

  } catch (error) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing history' },
      { status: 500 }
    );
  }
} 