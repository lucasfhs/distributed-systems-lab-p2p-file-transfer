import fs from 'fs';
import path from 'path';

export function clearDownloadsFolder() {
    const downloadsPath = path.join(process.cwd(), 'downloads');

    if (!fs.existsSync(downloadsPath)) {
        return;
    }

    for (const file of fs.readdirSync(downloadsPath)) {
        const filePath = path.join(downloadsPath, file);

        fs.rmSync(filePath, {
            recursive: true,
            force: true
        });
    }
}