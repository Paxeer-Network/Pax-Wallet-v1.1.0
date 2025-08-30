import CryptoJS from 'crypto-js';

export class PinService {
  private static readonly PIN_HASH_KEY = "paxeer_pin_hash";
  private static readonly SESSION_KEY = "paxeer_session";
  private static readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  static setPIN(pin: string): void {
    const salt = CryptoJS.lib.WordArray.random(128/8);
    const hash = CryptoJS.PBKDF2(pin, salt, {
      keySize: 512/32,
      iterations: 10000
    });
    
    const pinData = {
      hash: hash.toString(),
      salt: salt.toString()
    };
    
    localStorage.setItem(this.PIN_HASH_KEY, JSON.stringify(pinData));
    this.createSession();
  }

  static verifyPIN(pin: string): boolean {
    const pinDataStr = localStorage.getItem(this.PIN_HASH_KEY);
    if (!pinDataStr) return false;

    try {
      const pinData = JSON.parse(pinDataStr);
      const salt = CryptoJS.enc.Hex.parse(pinData.salt);
      const hash = CryptoJS.PBKDF2(pin, salt, {
        keySize: 512/32,
        iterations: 10000
      });

      const isValid = hash.toString() === pinData.hash;
      if (isValid) {
        this.createSession();
      }
      return isValid;
    } catch (error) {
      console.error('PIN verification error:', error);
      return false;
    }
  }

  static hasPIN(): boolean {
    return localStorage.getItem(this.PIN_HASH_KEY) !== null;
  }

  static isSessionValid(): boolean {
    const sessionStr = localStorage.getItem(this.SESSION_KEY);
    if (!sessionStr) return false;

    try {
      const session = JSON.parse(sessionStr);
      const now = Date.now();
      return now < session.expiresAt;
    } catch (error) {
      return false;
    }
  }

  static createSession(): void {
    const session = {
      createdAt: Date.now(),
      expiresAt: Date.now() + this.SESSION_TIMEOUT
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }

  static extendSession(): void {
    if (this.isSessionValid()) {
      this.createSession();
    }
  }

  static clearPIN(): void {
    localStorage.removeItem(this.PIN_HASH_KEY);
    this.clearSession();
  }

  static getSessionTimeRemaining(): number {
    const sessionStr = localStorage.getItem(this.SESSION_KEY);
    if (!sessionStr) return 0;

    try {
      const session = JSON.parse(sessionStr);
      const remaining = session.expiresAt - Date.now();
      return Math.max(0, remaining);
    } catch (error) {
      return 0;
    }
  }
}