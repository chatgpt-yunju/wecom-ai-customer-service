/**
 * Knowledge Controller (Refactored)
 *
 * Thin HTTP adapter for knowledge base management endpoints.
 */

import { Request, Response } from 'express';
import { KnowledgeService } from '../services/KnowledgeService';
import type { KnowledgeDocument } from '../skill/types';

export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  /**
   * Upload a document to knowledge base.
   */
  async upload(req: any, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file' });
        return;
      }

      const description = req.body.description;
      const document = await this.knowledgeService.uploadDocument(file, description);
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: 'Upload failed' });
    }
  }

  /**
   * List knowledge base documents.
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await this.knowledgeService.listDocuments(page, limit);
      res.json({ knowledge_base: result.documents, total: result.total });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list documents' });
    }
  }
}
