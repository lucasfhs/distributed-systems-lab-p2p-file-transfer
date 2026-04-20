import { TP2Torrent, FileType } from './core/TorrentFileHandler';
import { FileManager } from './core/FileManager';
import { Peer } from './core/Peer';

async function main() {
    const metadata = await TP2Torrent.create(
        'test/files/text-input.txt',
        FileType.SIZE_1KB
    );

    console.log('Total chunks:', metadata.totalChunks);

    const peerA = new Peer(
        4000,
        metadata,
        new FileManager(metadata, 'test/files')
    );

    const peerB = new Peer(
        5000,
        metadata,
        new FileManager(metadata, 'downloads1')
    );

    const peerC = new Peer(
        6000,
        metadata,
        new FileManager(metadata, 'downloads2')
    );

    peerA.start();
    peerB.start();
    peerC.start();

    setTimeout(() => {
        peerB.connectToPeer({ host: '127.0.0.1', port: 4000 });
        peerC.connectToPeer({ host: '127.0.0.1', port: 4000 });
        peerC.connectToPeer({ host: '127.0.0.1', port: 5000 });
    }, 500);
}

main();