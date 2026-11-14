'use client';

import { useQuery } from '@tanstack/react-query';
import { getCurrentProfile } from '@/services/profile.service';

export const currentProfileQueryKey = ['profile', 'current'] as const;
export const CURRENT_PROFILE_STALE_TIME = 5 * 60 * 1000;

export function useCurrentProfile(enabled = true) {
  return useQuery({
    queryKey: currentProfileQueryKey,
    queryFn: getCurrentProfile,
    enabled,
    staleTime: CURRENT_PROFILE_STALE_TIME,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
}
