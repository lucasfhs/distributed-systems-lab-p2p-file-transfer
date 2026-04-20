import net, { Socket } from 'net';
import {
    Message,
    MessageSerializer,
    MessageUtils,
    PeerAddress
} from '../protocol/Message';
import { FileManager } from './FileManager';
import { TP2Metadata } from './TorrentFileHandler';

type PeerStats = {
    bytesReceived: number;
    lastUpdate: number;
    speed: number;
};

export class Peer {
    private port: number;
    private metadata: TP2Metadata;
    private fileManager: FileManager;

    private server: net.Server;

    private knownPeers: Set<string> = new Set();
    private connections: Map<string, Socket> = new Map();

    private requestedChunks: Set<number> = new Set();

    private peerStats: Map<string, PeerStats> = new Map();
    private preferredPeers: Socket[] = [];

    private isCompleted = false;

    private maxConnections = 6;
    private maxDownloadRequests = 10;
    private maxUploadSlots = 3;

    private activeUploads = 0;

    constructor(port: number, metadata: TP2Metadata, fileManager: FileManager) {
        this.port = port;
        this.metadata = metadata;
        this.fileManager = fileManager;
        this.server = net.createServer(this.handleConnection.bind(this));
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`[Peer ${this.port}] Listening...`);
        });

        if (this.fileManager.isComplete()) {
            this.markAsComplete('startup');
        }

        setInterval(() => this.downloadLoop(), 300);
        setInterval(() => this.rotatePeers(), 5000);
    }

    connectToPeer(address: PeerAddress) {
        const key = `${address.host}:${address.port}`;

        if (this.connections.has(key)) return;
        if (this.connections.size >= this.maxConnections) return;
        if (key === `127.0.0.1:${this.port}`) return;

        const socket = net.createConnection(address.port, address.host, () => {
            console.log(`[Peer ${this.port}] Connected to ${key}`);
            this.send(socket, MessageUtils.createHello(this.metadata.infoHash));
        });

        this.setupSocket(socket, key);
        this.knownPeers.add(key);
    }

    private handleConnection(socket: Socket) {
        const key = this.getSocketId(socket);
        this.setupSocket(socket, key);
    }

    private setupSocket(socket: Socket, key: string) {
        this.connections.set(key, socket);

        let buffer = '';

        socket.on('data', (data) => {
            buffer += data.toString();

            const parts = buffer.split('\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
                if (!part.trim()) continue;

                const message = MessageSerializer.decode(part);
                this.handleMessage(socket, message);
            }
        });

        socket.on('close', () => this.connections.delete(key));
        socket.on('error', () => this.connections.delete(key));
    }

    private async handleMessage(socket: Socket, message: Message) {
        switch (message.type) {
            case 'HELLO':
                if (message.infoHash !== this.metadata.infoHash) return;

                this.send(socket, MessageUtils.createBitfield(this.fileManager.getOwnedChunks()));
                this.send(socket, MessageUtils.createPeers(this.getKnownPeers()));
                break;

            case 'PEERS':
                for (const peer of message.peers) {
                    const key = `${peer.host}:${peer.port}`;
                    if (!this.knownPeers.has(key)) {
                        this.knownPeers.add(key);
                        this.connectToPeer(peer);
                    }
                }
                break;

            case 'BITFIELD':
                break;

            case 'REQUEST':
                if (!this.fileManager.hasChunk(message.index)) return;
                if (this.activeUploads >= this.maxUploadSlots) return;

                this.activeUploads++;

                const chunk = await this.fileManager.readChunk(message.index);

                console.log(
                    `[Peer ${this.port}] ➡ chunk ${message.index} to ${this.getSocketId(socket)}`
                );

                this.send(socket, MessageUtils.createPiece(message.index, chunk));

                this.activeUploads--;
                break;

            case 'PIECE':
                const data = MessageUtils.parsePieceData(message.data);
                const ok = this.fileManager.saveChunk(message.index, data);

                if (ok) {
                    const from = this.getSocketId(socket);

                    console.log(
                        `[Peer ${this.port}] ⬅ chunk ${message.index} from ${from}`
                    );

                    this.updateStats(from, data.length);

                    this.requestedChunks.delete(message.index);

                    this.broadcast(MessageUtils.createHave(message.index));

                    this.checkCompletion();
                }
                break;

            case 'HAVE':
                if (!this.fileManager.hasChunk(message.index) &&
                    !this.requestedChunks.has(message.index)) {

                    const socketId = this.getSocketId(socket);

                    this.requestedChunks.add(message.index);
                    this.send(socket, MessageUtils.createRequest(message.index));
                }
                break;
        }
    }

    private downloadLoop() {
        if (this.requestedChunks.size >= this.maxDownloadRequests) return;

        const missing = this.fileManager
            .getMissingChunks()
            .sort(() => Math.random() - 0.5);

        const sockets = this.preferredPeers.length > 0
            ? this.preferredPeers
            : Array.from(this.connections.values());

        for (const index of missing) {
            if (this.requestedChunks.has(index)) continue;

            if (this.requestedChunks.size >= this.maxDownloadRequests) break;
            if (sockets.length === 0) return;

            const socket = sockets[Math.floor(Math.random() * sockets.length)];

            this.requestedChunks.add(index);
            this.send(socket, MessageUtils.createRequest(index));
        }
    }

    private rotatePeers() {
        const entries = Array.from(this.connections.entries());

        const sorted = entries.sort((a, b) => {
            const speedA = this.peerStats.get(a[0])?.speed || 0;
            const speedB = this.peerStats.get(b[0])?.speed || 0;
            return speedB - speedA;
        });

        this.preferredPeers = sorted
            .slice(0, 2)
            .map(([_, socket]) => socket);
    }

    private updateStats(peerId: string, bytes: number) {
        const now = Date.now();

        const stats = this.peerStats.get(peerId) || {
            bytesReceived: 0,
            lastUpdate: now,
            speed: 0
        };

        stats.bytesReceived += bytes;

        const deltaTime = (now - stats.lastUpdate) / 1000;

        if (deltaTime > 0) {
            stats.speed = stats.bytesReceived / deltaTime;
        }

        stats.lastUpdate = now;

        this.peerStats.set(peerId, stats);
    }

    private getSocketId(socket: Socket): string {
        const address = socket.remoteAddress?.replace('::ffff:', '');
        const port = socket.remotePort;
        return `${address}:${port}`;
    }

    private send(socket: Socket, message: Message) {
        socket.write(MessageSerializer.encode(message));
    }

    private broadcast(message: Message) {
        for (const socket of this.connections.values()) {
            this.send(socket, message);
        }
    }

    private getKnownPeers(): PeerAddress[] {
        return Array.from(this.knownPeers).map((p) => {
            const [host, port] = p.split(':');
            return { host, port: Number(port) };
        });
    }

    private checkCompletion() {
        if (!this.isCompleted && this.fileManager.isComplete()) {
            this.markAsComplete('download');
        }
    }

    private markAsComplete(origin: 'download' | 'startup') {
        if (this.isCompleted) return;

        this.isCompleted = true;

        if (origin === 'startup') {
            console.log(`[Peer ${this.port}] Seeder (already complete)`);
        } else {
            console.log(`[Peer ${this.port}] DOWNLOAD COMPLETED`);
        }
    }
}