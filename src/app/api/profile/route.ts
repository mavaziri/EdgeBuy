import { auth } from '@/auth';
import { db } from '@/lib/prisma';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { message: 'Authentication required' },
      { status: 401 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return Response.json({ message: 'Profile not found' }, { status: 404 });
  }

  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}
