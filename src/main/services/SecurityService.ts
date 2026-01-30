export class SecurityService {
  static encrypt(text: string): string {
    return Buffer.from(text).toString('base64')
  }
  static decrypt(cipherText: string): string {
    try {
      return Buffer.from(cipherText, 'base64').toString('utf8')
    } catch (e) {
      return '[Decryption Error]'
    }
  }
  static sanitizeForLog(data: any): any {
    if (typeof data === 'string') return '[REDACTED]'
    if (data && typeof data === 'object') {
      const sanitized = { ...data }
      if ('body' in sanitized) sanitized.body = '[REDACTED]'
      return sanitized
    }
    return data
  }
}
