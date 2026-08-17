// frontend/scripts/generate-favicon.js
const fs = require('fs');
const path = require('path');

function createFaviconICO() {
    // Simple 16x16 favicon data
    const imageData = [
        0b11111111, 0b11111111, 0b11111111, 0b11111111,
        0b11111111, 0b11111111, 0b11111111, 0b11111111,
        0b11111111, 0b11111111, 0b11111111, 0b11111111,
        0b11110011, 0b11111111, 0b11100111, 0b11111111,
        0b11001111, 0b11111111, 0b10011111, 0b11111111,
        0b00111111, 0b11111111, 0b01111111, 0b11111111,
        0b00111111, 0b11111111, 0b10011111, 0b11111111,
        0b11001111, 0b11111111, 0b11100111, 0b11111111,
        0b11110011, 0b11111111, 0b11111111, 0b11111111,
        0b11111111, 0b11111111, 0b11111111, 0b11111111
    ];

    const header = Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);
    const entry = Buffer.from([0x10, 0x10, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x24, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const image = Buffer.from(imageData);
    const mask = Buffer.alloc(32, 0x00);

    const ico = Buffer.concat([header, entry, image, mask]);
    const outputPath = path.join(__dirname, '../public/favicon.ico');
    fs.writeFileSync(outputPath, ico);
    console.log('✅ favicon.ico created at:', outputPath);
}

createFaviconICO();