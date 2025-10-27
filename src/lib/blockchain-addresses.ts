/**
 * Blockchain Address Constants
 * 
 * Centralized constants for Ethereum addresses used throughout the application
 * Prevents hardcoded addresses and ensures consistency
 */

/**
 * Ethereum zero address (burn address)
 * Used as default value for recipient when minting to self
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/**
 * Type for valid Ethereum addresses
 */
export type EthereumAddress = `0x${string}`;

/**
 * Validates if a string is a valid Ethereum address
 * @param address - Address string to validate
 * @returns boolean indicating if address is valid
 */
export const isValidEthereumAddress = (address: string): address is EthereumAddress => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validates if an address is the zero address
 * @param address - Address to check
 * @returns boolean indicating if address is zero address
 */
export const isZeroAddress = (address: string): boolean => {
  return address.toLowerCase() === ZERO_ADDRESS.toLowerCase();
};

/**
 * Common address patterns and utilities
 */
export const AddressPatterns = {
  ZERO: ZERO_ADDRESS,
  /**
   * Validates address format and returns normalized address
   * @param address - Address to normalize
   * @returns Normalized address or null if invalid
   */
  normalize: (address: string): EthereumAddress | null => {
    if (!isValidEthereumAddress(address)) return null;
    return address.toLowerCase() as EthereumAddress;
  },
  /**
   * Returns a safe recipient address (zero address if undefined/empty)
   * @param address - Optional recipient address
   * @returns Safe recipient address
   */
  safeRecipient: (address?: Address | string): EthereumAddress => {
    if (!address || address === '' || isZeroAddress(address)) {
      return ZERO_ADDRESS;
    }
    const normalized = AddressPatterns.normalize(address);
    return normalized || ZERO_ADDRESS;
  },
} as const;

/**
 * Type alias for better readability
 */
export type Address = EthereumAddress;