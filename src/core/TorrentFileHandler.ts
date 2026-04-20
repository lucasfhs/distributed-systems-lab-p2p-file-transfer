import { readFileSync, writeFileSync, createReadStream, statSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { Logger } from '@/utils/Logger';

const logger = new Logger();

export type TP2Metadata = {
    name: string;
    size: number;
    chunkSize: number;
    totalChunks: number;
    chunkHashes: string[];
    infoHash: string;
};

export enum FileType {
    SIZE_1KB = 1024,
    SIZE_2KB = 2048,
    SIZE_4KB = 4096,
    SIZE_8KB = 8192,
}

export class TP2Torrent {
    static async create(filePath: string, chunkSize: FileType = FileType.SIZE_1KB): Promise<TP2Metadata> {
        if (!existsSync(filePath)) throw new Error('TP2Torrent: File not found.');

        const stats = statSync(filePath);
        const chunkHashes: string[] = [];
        const fileName = path.basename(filePath);

        return new Promise((resolve, reject) => {
            const stream = createReadStream(filePath, { highWaterMark: chunkSize });

            stream.on('data', (chunk: Buffer) => {
                const hash = createHash('sha256').update(chunk).digest('hex');
                chunkHashes.push(hash);
            });

            stream.on('end', () => {
                const infoHash = createHash('sha1')
                    .update(chunkHashes.join(''))
                    .digest('hex');

                const metadata: TP2Metadata = {
                    name: fileName,
                    size: stats.size,
                    chunkSize,
                    totalChunks: chunkHashes.length,
                    chunkHashes,
                    infoHash
                };

                const torrentPath = `${filePath}.torrent.tp2`;
                writeFileSync(torrentPath, JSON.stringify(metadata, null, 2));

                logger.info(`TP2Torrent: Metadata file generated: ${torrentPath}`);
                resolve(metadata);
            });

            stream.on('error', reject);
        });
    }


    static read(torrentPath: string): TP2Metadata {
        if (!existsSync(torrentPath)) throw new Error('TP2Torrent: File not found.');

        const content = readFileSync(torrentPath, 'utf8');
        const metadata = JSON.parse(content) as TP2Metadata;

        if (!metadata.infoHash || !metadata.chunkHashes) {
            throw new Error('TP2Torrent: Invalid .torrent.tp2 file.');
        }

        return metadata;
    }
}