// Define HTTP status code constants on the global object for both server and client runtimes.
// This provides a single source of truth and avoids repetitive imports in legacy code paths.

const defineIfMissing = (key: string, value: number) => {
  if (!(key in globalThis)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any)[key] = value;
  }
};

defineIfMissing('HTTP_OK', 200);
defineIfMissing('HTTP_CREATED', 201);
defineIfMissing('HTTP_BAD_REQUEST', 400);
defineIfMissing('HTTP_UNAUTHORIZED', 401);
defineIfMissing('HTTP_FORBIDDEN', 403);
defineIfMissing('HTTP_NOT_FOUND', 404);
defineIfMissing('HTTP_CONFLICT', 409);
defineIfMissing('HTTP_INTERNAL_SERVER_ERROR', 500);
defineIfMissing('HTTP_SERVICE_UNAVAILABLE', 503);

