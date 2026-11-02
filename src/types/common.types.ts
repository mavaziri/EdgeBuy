// Common types used across the application

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
