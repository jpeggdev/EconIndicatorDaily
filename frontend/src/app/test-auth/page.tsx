'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function TestAuth() {
  const { data: session, status, update } = useSession();
  const [email, setEmail] = useState('test@example.com');

  const handleSignIn = async () => {
    const result = await signIn('credentials', {
      email,
      redirect: false,
    });
    console.log('Sign in result:', result);
  };

  const handleUpgrade = async () => {
    if (!session?.user?.id) {
      alert('No user ID found');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/users/upgrade/${session.user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stripeData: {
            paymentMethodId: 'sim_payment_method',
            subscriptionType: 'pro'
          }
        })
      });

      const result = await response.json();
      console.log('Upgrade result:', result);
      
      if (result.success) {
        // Force session update
        await update();
        alert('Upgrade successful! Session updated.');
      } else {
        alert('Upgrade failed: ' + result.message);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Upgrade error: ' + error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Auth Test</h1>
        
        <div className="mb-4">
          <strong>Status:</strong> {status}
        </div>
        
        {session ? (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded">
              <h2 className="font-semibold text-green-800">Signed In</h2>
              <p><strong>ID:</strong> {session.user?.id}</p>
              <p><strong>Email:</strong> {session.user?.email}</p>
              <p><strong>Name:</strong> {session.user?.name}</p>
              <p><strong>Subscription:</strong> {(session.user as any)?.subscriptionStatus || 'free'}</p>
              <p><strong>Max Indicators:</strong> {(session.user as any)?.maxIndicators || 5}</p>
            </div>
            
            <button
              onClick={handleUpgrade}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Upgrade to Pro
            </button>
            
            <button
              onClick={() => signOut()}
              className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleSignIn}
              className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
            >
              Sign In
            </button>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}