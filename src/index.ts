import { TP2Torrent, FileType } from '@/core/TorrentFileHandler';
import { PeerFactory } from '@/core/PeerFactory';

const ARCHIVE_PATH = 'test/files/text-input.txt';
const CHUNK_SIZE = FileType.SIZE_1KB;
const PEER_COUNT = 10;
const PORT_RANGE = { min: 5000, max: 6000 };
const SEEDER_PORT = 4000;

async function main() {
    const metadata = await TP2Torrent.create(
        ARCHIVE_PATH,
        CHUNK_SIZE
    );

    console.log('Total chunks:', metadata.totalChunks);

    const factory = new PeerFactory(metadata);

    factory.createSeeder(SEEDER_PORT, 'test/files');

    factory.createAutoPeers(PEER_COUNT, PORT_RANGE, [
        { host: '127.0.0.1', port: SEEDER_PORT }
    ]);
}

main();