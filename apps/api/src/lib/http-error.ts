import type { ApiErrorCode } from "@vms/shared";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
