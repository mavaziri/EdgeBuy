import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { CurrentProfile } from '@/components/profile/current-profile';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="container px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Your Profile</h1>
        <p className="text-muted-foreground">
          Account information and preferences
        </p>
      </div>
      <CurrentProfile />
    </div>
  );
}
