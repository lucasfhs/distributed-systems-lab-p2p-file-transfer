import { TP2Torrent, FileType } from '@/core/TorrentFileHandler';
import { PeerFactory } from '@/core/PeerFactory';
import { Logger } from '@/utils/Logger';

const appLogger = new Logger('App');

const ARCHIVE_PATH = 'test/files/lorem-ipsum.txt';
const CHUNK_SIZE = FileType.SIZE_1KB;
const PEER_COUNT = 10;
const PORT_RANGE = { min: 5000, max: 6000 };
const SEEDER_PORT = 4000;

async function main() {
    appLogger.info('Starting P2P Transfer Test...');
    appLogger.info(`Archive path: ${ARCHIVE_PATH}`);
    appLogger.info(`Chunk size: ${CHUNK_SIZE}`);
    appLogger.info(`Peer count: ${PEER_COUNT}`);
    appLogger.info(`Port range: ${PORT_RANGE.min}-${PORT_RANGE.max}`);
    appLogger.info(`Seeder port: ${SEEDER_PORT}`);

    const metadata = await TP2Torrent.create(
        ARCHIVE_PATH,
        CHUNK_SIZE
    );

    appLogger.info(`Total chunks: ${metadata.totalChunks}`);

    const factory = new PeerFactory(metadata);

    factory.createSeeder(SEEDER_PORT, 'test/files');

    factory.createAutoPeers(PEER_COUNT, PORT_RANGE, [
        { host: '127.0.0.1', port: SEEDER_PORT }
    ]);
}

main();