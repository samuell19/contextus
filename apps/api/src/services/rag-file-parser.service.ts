import path from 'node:path';
import { PDFParse } from 'pdf-parse';

import { AppError } from '../common/http.js';

const textDecoder = new TextDecoder('utf-8', { fatal: false });

export class RagFileParserService {
  public async parse(input: { fileName: string; mimeType: string; buffer: Buffer }) {
    const extension = path.extname(input.fileName).toLowerCase();
    const mimeType = input.mimeType.toLowerCase();

    console.info('[RAG] Parsing source file', {
      fileName: input.fileName,
      mimeType,
      extension,
      sizeBytes: input.buffer.byteLength
    });

    if (this.isTextLike(extension, mimeType)) {
      const content = textDecoder.decode(input.buffer).trim();

      if (!content) {
        throw new AppError(400, 'Arquivo vazio para indexacao RAG');
      }

      console.info('[RAG] Text parsing successful', {
        fileName: input.fileName,
        chars: content.length
      });

      return content;
    }

    if (mimeType === 'application/pdf' || extension === '.pdf') {
      const parser = new PDFParse({ data: new Uint8Array(input.buffer) });
      const parsed = await parser.getText();
      await parser.destroy();
      const content = (parsed.text ?? '').trim();

      if (!content) {
        throw new AppError(400, 'Nao foi possivel extrair texto do PDF');
      }

      console.info('[RAG] PDF parsing successful', {
        fileName: input.fileName,
        chars: content.length,
        pages: parsed.total
      });

      return content;
    }

    throw new AppError(
      400,
      'Formato nao suportado para RAG. Use txt, md, csv, json ou pdf'
    );
  }

  private isTextLike(extension: string, mimeType: string) {
    return (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/csv' ||
      ['.txt', '.md', '.csv', '.json'].includes(extension)
    );
  }
}
