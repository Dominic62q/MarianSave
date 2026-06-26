const sharp = require("sharp");
const path = require("path");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="128" fill="#2563eb"/>
  <path d="M96 160a32 32 0 0132-32h224a16 16 0 0116 16v48H128v160a32 32 0 0032 32h240a16 16 0 0016-16v-48H224a16 16 0 01-16-16V272a16 16 0 0116-16z" fill="white" opacity="0.95"/>
  <circle cx="336" cy="256" r="64" fill="white"/>
  <path d="M320 224v64M288 256h96" stroke="#2563eb" stroke-width="24" stroke-linecap="round"/>
</svg>`;

const sizes = [
  { name: "32x32.png", size: 32 },
  { name: "128x128.png", size: 128 },
  { name: "128x128@2x.png", size: 256 },
  { name: "icon.png", size: 512 },
  { name: "Square30x30Logo.png", size: 30 },
  { name: "Square44x44Logo.png", size: 44 },
  { name: "Square71x71Logo.png", size: 71 },
  { name: "Square89x89Logo.png", size: 89 },
  { name: "Square107x107Logo.png", size: 107 },
  { name: "Square142x142Logo.png", size: 142 },
  { name: "Square150x150Logo.png", size: 150 },
  { name: "Square284x284Logo.png", size: 284 },
  { name: "Square310x310Logo.png", size: 310 },
  { name: "StoreLogo.png", size: 50 },
];

async function generate() {
  const iconDir = path.resolve(__dirname, "..", "src-tauri", "icons");
  for (const { name, size } of sizes) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(iconDir, name));
    console.log(`Generated ${name} (${size}x${size})`);
  }
  // ICO file
  await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(path.join(iconDir, "icon.ico"));
  console.log("Generated icon.ico");
}

generate().catch(console.error);
