const PRODUCTION_API_FALLBACK = 'https://kerjanusa-backend.vercel.app/api';

export const resolvedApiUrl =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PRODUCTION_API_FALLBACK : '');

export const shouldUseMockData = import.meta.env.PROD
  ? !resolvedApiUrl
  : import.meta.env.VITE_USE_MOCK_DATA === 'true' || !resolvedApiUrl;
