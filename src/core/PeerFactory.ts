import { Peer } from '@/core/Peer';
import { FileManager } from '@/core/FileManager';
import { TP2Metadata } from '@/core/TorrentFileHandler';
import { PeerAddress } from '@/protocol/Message';

export class PeerFactory {
    private metadata: TP2Metadata;
    private peers: Peer[] = [];
    private usedPorts: Set<number> = new Set();

    constructor(metadata: TP2Metadata) {
        this.metadata = metadata;
    }

    createSeeder(port: number, basePath: string): Peer {
        this.usedPorts.add(port);

        const peer = new Peer(
            port,
            this.metadata,
            new FileManager(this.metadata, basePath)
        );

        this.peers.push(peer);
        peer.start();

        return peer;
    }

    createAutoPeers(
        amount: number,
        portRange: { min: number; max: number },
        bootstrap: PeerAddress[]
    ) {
        let created = 0;

        for (let port = portRange.min; port <= portRange.max; port++) {
            if (created >= amount) break;
            if (this.usedPorts.has(port)) continue;

            const basePath = `downloads/peer_${port}`;

            const peer = new Peer(
                port,
                this.metadata,
                new FileManager(this.metadata, basePath)
            );

            this.usedPorts.add(port);
            this.peers.push(peer);

            peer.start(bootstrap);

            created++;
        }

        if (created < amount) {
            console.warn('⚠️ Not enough available ports in range');
        }

        this.startCompletionWatcher();
    }

    getPeers(): Peer[] {
        return this.peers;
    }

    private startCompletionWatcher() {
        const interval = setInterval(() => {
            const allCompleted = this.peers.every(
                (peer) => peer.isComplete()
            );

            if (allCompleted) {
                console.log('\n🎉 ALL PEERS COMPLETED\n');

                clearInterval(interval);

                setTimeout(() => process.exit(0), 1000);
            }
        }, 1000);
    }
}