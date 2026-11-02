'use server';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from '@/auth';
import { AuthServiceFactory } from '@/services/auth.service';
import {
  signInSchema,
  SignInSchemaFormData,
  signUpSchema,
  SignUpSchemaFormData,
} from '@/schemas/validation';
import { AuthError } from 'next-auth';
import type { ActionResult } from '@/types/common.types';
import {
  applyRateLimit,
  getClientIdentifier,
  RATE_LIMIT_CONFIGS,
  RateLimitError,
} from '@/middleware/rate-limit.middleware';

export async function signIn(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const rawData = {
      email: String(formData.get('email')),
      password: String(formData.get('password')),
    };

    // Apply rate limiting based on client IP
    const clientId = await getClientIdentifier();
    await applyRateLimit(clientId, RATE_LIMIT_CONFIGS.auth);

    const validatedCredentials = signInSchema.safeParse(rawData);
    const { success, error } = validatedCredentials;
    if (!success) {
      return {
        success: false,
        message: error.errors[0]?.message ?? 'Invalid data provided',
      };
    }

    const data: SignInSchemaFormData = validatedCredentials.data;

    // Optionally, you could call AuthService.validateUser here for extra checks
    await nextAuthSignIn('credentials', {
      ...data,
      redirect: false,
    });

    return {
      success: true,
      message: 'Signed in successfully',
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        success: false,
        message: error.message,
      };
    }

    if (error instanceof AuthError) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    return {
      success: false,
      message: 'Failed to sign in',
    };
  }
}

export async function signUp(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const rawData = {
      name: String(formData.get('name')),
      email: String(formData.get('email')),
      password: String(formData.get('password')),
    };

    // Apply rate limiting based on client IP
    const clientId = await getClientIdentifier();
    await applyRateLimit(clientId, RATE_LIMIT_CONFIGS.auth);

    const signUpValidationResult = signUpSchema.safeParse(rawData);
    const { success, error } = signUpValidationResult;
    if (!success) {
      return {
        success: false,
        message: error.errors[0]?.message ?? 'Invalid data provided',
      };
    }

    const data: SignUpSchemaFormData = signUpValidationResult.data;

    const authService = AuthServiceFactory.getAuthService();
    const result = await authService.createUser(data);

    if (!result.success) {
      return {
        success: false,
        message: result.message ?? 'Failed to create account',
      };
    }

    // Sign in the newly created user
    await nextAuthSignIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    return {
      success: true,
      message: 'Account created successfully',
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: 'Failed to create account',
    };
  }
}

export async function signOut(): Promise<void> {
  await nextAuthSignOut({ redirect: true, redirectTo: '/auth/signin' });
}
