export type PeerAddress = {
    host: string;
    port: number;
};

export type HelloMessage = {
    type: 'HELLO';
    infoHash: string;
    peerId: string;
};

export type BitfieldMessage = {
    type: 'BITFIELD';
    chunks: number[];
};

export type RequestMessage = {
    type: 'REQUEST';
    index: number;
};

export type PieceMessage = {
    type: 'PIECE';
    index: number;
    data: string;
};

export type HaveMessage = {
    type: 'HAVE';
    index: number;
};

export type PeersMessage = {
    type: 'PEERS';
    peers: PeerAddress[];
};

export type Message =
    | HelloMessage
    | BitfieldMessage
    | RequestMessage
    | PieceMessage
    | HaveMessage
    | PeersMessage;

export class MessageSerializer {
    static encode(message: Message): string {
        return JSON.stringify(message) + '\n';
    }

    static decode(raw: string): Message {
        return JSON.parse(raw);
    }
}

export class MessageUtils {
    static createHello(infoHash: string, peerId: string): HelloMessage {
        return { type: 'HELLO', infoHash, peerId };
    }

    static createBitfield(chunks: number[]): BitfieldMessage {
        return { type: 'BITFIELD', chunks };
    }

    static createRequest(index: number): RequestMessage {
        return { type: 'REQUEST', index };
    }

    static createPiece(index: number, data: Buffer): PieceMessage {
        return {
            type: 'PIECE',
            index,
            data: data.toString('base64')
        };
    }

    static parsePieceData(data: string): Buffer {
        return Buffer.from(data, 'base64');
    }

    static createHave(index: number): HaveMessage {
        return { type: 'HAVE', index };
    }

    static createPeers(peers: PeerAddress[]): PeersMessage {
        return { type: 'PEERS', peers };
    }
}