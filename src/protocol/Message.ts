export type PeerAddress = {
    host: string;
    port: number;
};

export type HelloMessage = {
    type: 'HELLO';
    infoHash: string;
};
// Sent when a peer connects, identifying which torrent it is participating in

export type BitfieldMessage = {
    type: 'BITFIELD';
    chunks: number[];
};
// Indicates which chunks the peer currently has

export type RequestMessage = {
    type: 'REQUEST';
    index: number;
};
// Requests a specific chunk by its index

export type PieceMessage = {
    type: 'PIECE';
    index: number;
    data: string;
};
// Contains the actual chunk data (base64 encoded)

export type HaveMessage = {
    type: 'HAVE';
    index: number;
};
// Notifies that the peer has acquired a specific chunk

export type PeersMessage = {
    type: 'PEERS';
    peers: PeerAddress[];
};
// Shares known peers to help expand the network

export type InterestedMessage = {
    type: 'INTERESTED';
};
// Indicates interest in downloading data

export type NotInterestedMessage = {
    type: 'NOT_INTERESTED';
};
// Indicates no interest in downloading data

export type Message =
    | HelloMessage
    | BitfieldMessage
    | RequestMessage
    | PieceMessage
    | HaveMessage
    | PeersMessage
    | InterestedMessage
    | NotInterestedMessage;

export class MessageSerializer {
    static encode(message: Message): string {
        return JSON.stringify(message) + '\n';
    }

    static decode(raw: string): Message {
        return JSON.parse(raw);
    }
}

export class MessageUtils {
    static createHello(infoHash: string): HelloMessage {
        return { type: 'HELLO', infoHash };
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

    static createInterested(): InterestedMessage {
        return { type: 'INTERESTED' };
    }

    static createNotInterested(): NotInterestedMessage {
        return { type: 'NOT_INTERESTED' };
    }
}