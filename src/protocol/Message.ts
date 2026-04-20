/* Sent when a peer connects, identifying which file (torrent) it is interested in */
export type HelloMessage = {
    type: 'HELLO';
    infoHash: string;
};

/* Indicates which chunks the peer currently possesses */
export type BitfieldMessage = {
    type: 'BITFIELD';
    chunks: number[];
};

/* Requests a specific chunk by its index */
export type RequestMessage = {
    type: 'REQUEST';
    index: number;
};

/* Contains the actual chunk data (base64 encoded) being sent to another peer */
export type PieceMessage = {
    type: 'PIECE';
    index: number;
    data: string;
};

/* Notifies that the peer has acquired a specific chunk */
export type HaveMessage = {
    type: 'HAVE';
    index: number;
};

export type Message =
    | HelloMessage
    | BitfieldMessage
    | RequestMessage
    | PieceMessage
    | HaveMessage;

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
}