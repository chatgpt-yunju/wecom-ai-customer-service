import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { KnowledgeBase } from '../models/KnowledgeBase';
import { KbChunk } from '../models/KbChunk';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export class KnowledgeController {
  async upload(req: any, res: Response) {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No file' });
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, file.originalname);
      fs.writeFileSync(filePath, file.buffer);
      const kb = AppDataSource.getRepository(KnowledgeBase).create({ name: file.originalname, fileName: file.originalname, filePath, fileType: file.mimetype, fileSize: file.size, status: 'processing' });
      await AppDataSource.getRepository(KnowledgeBase).save(kb);
      this.processFile(kb.id, filePath, file.mimetype).catch(console.error);
      res.json({ id: kb.id, name: kb.name, status: 'processing' });
    } catch (error) {
      res.status(500).json({ error: 'Upload failed' });
    }
  }
  async list(req: Request, res: Response) {
    const list = await AppDataSource.getRepository(KnowledgeBase).find({ order: { createdAt: 'DESC' } });
    res.json({ knowledge_base: list });
  }
  private async processFile(kbId: number, filePath: string, mimeType: string) {
    try {
      let text: string;
      if (mimeType === 'application/pdf') {
        const data = await pdf.fromFile(filePath);
        text = data.text;
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else {
        text = fs.readFileSync(filePath, 'utf-8');
      }
      const chunks = this.chunkText(text);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = AppDataSource.getRepository(KbChunk).create({ kbId, chunkIndex: i, content: chunks[i] });
        await AppDataSource.getRepository(KbChunk).save(chunk);
      }
      const kb = await AppDataSource.getRepository(KnowledgeBase).findOneBy({ id: kbId });
      if (kb) {
        kb.chunkCount = chunks.length;
        kb.status = 'ready';
        await AppDataSource.getRepository(KnowledgeBase).save(kb);
      }
    } catch (error) {
      const kb = await AppDataSource.getRepository(KnowledgeBase).findOneBy({ id: kbId });
      if (kb) { kb.status = 'error'; await AppDataSource.getRepository(KnowledgeBase).save(kb); }
    }
  }
  private chunkText(text: string, chunkSize: number = 1000): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = '';
    for (const sentence of sentences) {
      if (current.length + sentence.length > chunkSize) { if (current) chunks.push(current); current = sentence; } else { current += ' ' + sentence; }
    }
    if (current) chunks.push(current);
    return chunks;
  }
}
