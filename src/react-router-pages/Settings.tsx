'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, clearSubscriptionCache } from '../hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Crown, Gift, CreditCard, User, Shield, Settings, Calendar, DollarSign, AlertTriangle, Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import SubscriptionModal from '../components/SubscriptionModal';
import PaymentMethodModal from '../components/PaymentMethodModal';

interface BillingHistoryItem {
  id: string;
  type?: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  description: string;
  invoiceUrl?: string | null;
  subscriptionId?: string | null;
}

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { subscriptionStatus, isLoading: subscriptionLoading, refreshSubscriptionStatus } = useSubscription();
  const { toast } = useToast();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<string | null>(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Load billing history and payment methods on component mount
  useEffect(() => {
    if (user?.id) {
      loadBillingHistory();
      loadPaymentMethods();
    }
  }, [user?.id]);



  const loadBillingHistory = async () => {
    if (!user?.id) return;
    
    setIsLoadingBilling(true);
    try {
      const params = new URLSearchParams({
        userId: user.id,
        ...(user.email && { email: user.email })
      });
      
      const response = await fetch(`/api/billing/history?${params}`);
      console.log('Billing history response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Billing history data:', data);
        setBillingHistory(data.invoices || []);
      } else {
        console.error('Failed to load billing history:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load billing history:', error);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const loadPaymentMethods = async () => {
    if (!user?.id) return;
    
    setIsLoadingPaymentMethods(true);
    try {
      const response = await fetch(`/api/billing/payment-methods?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded payment methods:', data.paymentMethods);
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: formData.name,
          email: formData.email,
        }),
      });

      if (response.ok) {

  const handleDebugSubscription = async () => {
    if (!user?.id) return;
    
    try {
      // Clear cache first
      clearSubscriptionCache();
      
      // Call debug endpoint
      const params = new URLSearchParams({
        userId: user.id,
        ...(user.email && { email: user.email })
      });
      
      const response = await fetch(`/api/debug-subscription-status?${params}`);
      const debugData = await response.json();
      
      console.log('🔍 DEBUG SUBSCRIPTION DATA:', debugData);
      
      // Show debug info in toast
      toast({
        title: "Debug Info",
        description: `Status: ${debugData.calculatedStatus?.status || 'unknown'}, Subscribed: ${debugData.calculatedStatus?.isSubscribed || false}`,
        duration: 5000,
      });
      
      // Force refresh subscription status
      await refreshSubscriptionStatus();
      
    } catch (error) {
      console.error('Debug subscription error:', error);
      toast({
        title: "Debug Error",
        description: "Failed to debug subscription status",
        variant: "destructive",
      });
    }
  };
        const result = await response.json();
        if (result.user) {
          // Update the user context with new data
          // TODO: Add updateUser method to AuthContext
        }
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (response.ok) {
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been cancelled. You will lose Creator access immediately and all public trails will be moved to draft.",
        });
        setShowCancelDialog(false);
        // Refresh subscription status
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePaymentMethod = () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to add payment methods.",
        variant: "destructive",
      });
      return;
    }
    setEditingPaymentMethod(null); // Clear any editing state
    setShowPaymentMethodModal(true);
  };

  const handleEditPaymentMethod = (paymentMethodId: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to edit payment methods.",
        variant: "destructive",
      });
      return;
    }
    
    // Find the payment method to edit
    const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
    if (paymentMethod) {
      setEditingPaymentMethod(paymentMethod);
      setShowPaymentMethodModal(true);
    }
  };

  const handleDeletePaymentMethod = (paymentMethodId: string) => {
    console.log('handleDeletePaymentMethod called with ID:', paymentMethodId);
    console.log('User ID:', user?.id);
    setPaymentMethodToDelete(paymentMethodId);
    setShowDeletePaymentDialog(true);
  };

  const confirmDeletePaymentMethod = async () => {
    if (!paymentMethodToDelete) {
      console.error('No payment method to delete');
      return;
    }

    console.log('Deleting payment method:', paymentMethodToDelete);

    try {
      const response = await fetch('/api/billing/delete-payment-method', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          paymentMethodId: paymentMethodToDelete 
        }),
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Delete result:', result);
        
        await loadPaymentMethods(); // Refresh the list
        toast({
          title: "Payment Method Deleted",
          description: "The payment method has been removed successfully.",
        });
      } else {
        const errorData = await response.json();
        console.error('Delete error response:', errorData);
        throw new Error(errorData.error || 'Failed to delete payment method');
      }
    } catch (error) {
      console.error('Delete payment method error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete payment method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowDeletePaymentDialog(false);
      setPaymentMethodToDelete(null);
    }
  };

  const getSubscriptionStatusText = () => {
    if (subscriptionStatus.isTrialing) {
      const daysLeft = subscriptionStatus.trialEnd 
        ? Math.ceil((subscriptionStatus.trialEnd - Math.floor(Date.now() / 1000)) / (24 * 60 * 60))
        : 14;
      return `${daysLeft} days left in trial`;
    }
    return subscriptionStatus.status === 'active' ? 'Active' : 'Inactive';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Stripe amounts are in cents
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE MY ACCOUNT') {
      toast({
        title: "Confirmation Error",
        description: "Please type exactly 'DELETE MY ACCOUNT' to confirm deletion.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // Properly log out the user and redirect to home
      setTimeout(() => {
        logout(() => {
          if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        });
      }, 1500);

    } catch (error) {
      console.error('Account deletion error:', error);
      toast({
        title: "Deletion Failed",
        description: "There was an error deleting your account. Please try again or contact support.",
        variant: "destructive",
      });
      setIsDeleting(false); // Only reset loading state on error
    }
    // Don't reset isDeleting on success - keep it true until logout completes
  };

  const isDeleteConfirmationValid = deleteConfirmationText === 'DELETE MY ACCOUNT';

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account, subscription, and payment details</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Profile'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Account ID</span>
                <span className="text-sm font-mono">{user?.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Email Verified</span>
                <Badge variant="secondary">
                  Unverified
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {subscriptionStatus.isSubscribed || subscriptionStatus.isTrialing ? (
                    <Crown className="h-6 w-6 text-amber-500" />
                  ) : (
                    <Gift className="h-6 w-6 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {subscriptionStatus.isSubscribed || subscriptionStatus.isTrialing ? 'Creator Plan' : 'Free Tier'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {subscriptionStatus.isSubscribed || subscriptionStatus.isTrialing 
                        ? getSubscriptionStatusText()
                        : 'Access unlimited trails created by others'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={subscriptionStatus.isSubscribed || subscriptionStatus.isTrialing ? "default" : "secondary"}>
                    {subscriptionStatus.isTrialing ? 'Trial' : 
                     subscriptionStatus.isSubscribed ? 'Active' : 'Free'}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDebugSubscription}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Debug
                  </Button>
                </div>
              </div>

              {subscriptionStatus.isSubscribed || subscriptionStatus.isTrialing && (
                <>
                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold">Plan Features</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 text-amber-500">✓</div>
                          <span className="text-sm">Create unlimited trails</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 text-amber-500">✓</div>
                          <span className="text-sm">Advanced analytics</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 text-amber-500">✓</div>
                          <span className="text-sm">Priority support</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 text-amber-500">✓</div>
                          <span className="text-sm">Custom branding</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 text-amber-500">✓</div>
                          <span className="text-sm">Export data</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 text-amber-500">✓</div>
                          <span className="text-sm">API access</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowPaymentDialog(true)}
                    >
                      Manage Billing
                    </Button>
                    <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="flex-1">
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Cancel Subscription
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel your Creator subscription? 
                            <br /><br />
                            <strong>This action will:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Remove Creator access immediately</li>
                              <li>Move all public trails to draft status</li>
                              <li>Stop all future billing</li>
                            </ul>
                            <br />
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleCancelSubscription}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Yes, Cancel Subscription
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upgrade Section for Free Tier Users */}
          {!subscriptionStatus.isSubscribed && !subscriptionStatus.isTrialing && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Unlock Creator Features
                </CardTitle>
                <CardDescription>
                  Free Tier - Access unlimited trails created by others
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Free Tier</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-600">Access unlimited trails</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-700 mb-3">Creator Plan</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 text-amber-500">✓</div>
                        <span className="text-sm text-gray-700">Advanced analytics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 text-amber-500">✓</div>
                        <span className="text-sm text-gray-700">Unlimited trail creation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 text-amber-500">✓</div>
                        <span className="text-sm text-gray-700">Priority support</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 text-amber-500">✓</div>
                        <span className="text-sm text-gray-700">Earn for your trails</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-amber-200">
                  <Button 
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                    onClick={() => setShowSubscriptionModal(true)}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Creator Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage your payment methods and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingPaymentMethods ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading payment methods...</p>
                </div>
              ) : paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">
                            {method.brand} •••• {method.last4}
                          </p>
                          <p className="text-sm text-gray-600">
                            Expires {method.expMonth}/{method.expYear}
                            {method.isDefault && (
                              <Badge variant="secondary" className="ml-2">Default</Badge>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditPaymentMethod(method.id)}
                          title="Edit payment method"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeletePaymentMethod(method.id)}
                          title="Delete payment method"
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleUpdatePaymentMethod}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={loadPaymentMethods}
                      disabled={isLoadingPaymentMethods}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingPaymentMethods ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">No payment method added</p>
                        <p className="text-sm text-gray-600">Add a payment method to upgrade your plan</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={handleUpdatePaymentMethod}
                      >
                        Add Payment Method
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={loadPaymentMethods}
                        disabled={isLoadingPaymentMethods}
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingPaymentMethods ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View your past invoices and payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBilling ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading billing history...</p>
                </div>
              ) : billingHistory.length > 0 ? (
                <div className="space-y-3">
                  {billingHistory.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <DollarSign className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.description}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {formatDate(invoice.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.amount, invoice.currency)}</p>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No billing history available</p>
                  <p className="text-sm">Your billing history will appear here once you have an active subscription</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" placeholder="Enter current password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" placeholder="Enter new password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" placeholder="Confirm new password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <h4 className="font-semibold text-red-800 mb-2">Delete Account</h4>
                <p className="text-sm text-red-600 mb-4">
                  Once you delete your account, there is no going back. This will permanently delete all your data, trails, and subscription information.
                </p>
                <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Permanently Delete Account
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-4">
                          <p>
                            This action <strong>cannot be undone</strong>. This will permanently delete your account and remove all associated data.
                          </p>
                          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-800 font-medium mb-2">This will delete:</p>
                            <ul className="text-sm text-red-700 space-y-1">
                              <li>• Your user account and profile</li>
                              <li>• All trails and content you've created</li>
                              <li>• Your subscription and billing information</li>
                              <li>• All account history and analytics</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="delete-confirmation" className="text-sm font-medium">
                              To confirm deletion, type <span className="font-bold">"DELETE MY ACCOUNT"</span> below:
                            </Label>
                            <Input
                              id="delete-confirmation"
                              type="text"
                              placeholder="Type: DELETE MY ACCOUNT"
                              value={deleteConfirmationText}
                              onChange={(e) => setDeleteConfirmationText(e.target.value)}
                              className="border-red-300 focus:border-red-500"
                            />
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel 
                        onClick={() => {
                          setDeleteConfirmationText('');
                          setShowDeleteAccountDialog(false);
                        }}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={!isDeleteConfirmationValid || isDeleting}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      >
                        {isDeleting ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Account Permanently'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Method Update Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Billing</DialogTitle>
            <DialogDescription>
              Update your payment method or view billing portal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button onClick={handleUpdatePaymentMethod} className="w-full">
              Update Payment Method
            </Button>
            <Button variant="outline" className="w-full">
              View Billing Portal
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        onSubscribe={() => {
          setShowSubscriptionModal(false);
          toast({
            title: "Subscription Started",
            description: "Your Creator subscription has been activated!",
          });
        }}
      />

      {/* Payment Method Modal */}
      <PaymentMethodModal
        open={showPaymentMethodModal}
        onOpenChange={(open) => {
          setShowPaymentMethodModal(open);
          if (!open) {
            setEditingPaymentMethod(null); // Clear editing state when modal closes
          }
        }}
        editingPaymentMethod={editingPaymentMethod}
        onSuccess={async () => {
          setShowPaymentMethodModal(false);
          setEditingPaymentMethod(null);
          await loadPaymentMethods(); // Refresh payment methods
          toast({
            title: editingPaymentMethod ? "Payment Method Updated" : "Payment Method Added",
            description: editingPaymentMethod 
              ? "Your payment method has been updated successfully!" 
              : "Your payment method has been saved successfully!",
          });
        }}
        onError={(error) => {
          toast({
            title: "Error",
            description: error,
            variant: "destructive",
          });
        }}
      />

      {/* Delete Payment Method Confirmation Dialog */}
      <AlertDialog open={showDeletePaymentDialog} onOpenChange={setShowDeletePaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment method? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                console.log('Delete button clicked');
                confirmDeletePaymentMethod();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Payment Method
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 