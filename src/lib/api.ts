import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth";

/** Consistent success envelope. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

/** Consistent error envelope. */
export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: { message, details } }, { status });
}

/**
 * Wrap a route handler so thrown errors become consistent JSON responses
 * and validation errors return 422 with field details.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (req: Request, ...args: Args) => Promise<Response>
) {
  return async (req: Request, ...args: Args) => {
    try {
      return await handler(req, ...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return fail("Validation failed", 422, err.flatten());
      }
      if (err instanceof UnauthorizedError) {
        return fail("Unauthorized", 401);
      }
      if (err instanceof ForbiddenError) {
        return fail(err.message, 403);
      }
      console.error("[API] Unhandled error:", err);
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return fail(message, 500);
    }
  };
}

/** Parse pagination query params with safe bounds. */
export function getPagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSizeRaw = Number(url.searchParams.get("pageSize") ?? 20) || 20;
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}