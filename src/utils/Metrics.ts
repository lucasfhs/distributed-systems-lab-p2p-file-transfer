export class Metrics {
    private startTime = 0;

    private uploadedBytes = 0;
    private downloadedBytes = 0;

    private uploadedChunks = 0;
    private downloadedChunks = 0;

    start() {
        this.startTime = Date.now();
    }

    addUpload(bytes: number) {
        this.uploadedBytes += bytes;
        this.uploadedChunks++;
    }

    addDownload(bytes: number) {
        this.downloadedBytes += bytes;
        this.downloadedChunks++;
    }

    report() {
        const elapsedSeconds =
            (Date.now() - this.startTime) / 1000;

        return {
            elapsedSeconds,
            uploadedBytes: this.uploadedBytes,
            downloadedBytes: this.downloadedBytes,
            uploadedChunks: this.uploadedChunks,
            downloadedChunks: this.downloadedChunks,
            uploadRate:
                this.uploadedBytes / elapsedSeconds,
            downloadRate:
                this.downloadedBytes / elapsedSeconds
        };
    }
}