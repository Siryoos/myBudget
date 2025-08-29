// Edge-safe HTTP status constants to avoid importing server-only modules in middleware
export const HTTP_OK = 200;
export const HTTP_CREATED = 201;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;
export const HTTP_INTERNAL_SERVER_ERROR = 500;
export const HTTP_SERVICE_UNAVAILABLE = 503;

export type HttpStatus =
  | typeof HTTP_OK
  | typeof HTTP_CREATED
  | typeof HTTP_BAD_REQUEST
  | typeof HTTP_UNAUTHORIZED
  | typeof HTTP_FORBIDDEN
  | typeof HTTP_NOT_FOUND
  | typeof HTTP_CONFLICT
  | typeof HTTP_INTERNAL_SERVER_ERROR
  | typeof HTTP_SERVICE_UNAVAILABLE;

