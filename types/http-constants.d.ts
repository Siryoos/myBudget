// Ambient declarations for HTTP status code constants used across the codebase.
// These are provided at runtime via '@/lib/setup-globals'.

declare global {
  const HTTP_OK: number;
  const HTTP_CREATED: number;
  const HTTP_BAD_REQUEST: number;
  const HTTP_UNAUTHORIZED: number;
  const HTTP_FORBIDDEN: number;
  const HTTP_NOT_FOUND: number;
  const HTTP_CONFLICT: number;
  const HTTP_INTERNAL_SERVER_ERROR: number;
  const HTTP_SERVICE_UNAVAILABLE: number;
}

export {};

