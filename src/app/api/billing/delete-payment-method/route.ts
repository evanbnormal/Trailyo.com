import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function DELETE(request: NextRequest) {
  console.log('DELETE /api/billing/delete-payment-method called');
  
  try {
    const { userId, paymentMethodId } = await request.json();
    console.log('Delete request data:', { userId, paymentMethodId });

    if (!userId || !paymentMethodId) {
      console.log('Missing required fields');
      return NextResponse.json({ error: 'User ID and payment method ID are required' }, { status: 400 });
    }

    // First, find the customer by userId
    const customers = await stripe.customers.list({
      limit: 100,
    });

    const customer = customers.data.find(c => 
      c.metadata.userId === userId
    );

    if (!customer) {
      console.log('Customer not found for userId:', userId);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    console.log('Found customer:', customer.id);

    // Verify the payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    console.log('Payment method customer:', paymentMethod.customer, 'Expected customer:', customer.id);
    
    if (paymentMethod.customer !== customer.id) {
      console.log('Payment method does not belong to customer');
      return NextResponse.json({ error: 'Payment method does not belong to this customer' }, { status: 403 });
    }

    // Detach the payment method from the customer (this effectively deletes it from their account)
    console.log('Detaching payment method:', paymentMethodId);
    await stripe.paymentMethods.detach(paymentMethodId);
    console.log('Payment method detached successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Payment method deleted successfully',
      customer: {
        id: customer.id,
        email: customer.email,
      }
    });

  } catch (error) {
    console.error('Error deleting payment method:', error);
    
    // Handle specific Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
} 