/**
 * WeCom Message Encryption/Decryption (WXBizMsgCrypt)
 *
 * Implements the WeCom/WeChat message encryption protocol.
 * Based on official WeChat cryptographic message library.
 */

import * as crypto from 'crypto';

export class WeComCrypto {
  private token: string;
  private encodingAESKey: string;
  private aesKey: Buffer;

  constructor(token: string, encodingAESKey: string) {
    this.token = token;
    this.encodingAESKey = encodingAESKey;
    this.aesKey = Buffer.from(encodingAESKey + '=', 'base64');
  }

  /**
   * Decrypt incoming encrypted message from WeCom.
   */
  decodeMessage(msgSignature: string, timestamp: string, nonce: string, encrypt: string): any {
    // Verify signature
    const signContent = [this.token, timestamp, nonce, encrypt].sort().join('');
    const sha1 = crypto.createHash('sha1').update(signContent).digest('hex');

    if (sha1 !== msgSignature) {
      throw new Error('Invalid signature');
    }

    // Decrypt AES message
    const ciphertext = Buffer.from(encrypt, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.aesKey, this.aesKey.slice(0, 16));
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Remove PKCS#7 padding
    const pad = decrypted[decrypted.length - 1];
    decrypted = decrypted.slice(0, decrypted.length - pad);

    // Parse XML
    const xml = decrypted.toString('utf-8');
    const parsed = this.parseXML(xml);
    return parsed;
  }

  /**
   * Generate encrypted reply for WeCom.
   */
  encodeMessage(reply: string, nonce: string): string {
    const text = `<xml><Encrypt><![CDATA[${this.encrypt(reply)}]]></Encrypt><MsgSignature><![CDATA[${this.calculateMsgSignature(nonce)}]]></MsgSignature><TimeStamp><![CDATA[${Date.now()}]]></TimeStamp><Nonce><![CDATA[${nonce}]]></Nonce></xml>`;
    return text;
  }

  private encrypt(text: string): string {
    const textBuffer = Buffer.from(text, 'utf-8');

    // PKCS#7 padding
    const blockSize = 32;
    const padSize = blockSize - (textBuffer.length % blockSize);
    const padding = Buffer.alloc(padSize, padSize);
    const padded = Buffer.concat([textBuffer, padding]);

    const cipher = crypto.createCipheriv('aes-256-cbc', this.aesKey, this.aesKey.slice(0, 16));
    let encrypted = cipher.update(padded);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('base64');
  }

  private calculateMsgSignature(nonce: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signContent = [this.token, timestamp, nonce, ''].sort().join('');
    return crypto.createHash('sha1').update(signContent).digest('hex');
  }

  private parseXML(xml: string): any {
    const match = xml.match(/<xml>([\s\S]*?)<\/xml>/);
    if (!match) return {};

    const content = match[1];
    const result: any = {};
    const regex = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let execResult;

    while ((execResult = regex.exec(content)) !== null) {
      const [, key, value] = execResult;
      result[key] = value.trim();
    }

    return result;
  }
}
