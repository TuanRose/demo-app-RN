export interface ApiError {
  code: string;
  message: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
