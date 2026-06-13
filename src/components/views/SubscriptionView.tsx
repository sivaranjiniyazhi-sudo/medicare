import { Check, Crown, Zap, Star, CheckCircle2 } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  highlighted?: boolean;
  icon: React.ReactNode;
  color: string;
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 499,
    period: 'month',
    icon: <Zap className="w-6 h-6" />,
    color: 'blue',
    features: [
      'Unlimited Billing',
      'Medicine Management',
      'Stock Management',
      'Invoice Generation',
      'Basic Reports',
      'WhatsApp Bill Sharing',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 999,
    period: 'month',
    icon: <Star className="w-6 h-6" />,
    color: 'emerald',
    highlighted: true,
    features: [
      'Everything in Basic',
      'Advanced Reports & Analytics',
      'Customer History',
      'Prescription Upload',
      'Expiry Tracking',
      'Staff Management (2 users)',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 1499,
    period: 'month',
    icon: <Crown className="w-6 h-6" />,
    color: 'purple',
    features: [
      'Everything in Standard',
      'AI Medicine Search',
      'Automatic WhatsApp Reminders',
      'Multi-User Support (Unlimited)',
      'Priority Support',
      'Custom Reports',
    ],
  },
];

export function SubscriptionView() {
  const handleSelectPlan = (planId: string) => {
    alert(`This would redirect to payment gateway for ${planId} plan. In production, you would integrate with Razorpay or similar payment provider.`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-500 mt-2">Choose the plan that suits your pharmacy</p>
      </div>

      {/* Current Plan Notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 inline-block mr-2" />
        <span className="text-emerald-800 font-medium">You're currently on the Free Trial</span>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl shadow-sm border-2 overflow-hidden ${
              plan.highlighted ? 'border-emerald-500' : 'border-gray-100'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute top-0 left-0 right-0 bg-emerald-500 text-white text-center py-1 text-sm font-medium">
                Most Popular
              </div>
            )}

            <div className={`p-6 ${plan.highlighted ? 'pt-10' : ''}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                plan.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                plan.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                'bg-purple-100 text-purple-600'
              }`}>
                {plan.icon}
              </div>

              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">{formatCurrency(plan.price)}</span>
                <span className="text-gray-500">/{plan.period}</span>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full mt-6 py-3 rounded-xl font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                {plan.highlighted ? 'Get Started' : 'Select Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900">Can I change plans later?</h3>
            <p className="text-sm text-gray-500 mt-1">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Is there a setup fee?</h3>
            <p className="text-sm text-gray-500 mt-1">No, there are no setup fees or hidden charges. You only pay the monthly subscription fee.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">What payment methods are accepted?</h3>
            <p className="text-sm text-gray-500 mt-1">We accept all major credit cards, debit cards, UPI, and net banking through Razorpay.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Is my data secure?</h3>
            <p className="text-sm text-gray-500 mt-1">Yes, all your data is encrypted and stored securely. We follow industry best practices for data security.</p>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="text-center text-gray-500 text-sm">
        <p>Need help choosing? Contact us at <span className="text-emerald-600">support@pharmacare.in</span></p>
      </div>
    </div>
  );
}
