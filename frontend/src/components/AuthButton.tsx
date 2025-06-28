'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { User, LogOut } from 'lucide-react';
import { Button, Avatar, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Skeleton } from '@heroui/react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <Skeleton className="w-24 h-10 rounded-lg" />;
  }

  if (session) {
    return (
      <Dropdown>
        <DropdownTrigger>
          <Button variant="light" className="p-2 h-auto">
            <div className="flex items-center space-x-3">
              <Avatar
                icon={<User className="w-4 h-4" />}
                size="sm"
                className="bg-primary text-primary-foreground"
              />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">
                  {session.user?.name || session.user?.email}
                </p>
                <Chip 
                  size="sm" 
                  variant="flat" 
                  color={session.user?.subscriptionStatus === 'pro' ? 'warning' : 'default'}
                  className="text-xs"
                >
                  {session.user?.subscriptionStatus === 'pro' ? 'Pro' : 'Free'} plan
                </Chip>
              </div>
            </div>
          </Button>
        </DropdownTrigger>
        <DropdownMenu>
          <DropdownItem
            key="logout"
            color="danger"
            startContent={<LogOut className="w-4 h-4" />}
            onClick={() => signOut()}
          >
            Sign out
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }

  return (
    <Button
      onClick={() => signIn()}
      color="primary"
      variant="solid"
      startContent={<User className="w-4 h-4" />}
    >
      Sign in
    </Button>
  );
}