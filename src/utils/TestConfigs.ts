import { FileType } from "@/core/TorrentFileHandler";

// Configuração inicial
type BaseConfig = {
    portRange: { min: number; max: number };
    seederPort: number;
}

// Parâmetros definidos para o teste na especificação do trabalho
type TestConfig = BaseConfig & {
    archivePath: string;
    chunkSize  : number;
    peerCount  : number;
};

const SEEDER_PORT            = 5000;
const MIN_PEER_PORT          = 5001;
const MAX_PEER_PORT          = 6000;
const PEER_COUNT_VARIATION_1 = 2;
const PEER_COUNT_VARIATION_2 = 4;

const testVariation1 = {
    "fileA":{
        archivePath: 'test/files/fileA_v1.png',
        chunkSize: FileType.SIZE_1KB,
        peerCount: PEER_COUNT_VARIATION_1,
        portRange: { min: MIN_PEER_PORT, max: MAX_PEER_PORT },
        seederPort: SEEDER_PORT
    },
    "fileB":{
        archivePath: 'test/files/fileB_v1.png',
        chunkSize: FileType.SIZE_1KB,
        peerCount: PEER_COUNT_VARIATION_1,
        portRange: { min: MIN_PEER_PORT, max: MAX_PEER_PORT },
        seederPort: SEEDER_PORT
    },
    "fileC":{
        archivePath: 'test/files/fileC_v1.png',
        chunkSize: FileType.SIZE_1KB,
        peerCount: PEER_COUNT_VARIATION_1,
        portRange: { min: MIN_PEER_PORT, max: MAX_PEER_PORT },
        seederPort: SEEDER_PORT
    },
}

const testVariation2 = {
    "fileA":{
        archivePath: 'test/files/fileA_v2.png',
        chunkSize: FileType.SIZE_4KB,
        peerCount: PEER_COUNT_VARIATION_2,
        portRange: { min: MIN_PEER_PORT, max: MAX_PEER_PORT },
        seederPort: SEEDER_PORT
    },
    "fileB":{
        archivePath: 'test/files/fileB_v2.png',
        chunkSize: FileType.SIZE_4KB,
        peerCount: PEER_COUNT_VARIATION_2,
        portRange: { min: MIN_PEER_PORT, max: MAX_PEER_PORT },
        seederPort: SEEDER_PORT
    },
    "fileC":{
        archivePath: 'test/files/fileC_v2.png',
        chunkSize: FileType.SIZE_4KB,
        peerCount: PEER_COUNT_VARIATION_2,
        portRange: { min: MIN_PEER_PORT, max: MAX_PEER_PORT },
        seederPort: SEEDER_PORT
    },
}

export enum FileKey {
    FILE_A = 'fileA',
    FILE_B = 'fileB',
    FILE_C = 'fileC'
}

export enum Variation {
    V1 = 1,
    V2 = 2
}

export function chooseVariationTest(
    file: FileKey,
    variation: Variation
): TestConfig {

    const variations = {
        [Variation.V1]: testVariation1,
        [Variation.V2]: testVariation2
    };

    const selectedVariation = variations[variation];

    if (!selectedVariation) {
        throw new Error(`Variação ${variation} não existe`);
    }

    const config = selectedVariation[file];

    if (!config) {
        throw new Error(`Arquivo ${file} não existe na variação ${variation}`);
    }

    return config;
}