import sharp from "sharp";
import { readdir, mkdir } from "fs/promises";
import { join, basename, extname } from "path";
import { writeFile } from "fs/promises";

const PICTURES_DIR = "public/pictures";
const OUTPUT_DIR = "public/pictures/optimized";
const MANIFEST_PATH = "src/photoManifest.json";

const SIZES = [340, 680];
const QUALITY = 80;
const PLACEHOLDER_WIDTH = 20;

// Aspect ratios matching App.jsx ALL_PHOTOS
const ASPECT_RATIOS = {
  "disc-golf-putt-oceanside-course": "4 / 3",
  "crabbing-on-the-beach-double-catch": "3 / 4",
  "hilltop-hike-ocean-vista": "4 / 3",
  "porch-steps-with-pumpkins-fall": "4 / 3",
  "pinnacle-rock-viewpoint-galapagos": "3 / 4",
  "groom-portrait-navy-suit-wedding-day": "2 / 3",
};

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const files = (await readdir(PICTURES_DIR)).filter((f) =>
    f.endsWith(".png")
  );
  const manifest = [];

  for (const file of files) {
    const name = basename(file, extname(file));
    const inputPath = join(PICTURES_DIR, file);
    const entry = {
      aspectRatio: ASPECT_RATIOS[name] || "4 / 3",
    };

    // Generate sized WebP variants
    for (const width of SIZES) {
      const outputName = `${name}-${width}w.webp`;
      const outputPath = join(OUTPUT_DIR, outputName);
      await sharp(inputPath)
        .resize(width)
        .webp({ quality: QUALITY })
        .toFile(outputPath);
      entry[`src${width}`] = `/pictures/optimized/${outputName}`;

      const stats = await sharp(outputPath).metadata();
      const fileSizeKB = (
        (await import("fs")).statSync(outputPath).size / 1024
      ).toFixed(1);
      console.log(`  ${outputName}: ${stats.width}x${stats.height} (${fileSizeKB} KB)`);
    }

    // Generate tiny base64 placeholder
    const placeholderBuf = await sharp(inputPath)
      .resize(PLACEHOLDER_WIDTH)
      .webp({ quality: 20 })
      .toBuffer();
    entry.placeholder = `data:image/webp;base64,${placeholderBuf.toString("base64")}`;

    console.log(
      `  placeholder: ${PLACEHOLDER_WIDTH}px (${placeholderBuf.length} bytes)\n`
    );

    manifest.push(entry);
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Manifest written to ${MANIFEST_PATH}`);
  console.log(`${manifest.length} photos optimized.`);
}

run().catch(console.error);
