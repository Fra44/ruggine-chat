/**
 * User model interface representing a basic user entity.
 */
export interface User {
    id: number;
    username: string;
}

/**
 * Authenticated User model interface extending User with authentication token.
 */
export interface AuthenticatedUser extends User {
    token: string;
}

/**
 * Type for field validation errors, mapping field names to error messages.
 */
export type FieldErrors = Record<string, string | string[]>;

/**
 * Custom error class for API-related errors with additional metadata.
 */
export class ApiError extends Error {
    status: number;
    errors?: FieldErrors;
    raw?: unknown;

    constructor(
        message: string,
        status: number,
        errors?: FieldErrors,
        raw?: unknown
    ) {
        super(message);

        this.name = "ApiError";
        this.status = status;
        this.errors = errors;
        this.raw = raw;
    }
}

/**
 * Type guard to check if an unknown error is an ApiError instance.
 * @param err - The error to check
 * @returns True if the error is an ApiError, false otherwise
 */
export const isApiError = (err: unknown): err is ApiError =>
    typeof err === "object" &&
    err !== null &&
    "name" in (err as Record<string, unknown>) &&
    (err as { name?: unknown }).name === "ApiError";

/**
 * Converts a Response object to an ApiError instance.
 * Attempts to parse JSON response for error details, falls back to text or status.
 * @param res - The Response object from a failed API call
 * @returns A Promise that resolves to an ApiError instance
 */
export const toApiError = async (res: Response): Promise<ApiError> => {
    try {
        const data = await res.json();
        const message = data?.message || `HTTP ${res.status}`;
        const errors: FieldErrors | undefined = data?.errors;
        return new ApiError(message, res.status, errors, data);
    } catch {
        const text = await res.text().catch(() => "");
        return new ApiError(text || `HTTP ${res.status}`, res.status);
    }
};