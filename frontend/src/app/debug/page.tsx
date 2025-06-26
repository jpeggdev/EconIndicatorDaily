'use client';

import { useSession } from 'next-auth/react';

export default function DebugPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Session Info</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Session Data:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
        
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">User ID Check:</h2>
          <p>User ID: <code className="bg-gray-100 px-2 py-1 rounded">{session?.user?.id || 'UNDEFINED'}</code></p>
          <p>Email: <code className="bg-gray-100 px-2 py-1 rounded">{session?.user?.email || 'UNDEFINED'}</code></p>
          <p>Subscription Status: <code className="bg-gray-100 px-2 py-1 rounded">{session?.user?.subscriptionStatus || 'UNDEFINED'}</code></p>
        </div>
      </div>
    </div>
  );
}