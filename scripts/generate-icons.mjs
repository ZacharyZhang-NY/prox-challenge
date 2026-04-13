import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");

const svgBuffer = readFileSync(join(PUBLIC, "logo.svg"));

async function generatePng(size, outputName) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(PUBLIC, outputName));
  console.log(`  ${outputName} (${size}x${size})`);
}

// ICO format: concatenate multiple PNGs into ICO container
function buildIco(pngBuffers) {
  // ICO header: 6 bytes
  const numImages = pngBuffers.length;
  const headerSize = 6 + numImages * 16;
  let offset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);       // reserved
  header.writeUInt16LE(1, 2);       // type: icon
  header.writeUInt16LE(numImages, 4);

  const entries = [];
  const sizes = [16, 32, 48];

  for (let i = 0; i < numImages; i++) {
    const entry = Buffer.alloc(16);
    const s = sizes[i];
    entry.writeUInt8(s < 256 ? s : 0, 0);  // width
    entry.writeUInt8(s < 256 ? s : 0, 1);  // height
    entry.writeUInt8(0, 2);                  // color palette
    entry.writeUInt8(0, 3);                  // reserved
    entry.writeUInt16LE(1, 4);               // color planes
    entry.writeUInt16LE(32, 6);              // bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8);  // size
    entry.writeUInt32LE(offset, 12);         // offset
    entries.push(entry);
    offset += pngBuffers[i].length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function main() {
  console.log("Generating icons from logo.svg...");

  // Generate PNGs
  await generatePng(16, "favicon-16.png");
  await generatePng(32, "favicon-32.png");
  await generatePng(48, "favicon-48.png");
  await generatePng(180, "apple-touch-icon.png");
  await generatePng(192, "icon-192.png");
  await generatePng(512, "icon-512.png");

  // Build favicon.ico from 16, 32, 48
  const ico16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const icoBuffer = buildIco([ico16, ico32, ico48]);
  writeFileSync(join(PUBLIC, "favicon.ico"), icoBuffer);
  console.log("  favicon.ico (16+32+48)");

  console.log("Done.");
}

main().catch(console.error);
