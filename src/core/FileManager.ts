import { createReadStream, openSync, writeSync, closeSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { TP2Metadata } from './TorrentFileHandler';

export class FileManager {
    private metadata: TP2Metadata;
    private filePath: string;
    private received: Set<number> = new Set();

    constructor(metadata: TP2Metadata, basePath: string) {
        this.metadata = metadata;
        this.filePath = path.join(basePath, metadata.name);

        if (!existsSync(basePath)) {
            mkdirSync(basePath, { recursive: true });
        }

        if (!existsSync(this.filePath)) {
            writeFileSync(this.filePath, Buffer.alloc(metadata.size));
        } else {
            for (let i = 0; i < metadata.totalChunks; i++) {
                this.received.add(i);
            }
        }
    }

    async readChunk(index: number): Promise<Buffer> {
        const start = index * this.metadata.chunkSize;
        const end = Math.min(start + this.metadata.chunkSize - 1, this.metadata.size - 1);

        return new Promise((resolve, reject) => {
            const stream = createReadStream(this.filePath, { start, end });

            const chunks: Buffer[] = [];

            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    }

    validateChunk(index: number, data: Buffer): boolean {
        const expectedHash = this.metadata.chunkHashes[index];
        const hash = createHash('sha256').update(data).digest('hex');
        return hash === expectedHash;
    }

    saveChunk(index: number, data: Buffer): boolean {
        if (!this.validateChunk(index, data)) return false;

        const fd = openSync(this.filePath, 'r+');
        const position = index * this.metadata.chunkSize;

        writeSync(fd, data, 0, data.length, position);
        closeSync(fd);

        this.received.add(index);
        return true;
    }

    hasChunk(index: number): boolean {
        return this.received.has(index);
    }

    getOwnedChunks(): number[] {
        return Array.from(this.received);
    }

    getMissingChunks(): number[] {
        const missing: number[] = [];

        for (let i = 0; i < this.metadata.totalChunks; i++) {
            if (!this.received.has(i)) {
                missing.push(i);
            }
        }

        return missing;
    }

    isComplete(): boolean {
        return this.received.size === this.metadata.totalChunks;
    }
}