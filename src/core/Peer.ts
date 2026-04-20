import net, { Socket } from 'net';
import { Message, MessageSerializer, MessageUtils, PeerAddress } from '../protocol/Message';
import { FileManager } from './FileManager';
import { TP2Metadata } from './TorrentFileHandler';

export class Peer {
    private port: number;
    private metadata: TP2Metadata;
    private fileManager: FileManager;

    private server: net.Server;
    private maxRequestsPerPeer = 3;
    private inFlightRequests: Map<string, number> = new Map();
    private knownPeers: Set<string> = new Set();
    private connections: Map<string, Socket> = new Map();
    private requestedChunks: Set<number> = new Set();
    private isCompleted = false;
    private maxConnections = 5;

    constructor(port: number, metadata: TP2Metadata, fileManager: FileManager) {
        this.port = port;
        this.metadata = metadata;
        this.fileManager = fileManager;
        this.server = net.createServer(this.handleConnection.bind(this));
    }

    private checkCompletion() {
        if (!this.isCompleted && this.fileManager.isComplete()) {
            this.isCompleted = true;

            console.log(`[Peer ${this.port}] DOWNLOAD COMPLETED`);
        }
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`[Peer ${this.port}] Listening...`);
        });

        if (this.fileManager.isComplete()) {
            this.isCompleted = true;
            console.log(`[Peer ${this.port}] Already has full file (Seeder)`);
        }
        setInterval(() => this.downloadLoop(), 500);
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
        const key = `${socket.remoteAddress}:${socket.remotePort}`;
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
                for (const index of message.chunks) {
                    if (!this.fileManager.hasChunk(index) && !this.requestedChunks.has(index)) {
                        this.requestedChunks.add(index);
                        this.send(socket, MessageUtils.createRequest(index));
                    }
                }
                break;

            case 'REQUEST':
                if (!this.fileManager.hasChunk(message.index)) return;

                const chunk = await this.fileManager.readChunk(message.index);
                this.send(socket, MessageUtils.createPiece(message.index, chunk));
                break;

            case 'PIECE':
                const data = MessageUtils.parsePieceData(message.data);
                const ok = this.fileManager.saveChunk(message.index, data);

                if (ok) {
                    const from = this.getSocketId(socket);
                    console.log(`[Peer ${this.port}] Received chunk ${message.index} from ${from}`);

                    this.requestedChunks.delete(message.index);

                    const key = `${socket.remoteAddress}:${socket.remotePort}`;
                    const current = this.inFlightRequests.get(key) || 1;
                    this.inFlightRequests.set(key, Math.max(0, current - 1));

                    this.broadcast(MessageUtils.createHave(message.index));

                    this.checkCompletion();
                }
                break;

            case 'HAVE':
                if (!this.fileManager.hasChunk(message.index) && !this.requestedChunks.has(message.index)) {
                    this.requestedChunks.add(message.index);
                    this.send(socket, MessageUtils.createRequest(message.index));
                }
                break;
        }
    }

    private downloadLoop() {
        const missing = this.fileManager.getMissingChunks();

        for (const [key, socket] of this.connections.entries()) {
            let inFlight = this.inFlightRequests.get(key) || 0;

            for (const index of missing) {
                if (inFlight >= this.maxRequestsPerPeer) break;

                if (!this.requestedChunks.has(index)) {
                    this.requestedChunks.add(index);

                    this.send(socket, MessageUtils.createRequest(index));

                    inFlight++;
                }
            }

            this.inFlightRequests.set(key, inFlight);
        }
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

    private getSocketId(socket: Socket): string {
        const address = socket.remoteAddress?.replace('::ffff:', '');
        const port = socket.remotePort;
        return `${address}:${port}`;
    }
}