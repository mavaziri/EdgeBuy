import { z } from 'zod';
import { appApiClient } from '@/lib/api-client';

const CurrentProfileSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
  image: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CurrentProfile = z.infer<typeof CurrentProfileSchema>;

export async function getCurrentProfile(): Promise<CurrentProfile> {
  const response = await appApiClient.get<unknown>('/api/profile');
  return CurrentProfileSchema.parse(response.data);
}
