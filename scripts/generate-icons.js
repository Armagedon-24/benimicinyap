const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '..', 'upload', 'logo.png');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const publicDir = path.join(__dirname, '..', 'public');

async function generateIcons() {
  const sizes = [
    { name: 'favicon-16.png', size: 16 },
    { name: 'favicon-32.png', size: 32 },
    { name: 'favicon-48.png', size: 48 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(iconsDir, name));
    console.log(`OK ${name} (${size}x${size})`);
  }

  // SVG with embedded base64
  const buf = await sharp(src).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const b64 = buf.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><image href="data:image/png;base64,${b64}" width="512" height="512"/></svg>`;
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg);
  console.log('OK icon.svg');

  // Multi-size ICO
  const bufs = [
    await sharp(src).resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    await sharp(src).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    await sharp(src).resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
  ];
  const sizesArr = [16, 32, 48];
  const num = bufs.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * num;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(num, 4);

  const entries = bufs.map((b, i) => {
    const e = Buffer.alloc(dirEntrySize);
    e.writeUInt8(sizesArr[i], 0);
    e.writeUInt8(sizesArr[i], 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(b.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += b.length;
    return e;
  });

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, ...entries, ...bufs]));
  console.log('OK favicon.ico');

  // OG image 1200x630
  await sharp(src)
    .resize(600, 600, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extend({ top: 15, bottom: 15, left: 300, right: 300, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('OK og-image.png');

  console.log('Done!');
}

generateIcons().catch(console.error);