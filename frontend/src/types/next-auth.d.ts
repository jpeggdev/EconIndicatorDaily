declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      subscriptionStatus: string
      subscriptionTier: string
      maxIndicators: number
    }
  }

  interface User {
    id: string
    email: string
    name: string
    image?: string
    subscriptionStatus?: string
    subscriptionTier?: string
    maxIndicators?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string
    subscriptionStatus: string
    subscriptionTier: string
    maxIndicators: number
  }
}