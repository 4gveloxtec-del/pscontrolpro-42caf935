import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize WhatsApp phone number to Brazilian format with country code +55
 * Handles various input formats:
 * - With or without +55
 * - With spaces, dashes, parentheses
 * - With or without leading zeros
 * 
 * @param phone - Raw phone number input
 * @returns Normalized phone number with +55 prefix, or null if invalid
 */
export function normalizeWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  
  // Remove all non-numeric characters except the leading +
  let cleaned = phone.trim();
  
  // Extract only digits
  const digits = cleaned.replace(/\D/g, '');
  
  // If no digits, return null
  if (!digits || digits.length < 10) {
    return null; // Invalid phone number (too short for Brazilian format)
  }
  
  // Check if it already starts with country code 55
  if (digits.startsWith('55') && digits.length >= 12) {
    // Already has country code, format as +55...
    return `+${digits}`;
  }
  
  // Check if it starts with 0 (some people type 0XX for area code)
  let normalizedDigits = digits;
  if (digits.startsWith('0') && digits.length >= 11) {
    normalizedDigits = digits.substring(1); // Remove leading 0
  }
  
  // Validate Brazilian phone format (10-11 digits: DDD + number)
  // DDD is 2 digits, phone is 8-9 digits
  if (normalizedDigits.length < 10 || normalizedDigits.length > 11) {
    // If longer than 11, might already have country code without 55
    if (normalizedDigits.length === 13 && normalizedDigits.startsWith('55')) {
      return `+${normalizedDigits}`;
    }
    // Still try to use it if it's close to valid
    if (normalizedDigits.length >= 10) {
      return `+55${normalizedDigits}`;
    }
    return null;
  }
  
  // Add +55 prefix
  return `+55${normalizedDigits}`;
}

/**
 * Format phone number for display (more readable format)
 * @param phone - Normalized phone number with +55
 * @returns Formatted phone like +55 (11) 99999-9999
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 13 && digits.startsWith('55')) {
    // +55 (XX) XXXXX-XXXX format
    const ddd = digits.substring(2, 4);
    const part1 = digits.substring(4, 9);
    const part2 = digits.substring(9, 13);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  
  if (digits.length === 12 && digits.startsWith('55')) {
    // +55 (XX) XXXX-XXXX format (older 8-digit numbers)
    const ddd = digits.substring(2, 4);
    const part1 = digits.substring(4, 8);
    const part2 = digits.substring(8, 12);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  
  return phone; // Return as-is if format not recognized
}
