import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

// Database-backed user authentication
async function findOrCreateUser(email: string, name?: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/findOrCreate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name: name || email.split('@')[0],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to find or create user');
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error finding/creating user:', error);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Demo',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        
        const user = await findOrCreateUser(credentials.email);
        
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, account }) => {
      // Set basic user info on initial sign-in
      if (user) {
        // For OAuth providers, we need to find or create user in our database
        if (account?.provider === 'google') {
          const dbUser = await findOrCreateUser(user.email!, user.name!);
          if (dbUser) {
            token.uid = dbUser.id;
            token.email = dbUser.email;
            token.name = dbUser.name;
          }
        } else {
          // For credentials provider, user is already from our database
          token.uid = user.id;
          token.email = user.email;
          token.name = user.name;
        }
      }
      
      // Always fetch fresh subscription data when JWT is updated
      // This includes initial sign-in and manual session updates
      if (token.uid) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/subscription/${token.uid}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              token.subscriptionStatus = data.data.subscriptionStatus;
              token.subscriptionTier = data.data.subscriptionTier;
              token.maxIndicators = data.data.maxIndicators;
            }
          }
        } catch (error) {
          console.error('Error fetching subscription data:', error);
          // Keep existing values if fetch fails, don't reset to free
          if (!token.subscriptionStatus) {
            token.subscriptionStatus = 'free';
            token.subscriptionTier = 'free';
            token.maxIndicators = 5;
          }
        }
      }
      
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.uid as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.subscriptionStatus = token.subscriptionStatus as string;
        session.user.subscriptionTier = token.subscriptionTier as string;
        session.user.maxIndicators = token.maxIndicators as number;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
};