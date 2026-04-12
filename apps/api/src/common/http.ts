import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodTypeAny } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;

  public constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function asyncHandler(
  fn: (request: Request, response: Response, next: NextFunction) => Promise<unknown>
) {
  return (request: Request, response: Response, next: NextFunction) => {
    void fn(request, response, next).catch(next);
  };
}

export function parseWithSchema<TSchema extends ZodTypeAny>(
  schema: TSchema | AnyZodObject,
  payload: unknown
) {
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new AppError(400, parsed.error.flatten().formErrors.join(', ') || 'Invalid payload');
  }

  return parsed.data;
}

export function notFoundHandler(_request: Request, _response: Response, next: NextFunction) {
  next(new AppError(404, 'Recurso nao encontrado'));
}

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: 'Erro interno no servidor' });
}
