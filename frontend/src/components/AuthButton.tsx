'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { User, LogOut } from 'lucide-react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="animate-pulse bg-gray-200 rounded px-4 py-2 w-20 h-10"></div>
    );
  }

  if (session) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-gray-600" />
          <div className="text-sm">
            <p className="font-medium text-gray-900">{session.user?.name || session.user?.email}</p>
            <p className="text-xs text-gray-500 capitalize">
              {session.user?.subscriptionStatus || 'free'} plan
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <User className="w-4 h-4 mr-2" />
      Sign in
    </button>
  );
}