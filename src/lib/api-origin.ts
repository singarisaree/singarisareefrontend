export const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1').origin;
  } catch {
    return 'http://localhost:5001';
  }
})();

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://singarisarees.com';
