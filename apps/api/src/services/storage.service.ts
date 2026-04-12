import fs from 'node:fs/promises';
import path from 'node:path';

export class StorageService {
  private readonly avatarRootDir = path.resolve(process.cwd(), 'storage', 'agent-avatars');
  private readonly knowledgeRootDir = path.resolve(process.cwd(), 'storage', 'knowledge-sources');

  public async ensureBaseDirs() {
    await fs.mkdir(this.avatarRootDir, { recursive: true });
    await fs.mkdir(this.knowledgeRootDir, { recursive: true });
  }

  public async saveAgentAvatar(input: {
    userId: string;
    agentId: string;
    originalName: string;
    buffer: Buffer;
  }) {
    await this.ensureBaseDirs();

    const extension = path.extname(input.originalName) || '.bin';
    const directory = path.join(this.avatarRootDir, input.userId);
    const fileName = `${input.agentId}-${Date.now()}${extension}`;
    const absolutePath = path.join(directory, fileName);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(absolutePath, input.buffer);

    return absolutePath;
  }

  public async saveKnowledgeSource(input: {
    userId: string;
    agentId: string;
    sourceId: string;
    originalName: string;
    buffer: Buffer;
  }) {
    await this.ensureBaseDirs();

    const extension = path.extname(input.originalName) || '.txt';
    const directory = path.join(this.knowledgeRootDir, input.userId, input.agentId);
    const fileName = `${input.sourceId}${extension}`;
    const absolutePath = path.join(directory, fileName);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(absolutePath, input.buffer);

    return absolutePath;
  }

  public async removeFileIfExists(filePath: string | null | undefined) {
    if (!filePath) {
      return;
    }

    try {
      await fs.unlink(filePath);
    } catch {
      return;
    }
  }
}
