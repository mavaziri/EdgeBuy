import { db } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { ServiceResult } from '@/types/common.types';
import type {
  NewUserRequest,
  UserResponse,
  UserWithPassword,
} from '@/types/auth.types';

interface IAuthService {
  findUserByEmail(email: string): Promise<UserWithPassword | null>;
  createUser(input: NewUserRequest): Promise<ServiceResult<UserResponse>>;
  validateCredentials(
    email: string,
    password: string
  ): Promise<ServiceResult<UserResponse>>;
}

export class AuthService implements IAuthService {
  async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
      },
    });

    if (!user || !user.name || !user.email || !user.password) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
    };
  }

  async createUser(
    input: NewUserRequest
  ): Promise<ServiceResult<UserResponse>> {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(input.email);
    if (existingUser) {
      return {
        success: false,
        message: 'Email already in use',
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user.name || !user.email) {
      return {
        success: false,
        message: 'User creation failed: missing required fields',
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      message: 'User created successfully',
    };
  }

  async validateCredentials(
    email: string,
    password: string
  ): Promise<ServiceResult<UserResponse>> {
    const user = await this.findUserByEmail(email);

    if (!user || !user.password) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      message: 'Credentials validated successfully',
    };
  }
}

export class AuthServiceFactory {
  private static instance: IAuthService | null = null;

  static getAuthService(): IAuthService {
    if (!this.instance) {
      this.instance = new AuthService();
    }

    return this.instance;
  }
}
