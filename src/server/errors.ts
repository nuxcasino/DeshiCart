// Domain errors with explicit HTTP status codes (§43).
// Hono handlers throw these; the app onError maps them to JSON responses.
// Internal details (DB errors, secrets) never leak to the client.

export class AppError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request.") {
    super(400, "VALIDATION_ERROR", message);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Please log in.") {
    super(401, "AUTHENTICATION_ERROR", message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Forbidden.") {
    super(403, "AUTHORIZATION_ERROR", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict.") {
    super(409, "CONFLICT", message);
  }
}

export class IntegrationError extends AppError {
  constructor(message = "Upstream service failed.") {
    super(502, "INTEGRATION_ERROR", message);
  }
}

export function errorBody(err: AppError): { error: string; code: string } {
  return { error: err.message, code: err.code };
}
