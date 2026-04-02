/**
 * Knowledge Service
 *
 * Handles knowledge base document upload, processing, chunking, and retrieval.
 * Note: Full RAG implementation with embeddings is not yet complete.
 */

import { AppDataSource } from '../config/database';
import { KnowledgeBase } from '../models/KnowledgeBase';
import { KbChunk } from '../models/KbChunk';
import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import type { KnowledgeDocument, KnowledgeQueryResult, KnowledgeChunk } from '../skill/types';

export class KnowledgeService {
  private uploadsDir: string;

  constructor(
    private dataSource: typeof AppDataSource,
    private enableRetrieval: boolean = true
  ) {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Upload and process a document.
   */
  async uploadDocument(file: Express.Multer.File, description?: string): Promise<KnowledgeDocument> {
    const kbRepo = this.dataSource.getRepository(KnowledgeBase);

    const filePath = path.join(this.uploadsDir, file.originalname);
    fs.writeFileSync(filePath, file.buffer);

    const kb = kbRepo.create({
      name: file.originalname,
      description,
      fileName: file.originalname,
      filePath,
      fileType: file.mimetype,
      fileSize: file.size,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await kbRepo.save(kb);

    // Process asynchronously
    this.processFile(kb.id, filePath, file.mimetype).catch((error) => {
      console.error('Knowledge base processing failed:', error);
      this.markError(kb.id);
    });

    return this.mapDocument(kb);
  }

  /**
   * Get document by ID.
   */
  async getDocument(documentId: string): Promise<KnowledgeDocument | null> {
    const kbRepo = this.dataSource.getRepository(KnowledgeBase);
    const kb = await kbRepo.findOneBy({ id: parseInt(documentId) });
    if (!kb) return null;
    return this.mapDocument(kb);
  }

  /**
   * List all documents with pagination.
   */
  async listDocuments(page: number = 1, limit: number = 50): Promise<{ documents: KnowledgeDocument[]; total: number }> {
    const kbRepo = this.dataSource.getRepository(KnowledgeBase);
    const [documents, total] = await kbRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      documents: documents.map(this.mapDocument),
      total,
    };
  }

  /**
   * Delete a document and its chunks.
   */
  async deleteDocument(documentId: string): Promise<void> {
    const kbRepo = this.dataSource.getRepository(KnowledgeBase);
    const chunkRepo = this.dataSource.getRepository(KbChunk);

    const kb = await kbRepo.findOneBy({ id: parseInt(documentId) });
    if (!kb) return;

    // Delete chunks
    await chunkRepo.delete({ kbId: kb.id });

    // Delete file
    try {
      if (fs.existsSync(kb.filePath)) {
        fs.unlinkSync(kb.filePath);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }

    // Delete record
    await kbRepo.remove(kb);
  }

  /**
   * Query knowledge base for relevant chunks.
   * This is a simple text-match retrieval; full RAG with embeddings is future work.
   */
  async queryKnowledge(query: string, topK: number = 5): Promise<KnowledgeQueryResult> {
    if (!this.enableRetrieval) {
      return { chunks: [], scores: [], metadata: { totalChunks: 0, queryTime: 0 } };
    }

    const startTime = Date.now();
    const chunkRepo = this.dataSource.getRepository(KbChunk);

    // Simple keyword-based retrieval (placeholder)
    // In production, this should use pgvector similarity search
    const allChunks = await chunkRepo
      .createQueryBuilder('chunk')
      .leftJoinAndSelect('chunk.kb', 'kb')
      .where('kb.status = :status', { status: 'ready' })
      .orderBy('chunk.createdAt', 'DESC')
      .limit(topK * 2) // Get extra and filter
      .getMany();

    // Score based on keyword overlap (very naive)
    const queryTerms = query.toLowerCase().split(/\s+/);
    const scored = allChunks
      .map((chunk) => {
        const content = chunk.content.toLowerCase();
        const score = queryTerms.reduce((sum, term) => sum + (content.includes(term) ? 1 : 0), 0);
        return { chunk, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const queryTime = Date.now() - startTime;

    return {
      chunks: scored.map(item => this.mapChunk(item.chunk)),
      scores: scored.map(item => item.score),
      metadata: {
        totalChunks: allChunks.length,
        queryTime,
      },
    };
  }

  /**
   * Reprocess a document (re-chunk after edit).
   */
  async reprocessDocument(documentId: string): Promise<void> {
    const kbRepo = this.dataSource.getRepository(KnowledgeBase);
    const chunkRepo = this.dataSource.getRepository(KbChunk);

    const kb = await kbRepo.findOneBy({ id: parseInt(documentId) });
    if (!kb || !fs.existsSync(kb.filePath)) {
      throw new Error('Document not found or file missing');
    }

    // Delete existing chunks
    await chunkRepo.delete({ kbId: kb.id });

    // Reprocess
    kb.status = 'processing';
    kb.chunkCount = 0;
    await kbRepo.save(kb);

    this.processFile(kb.id, kb.filePath, kb.fileType).catch((error) => {
      console.error('Reprocessing failed:', error);
      this.markError(kb.id);
    });
  }

  /**
   * Process file: extract text, chunk, save to DB.
   */
  private async processFile(kbId: number, filePath: string, mimeType: string): Promise<void> {
    try {
      let text: string;

      if (mimeType === 'application/pdf') {
        const data = await pdf.fromFile(filePath);
        text = data.text;
      } else if (mimeType.includes('word') || mimeType.includes('document') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else {
        // Assume text file
        text = fs.readFileSync(filePath, 'utf-8');
      }

      const chunks = this.chunkText(text);

      const chunkRepo = this.dataSource.getRepository(KbChunk);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunkRepo.create({
          kbId,
          chunkIndex: i,
          content: chunks[i],
          createdAt: new Date(),
        });
        await chunkRepo.save(chunk);
      }

      // Update KB status
      const kbRepo = this.dataSource.getRepository(KnowledgeBase);
      const kb = await kbRepo.findOneBy({ id: kbId });
      if (kb) {
        kb.chunkCount = chunks.length;
        kb.status = 'ready';
        kb.updatedAt = new Date();
        await kbRepo.save(kb);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      this.markError(kbId);
    }
  }

  /**
   * Mark document as error.
   */
  private async markError(kbId: number): Promise<void> {
    const kbRepo = this.dataSource.getRepository(KnowledgeBase);
    const kb = await kbRepo.findOneBy({ id: kbId });
    if (kb) {
      kb.status = 'error';
      kb.updatedAt = new Date();
      await kbRepo.save(kb);
    }
  }

  /**
   * Split text into chunks (~1000 chars, sentence-aware).
   */
  private chunkText(text: string, chunkSize: number = 1000): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      if (current.length + sentence.length > chunkSize) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current += (current ? ' ' : '') + sentence;
      }
    }

    if (current) chunks.push(current.trim());
    return chunks;
  }

  /**
   * Map ORM KnowledgeBase entity to API type.
   */
  private mapDocument(kb: KnowledgeBase): KnowledgeDocument {
    return {
      id: kb.id.toString(),
      name: kb.name,
      description: kb.description,
      fileName: kb.fileName,
      filePath: kb.filePath,
      fileType: kb.fileType,
      fileSize: kb.fileSize,
      status: kb.status as 'processing' | 'ready' | 'error',
      chunkCount: kb.chunkCount,
      createdAt: kb.createdAt,
      updatedAt: kb.updatedAt,
    };
  }

  /**
   * Map ORM KbChunk entity to API type.
   */
  private mapChunk(chunk: KbChunk): KnowledgeChunk {
    return {
      id: chunk.id.toString(),
      documentId: chunk.kbId.toString(),
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      tokenCount: chunk.tokenCount || 0,
      embedding: chunk.embedding,
      createdAt: chunk.createdAt,
    };
  }
}
