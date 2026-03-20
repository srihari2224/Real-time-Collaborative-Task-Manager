// src/utils/helpers.js
// Miscellaneous utility functions

import { v4 as uuidv4 } from 'uuid';

/** Generate a UUID v4 */
export const generateId = () => uuidv4();

/** Slugify a string */
export const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Parse comma-separated string to array */
export const parseCSV = (str) =>
  str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

/** Sleep for ms milliseconds */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Pick specific keys from an object */
export const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) acc[key] = obj[key];
    return acc;
  }, {});

/** Omit specific keys from an object */
export const omit = (obj, keys) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

/** Check if a value is a valid UUID */
export const isValidUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

/** Format bytes to human-readable size */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/** Safely parse JSON without throwing */
export const safeJsonParse = (str, fallback = null) => {
  try { return JSON.parse(str); }
  catch { return fallback; }
};

export default { generateId, slugify, parseCSV, sleep, pick, omit, isValidUUID, formatBytes, safeJsonParse };
