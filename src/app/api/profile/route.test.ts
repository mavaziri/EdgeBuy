import { afterEach, describe, expect, it, vi } from 'vitest';

const { auth, findUnique } = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/prisma', () => ({
  db: { user: { findUnique } },
}));

import { GET } from './route';

const testUser = {
  id: 'user-42',
  name: 'Morgan Shopper',
  email: 'morgan@example.com',
  image: null,
  createdAt: new Date('2024-06-01T10:00:00.000Z'),
  updatedAt: new Date('2024-08-03T11:30:00.000Z'),
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/profile', () => {
  it('rejects requests without an authenticated user', async () => {
    auth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      message: 'Authentication required',
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns only the current user profile fields as serializable values', async () => {
    auth.mockResolvedValue({ user: { id: testUser.id } });
    findUnique.mockResolvedValue({ ...testUser, password: 'must-not-leak' });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: testUser.id,
      name: testUser.name,
      email: testUser.email,
      image: null,
      createdAt: testUser.createdAt.toISOString(),
      updatedAt: testUser.updatedAt.toISOString(),
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: testUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('returns not found when the session user no longer exists', async () => {
    auth.mockResolvedValue({ user: { id: testUser.id } });
    findUnique.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: 'Profile not found' });
  });
});
