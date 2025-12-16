import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Check for mobile user agents only - don't use screen width to avoid affecting desktop users
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  
  // Also check for touch-only devices that identify as mobile
  const isMobileUA = mobileRegex.test(userAgent.toLowerCase());
  
  // Check if it's a mobile device in tablet mode or similar
  const hasMobileInUA = /mobile/i.test(userAgent) && !/windows/i.test(userAgent);
  
  return isMobileUA || hasMobileInUA;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
