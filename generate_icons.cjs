const fs = require('fs');
const Jimp = require('jimp');

async function generate() {
    try {
        console.log('Reading base image...');
        // Read original logo or create a simple one. If Rekadwipa.png is too big, it will be scaled.
        const image = await Jimp.read('public/Rekadwipa.png');

        console.log('Generating 192x192 icon...');
        const icon192 = image.clone().scaleToFit(192, 192);
        // Create a blank 192x192 background to ensure exact size if aspect ratio is not square
        const bg192 = new Jimp(192, 192, '#ffffff');
        bg192.composite(icon192, (192 - icon192.getWidth()) / 2, (192 - icon192.getHeight()) / 2);
        await bg192.writeAsync('public/icon-192.png');

        console.log('Generating 512x512 icon...');
        const icon512 = image.clone().scaleToFit(512, 512);
        // Create a blank 512x512 background 
        const bg512 = new Jimp(512, 512, '#ffffff');
        bg512.composite(icon512, (512 - icon512.getWidth()) / 2, (512 - icon512.getHeight()) / 2);
        await bg512.writeAsync('public/icon-512.png');

        console.log('Icons generated successfully.');
    } catch (e) {
        console.error('Error generating icons:', e);
        process.exit(1);
    }
}
generate();
