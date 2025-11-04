import React from 'react';

// Standard error shape for API responses
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// Standard API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

// Error codes and their canonical messages
export const ERROR_CODES = {
  // Validation errors
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_FID: 'INVALID_FID',
  INVALID_TOKEN_ID: 'INVALID_TOKEN_ID',
  MISSING_ADDRESS: 'MISSING_ADDRESS',
  MISSING_FID: 'MISSING_FID',
  MISSING_TOKEN_ID: 'MISSING_TOKEN_ID',
  
  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  OWNERSHIP_MISMATCH: 'OWNERSHIP_MISMATCH',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_SCRATCHED: 'ALREADY_SCRATCHED',
  ALREADY_CLAIMED: 'ALREADY_CLAIMED',
  CARD_EXISTS: 'CARD_EXISTS',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
} as const;

// Canonical error messages
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.INVALID_ADDRESS]: 'Invalid wallet address format',
  [ERROR_CODES.INVALID_FID]: 'Invalid Farcaster ID',
  [ERROR_CODES.INVALID_TOKEN_ID]: 'Invalid token ID',
  [ERROR_CODES.MISSING_ADDRESS]: 'Wallet address is required',
  [ERROR_CODES.MISSING_FID]: 'Farcaster ID is required',
  [ERROR_CODES.MISSING_TOKEN_ID]: 'Token ID is required',
  
  [ERROR_CODES.UNAUTHORIZED]: 'You are not authorized to perform this action',
  [ERROR_CODES.FORBIDDEN]: 'Access denied',
  [ERROR_CODES.OWNERSHIP_MISMATCH]: 'You do not own this card',
  
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.ALREADY_SCRATCHED]: 'This card has already been scratched',
  [ERROR_CODES.ALREADY_CLAIMED]: 'This prize has already been claimed',
  [ERROR_CODES.CARD_EXISTS]: 'Card already exists for this token ID',
  
  [ERROR_CODES.DATABASE_ERROR]: 'Database temporarily unavailable',
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection failed',
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error',
  [ERROR_CODES.RATE_LIMIT]: 'Too many requests. Please try again later',
};

// Toast-friendly error messages (shorter, user-friendly)
export const TOAST_MESSAGES: Record<string, string> = {
  [ERROR_CODES.INVALID_ADDRESS]: 'Invalid wallet address',
  [ERROR_CODES.INVALID_FID]: 'Invalid Farcaster ID',
  [ERROR_CODES.INVALID_TOKEN_ID]: 'Invalid token ID',
  [ERROR_CODES.MISSING_ADDRESS]: 'Please connect your wallet',
  [ERROR_CODES.MISSING_FID]: 'Farcaster ID required',
  [ERROR_CODES.MISSING_TOKEN_ID]: 'Token ID required',
  
  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized action',
  [ERROR_CODES.FORBIDDEN]: 'Access denied',
  [ERROR_CODES.OWNERSHIP_MISMATCH]: 'You don\'t own this card',
  
  [ERROR_CODES.NOT_FOUND]: 'Not found',
  [ERROR_CODES.ALREADY_SCRATCHED]: 'Already scratched',
  [ERROR_CODES.ALREADY_CLAIMED]: 'Already claimed',
  [ERROR_CODES.CARD_EXISTS]: 'Card already exists',
  
  [ERROR_CODES.DATABASE_ERROR]: 'Service unavailable',
  [ERROR_CODES.NETWORK_ERROR]: 'Connection failed',
  [ERROR_CODES.INTERNAL_ERROR]: 'Something went wrong',
  [ERROR_CODES.RATE_LIMIT]: 'Too many requests',
};

// Create standardized API error
export function createApiError(
  code: string,
  message?: string,
  details?: unknown
): ApiError {
  return {
    code,
    message: message || ERROR_MESSAGES[code] || 'Unknown error',
    details,
  };
}

// Create standardized error response
export function createErrorResponse<T = never>(
  code: string,
  message?: string,
  details?: unknown,
  status: number = 400
): { response: ApiResponse<T>; status: number } {
  return {
    response: {
      success: false,
      error: createApiError(code, message, details),
    },
    status,
  };
}

// Get toast-friendly message
export function getToastMessage(error: ApiError | string): string {
  const code = typeof error === 'string' ? error : error.code;
  return TOAST_MESSAGES[code] || TOAST_MESSAGES[ERROR_CODES.INTERNAL_ERROR];
}

// Validation helpers
export function validateAddress(address: string): { isValid: boolean; error?: string } {
  if (!address) {
    return { isValid: false, error: ERROR_CODES.MISSING_ADDRESS };
  }
  
  // Basic Ethereum address validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { isValid: false, error: ERROR_CODES.INVALID_ADDRESS };
  }
  
  return { isValid: true };
}

export function validateFid(fid: number | string): { isValid: boolean; error?: string } {
  if (!fid) {
    return { isValid: false, error: ERROR_CODES.MISSING_FID };
  }
  
  const fidNum = typeof fid === 'string' ? parseInt(fid, 10) : fid;
  if (isNaN(fidNum) || fidNum <= 0) {
    return { isValid: false, error: ERROR_CODES.INVALID_FID };
  }
  
  return { isValid: true };
}

export function validateTokenId(tokenId: number | string): { isValid: boolean; error?: string } {
  if (!tokenId) {
    return { isValid: false, error: ERROR_CODES.MISSING_TOKEN_ID };
  }
  
  const tokenIdNum = typeof tokenId === 'string' ? parseInt(tokenId, 10) : tokenId;
  if (isNaN(tokenIdNum) || tokenIdNum <= 0) {
    return { isValid: false, error: ERROR_CODES.INVALID_TOKEN_ID };
  }
  
  return { isValid: true };
}

// React hook for showing toast errors
export function useToastError() {
  const showError = React.useCallback((error: ApiError | string) => {
    const message = getToastMessage(error);
    // This would integrate with your toast system
    console.error('Toast error:', message);
    // Example: toast.error(message);
  }, []);

  return { showError };
}