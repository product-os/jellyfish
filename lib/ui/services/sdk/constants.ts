const API_HOST = process.env.API_HOST || `${window.location.protocol}//${window.location.hostname}`;
export const API_PREFIX = process.env.API_PREFIX;
export const API_URL = `${API_HOST}:${process.env.PORT}`;
