import { TP2Torrent } from '@/core/TorrentFileHandler';
import { PeerFactory } from '@/core/PeerFactory';
import { Logger } from '@/utils/Logger';
import { FileKey, Variation, chooseVariationTest } from '@/utils/TestConfigs';

const appLogger = new Logger('App');

/**
 * Seleção do cenário de teste conforme o enunciado.
 *
 * - fileKey: define o tamanho do arquivo:
 *   FILE_A (10KB - variação 1 / 20KB - variação 2)
 *   FILE_B (1MB - variação 1 / 5MB - variação 2)
 *   FILE_C (10MB - variação 1 / 20MB - variação 2)
 *
 * - Obs: A variação define:
 *   V1 → cenário base (2 peers, blocos de 1KB)
 *   V2 → cenário de variação (4 peers, blocos de 4KB)
 *
 * Altere esses valores para executar diferentes combinações de teste.
 */
const fileKey: FileKey     = FileKey.FILE_A;
const variation: Variation = Variation.V1;

const config       = chooseVariationTest(fileKey, variation);
const ARCHIVE_PATH = config.archivePath;
const CHUNK_SIZE   = config.chunkSize;
const PEER_COUNT   = config.peerCount;
const PORT_RANGE   = config.portRange;
const SEEDER_PORT  = config.seederPort;

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

    // Obs: Desconta um do PEER_COUNT visto que o SEEDER está presente sempre no inicio do swarm.
    factory.createAutoPeers(PEER_COUNT - 1, PORT_RANGE, [
        { host: '127.0.0.1', port: SEEDER_PORT }
    ]);
}

main();