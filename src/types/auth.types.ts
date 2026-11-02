// Authentication-related types

export interface NewUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
}

export interface UserWithPassword extends UserResponse {
  password: string;
}
