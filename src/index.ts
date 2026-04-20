import { TP2Torrent, FileType } from '@/core/TorrentFileHandler';
import { PeerFactory } from '@/core/PeerFactory';
import { Logger } from '@/utils/Logger';

const logger = new Logger();

const ARCHIVE_PATH = 'test/files/text-input.txt';
const CHUNK_SIZE = FileType.SIZE_1KB;
const PEER_COUNT = 10;
const PORT_RANGE = { min: 5000, max: 6000 };
const SEEDER_PORT = 4000;

async function main() {
    logger.info('Starting P2P Transfer Test...');
    logger.info(`Archive path: ${ARCHIVE_PATH}`);
    logger.info(`Chunk size: ${CHUNK_SIZE}`);
    logger.info(`Peer count: ${PEER_COUNT}`);
    logger.info(`Port range: ${PORT_RANGE.min}-${PORT_RANGE.max}`);
    logger.info(`Seeder port: ${SEEDER_PORT}`);

    const metadata = await TP2Torrent.create(
        ARCHIVE_PATH,
        CHUNK_SIZE
    );

    logger.info(`Total chunks: ${metadata.totalChunks}`);

    const factory = new PeerFactory(metadata);

    factory.createSeeder(SEEDER_PORT, 'test/files');

    factory.createAutoPeers(PEER_COUNT, PORT_RANGE, [
        { host: '127.0.0.1', port: SEEDER_PORT }
    ]);
}

main();