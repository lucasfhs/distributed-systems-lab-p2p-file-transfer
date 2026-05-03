import net, { Socket } from 'net';
import crypto from 'crypto';
import {
    Message,
    MessageSerializer,
    MessageUtils,
    PeerAddress
} from '@/protocol/Message';
import { FileManager } from '@/core/FileManager';
import { TP2Metadata } from '@/core/TorrentFileHandler';
import { Logger } from '@/utils/Logger';

const appLogger     = new Logger('App');
const messageLogger = new Logger('Message', 'messages.log');

export class Peer {
    private port: number;
    private metadata: TP2Metadata;
    private fileManager: FileManager;

    private peerId = crypto.randomBytes(20).toString('hex');

    private server: net.Server;

    private knownPeers: Set<string> = new Set();
    private connections: Map<string, Socket> = new Map();

    private requestedChunks: Set<number> = new Set();
    private requestTimestamps: Map<number, number> = new Map();

    private maxConnections = 6;
    private maxDownloadRequests = 10;
    private maxUploadSlots = 3;
    private activeUploads = 0;

    private requestTimeout = 3000;

    constructor(port: number, metadata: TP2Metadata, fileManager: FileManager) {
        this.port = port;
        this.metadata = metadata;
        this.fileManager = fileManager;
        this.server = net.createServer(this.handleConnection.bind(this));
    }

    start(bootstrapPeers: PeerAddress[] = []) {
        this.server.listen(this.port, () => {
            appLogger.info(`[Peer ${this.port}] Listening...`);
        });

        if (this.fileManager.isComplete()) {
            appLogger.info(`[Peer ${this.port}] Seeder`);
        }

        bootstrapPeers.forEach(p => this.connectToPeer(p));

        setInterval(() => this.downloadLoop(), 300);

        setInterval(() => {
            this.broadcast(
                MessageUtils.createPeers(this.getKnownPeers())
            );
        }, 3000);
    }

    connectToPeer(address: PeerAddress) {
        const key = `${address.host}:${address.port}`;

        if (this.connections.has(key)) return;
        if (this.connections.size >= this.maxConnections) return;
        if (key === `127.0.0.1:${this.port}`) return;

        const socket = net.createConnection(address.port, address.host, () => {
            appLogger.info(`[Peer ${this.port}] Connected to ${key}`);

            this.send(
                socket,
                MessageUtils.createHello(this.metadata.infoHash, this.peerId)
            );
        });

        this.setupSocket(socket, key);
        this.knownPeers.add(key);
    }

    private handleConnection(socket: Socket) {
        const key = this.getSocketId(socket);
        this.setupSocket(socket, key);
    }

    isComplete(): boolean {
        return this.fileManager.isComplete();
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

                messageLogger.info(`[Peer ${this.port}] Received HELLO from ${this.getSocketId(socket)}`);
                this.send(socket, MessageUtils.createBitfield(this.fileManager.getOwnedChunks()));
                this.send(socket, MessageUtils.createPeers(this.getKnownPeers()));
                break;

            case 'PEERS':
                messageLogger.info(`[Peer ${this.port}] Received PEERS from ${this.getSocketId(socket)}`);
                for (const peer of message.peers) {
                    const key = `${peer.host}:${peer.port}`;

                    if (!this.knownPeers.has(key) &&
                        this.connections.size < this.maxConnections) {

                        this.knownPeers.add(key);
                        this.connectToPeer(peer);
                    }
                }
                break;

            case 'REQUEST':
                messageLogger.info(`[Peer ${this.port}] Received REQUEST from ${this.getSocketId(socket)}`);
                if (!this.fileManager.hasChunk(message.index)) return;
                if (this.activeUploads >= this.maxUploadSlots) return;

                this.activeUploads++;

                const chunk = await this.fileManager.readChunk(message.index);

                appLogger.info(
                    `[Peer ${this.port}] ↑ (Upload) ${message.index} chunk to ${this.getSocketId(socket)}`
                );

                this.send(socket, MessageUtils.createPiece(message.index, chunk));

                this.activeUploads--;
                break;

            case 'PIECE':
                messageLogger.info(`[Peer ${this.port}] Received PIECE from ${this.getSocketId(socket)}`);
                const data = MessageUtils.parsePieceData(message.data);

                if (this.fileManager.saveChunk(message.index, data)) {
                    appLogger.info(
                        `[Peer ${this.port}] ↓ (Download) ${message.index} chunk from ${this.getSocketId(socket)}`
                    );

                    this.requestedChunks.delete(message.index);
                    this.requestTimestamps.delete(message.index);

                    this.broadcast(MessageUtils.createHave(message.index));
                }
                break;

            case 'HAVE':
                messageLogger.info(`[Peer ${this.port}] Received HAVE from ${this.getSocketId(socket)}`);
                if (!this.fileManager.hasChunk(message.index)) {
                    this.requestedChunks.delete(message.index);
                }
                break;
        }
    }

    private downloadLoop() {
        const now = Date.now();

        for (const [index, time] of this.requestTimestamps.entries()) {
            if (now - time > this.requestTimeout) {
                this.requestedChunks.delete(index);
                this.requestTimestamps.delete(index);
            }
        }

        if (this.requestedChunks.size >= this.maxDownloadRequests) return;

        const missing = this.fileManager
            .getMissingChunks()
            .sort(() => Math.random() - 0.5);

        const sockets = Array.from(this.connections.values());

        for (const index of missing) {
            if (this.requestedChunks.has(index)) continue;

            if (this.requestedChunks.size >= this.maxDownloadRequests) break;
            if (sockets.length === 0) return;

            const socket = sockets[Math.floor(Math.random() * sockets.length)];

            this.requestedChunks.add(index);
            this.requestTimestamps.set(index, Date.now());

            this.send(socket, MessageUtils.createRequest(index));
        }
    }

    private getSocketId(socket: Socket): string {
        const address = socket.remoteAddress?.replace('::ffff:', '');
        return `${address}:${socket.remotePort}`;
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
        return Array.from(this.knownPeers).map(p => {
            const [host, port] = p.split(':');
            return { host, port: Number(port) };
        });
    }
}