/**
 * Payment Token Utilities
 * Helper functions for working with the payment token
 */

import { PAYMENT_TOKEN } from './blockchain';

/**
 * Get payment token information
 */
export function getPaymentTokenInfo() {
  return {
    address: PAYMENT_TOKEN.ADDRESS,
    decimals: PAYMENT_TOKEN.DECIMALS,
    symbol: PAYMENT_TOKEN.SYMBOL,
    name: PAYMENT_TOKEN.NAME,
  };
}

/**
 * Convert human-readable amount to token units
 * Example: 1.5 USDC → 1500000 (for 6 decimals)
 */
export function toTokenUnits(amount: number | string): bigint {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.floor(num * Math.pow(10, PAYMENT_TOKEN.DECIMALS)));
}

/**
 * Convert token units to human-readable amount
 * Example: 1500000 → 1.5 USDC (for 6 decimals)
 */
export function fromTokenUnits(units: bigint | string | number, precision: number = 2): string {
  const num = typeof units === 'string' ? BigInt(units) : units;
  const value = Number(num) / Math.pow(10, PAYMENT_TOKEN.DECIMALS);
  return value.toFixed(precision);
}

/**
 * Format amount with token symbol
 */
export function formatTokenAmount(amount: bigint | string | number, precision: number = 2): string {
  const formatted = fromTokenUnits(amount, precision);
  return `${formatted} ${PAYMENT_TOKEN.SYMBOL}`;
}

/**
 * Check if an address matches the payment token
 */
export function isPaymentToken(address: string): boolean {
  return address.toLowerCase() === PAYMENT_TOKEN.ADDRESS.toLowerCase();
}

/**
 * Default card price in token units
 */
export const CARD_PRICE_TOKEN_UNITS = 1 * Math.pow(10, PAYMENT_TOKEN.DECIMALS);