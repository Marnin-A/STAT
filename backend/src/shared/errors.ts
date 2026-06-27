// Domain errors carry an HTTP status so the Fastify layer can map them.
export class DomainError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

// Invalid incident state transition -> 409 Conflict.
export class InvalidTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`invalid transition ${from} -> ${to}`, 409, "INVALID_TRANSITION");
  }
}

// Optimistic lock version mismatch on event append -> 409 Conflict.
export class VersionConflictError extends DomainError {
  constructor(expected: number, actual: number) {
    super(`version conflict: expected ${expected}, got ${actual}`, 409, "VERSION_CONFLICT");
  }
}

// RBAC / agency scope failure -> 403 Forbidden.
export class ForbiddenError extends DomainError {
  constructor(message = "forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

// Obvious automated SOS spam hard-blocked -> 429 Too Many Requests.
export class RateLimitBlockedError extends DomainError {
  constructor(message = "blocked: too many requests") {
    super(message, 429, "RATE_LIMIT_BLOCKED");
  }
}

// Incident not found -> 404.
export class NotFoundError extends DomainError {
  constructor(message = "not found") {
    super(message, 404, "NOT_FOUND");
  }
}

// Missing/invalid auth -> 401.
export class UnauthorizedError extends DomainError {
  constructor(message = "unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// Malformed request -> 400.
export class BadRequestError extends DomainError {
  constructor(message = "bad request") {
    super(message, 400, "BAD_REQUEST");
  }
}
