export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(msg: string, details?: unknown) { return new HttpError(400, 'BAD_REQUEST', msg, details); }
  static unauthorized(msg = 'No autenticado') { return new HttpError(401, 'UNAUTHORIZED', msg); }
  static forbidden(msg = 'Sin permisos para esta acción') { return new HttpError(403, 'FORBIDDEN', msg); }
  static notFound(msg = 'Recurso no encontrado') { return new HttpError(404, 'NOT_FOUND', msg); }
  static conflict(msg: string) { return new HttpError(409, 'CONFLICT', msg); }
}
