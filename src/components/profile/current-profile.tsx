'use client';

import { useCurrentProfile } from '@/hooks/use-current-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CurrentProfile() {
  const {
    data: profile,
    error,
    isPending,
    refetch,
    isFetching,
  } = useCurrentProfile();

  if (isPending) {
    return (
      <p className="text-muted-foreground" role="status" aria-live="polite">
        Loading your profile...
      </p>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-destructive">Unable to load your profile.</p>
        <Button
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          Retry
        </Button>
      </div>
    );
  }

  const initials = (profile.name ?? profile.email).slice(0, 1).toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="h-14 w-14">
            <AvatarImage src={profile.image ?? undefined} alt="" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{profile.name || 'Your profile'}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.email}
            </p>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{profile.name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{profile.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member since</p>
            <p className="font-medium">
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
              }).format(new Date(profile.createdAt))}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
