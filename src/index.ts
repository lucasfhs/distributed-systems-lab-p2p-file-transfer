import { TP2Torrent, FileType } from "./core/TorrentFileHandler";
import { FileManager } from "./core/FileManager";

async function main() {
    const metadata = await TP2Torrent.create('test/files/text-input.txt', FileType.SIZE_1KB);

    const seeder = new FileManager(metadata, 'test/files');
    const leecher = new FileManager(metadata, 'downloads');

    console.log('Total de chunks:', metadata.totalChunks);

    for (let i = 0; i < metadata.totalChunks; i++) {
        const chunk = await seeder.readChunk(i);
        const ok = leecher.saveChunk(i, chunk);

        console.log(`Chunk ${i}:`, ok ? 'OK' : 'FALHOU');
    }

    console.log('Download completo:', leecher.isComplete());
}

main();