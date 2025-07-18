import * as crypto from 'crypto';
import { config } from "../config";

const secretKey = config.encryptToken;

// Función para convertir Base64 a Base64URL (solo alfanumérico)
const toBase64URL = (base64: string): string => {
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// Función para convertir Base64URL a Base64
const fromBase64URL = (base64url: string): string => {
  let base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Agregar padding si es necesario
  while (base64.length % 4) {
    base64 += '=';
  }
  
  return base64;
};

export const encryptPhoneNumber = (phoneNumber: string): string => {
  if (!secretKey) {
    throw new Error("encryptToken (secretKey) is undefined. Verifica tu configuración.");
  }
  
  const iv = crypto.randomBytes(16);
  const key = crypto
    .createHash('sha256')
    .update(secretKey)
    .digest('base64')
    .substring(0, 32);
  
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(phoneNumber, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Convertir a formato alfanumérico
  const ivBase64URL = toBase64URL(iv.toString('base64'));
  const encryptedBase64URL = toBase64URL(encrypted);
  
  return `${ivBase64URL}.${encryptedBase64URL}`;
};