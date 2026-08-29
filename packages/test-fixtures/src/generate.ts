import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { fixtureAssetDirectory, fixtureAssetPaths } from "./index.js";

const escapeXml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function gridLines(width: number, height: number, step: number, color = "#6b7280"): string {
  const lines: string[] = [];
  for (let x = 0; x <= width; x += step) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}"/>`);
  }
  for (let y = 0; y <= height; y += step) {
    lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}"/>`);
  }
  return `<g stroke="${color}" stroke-width="2" opacity="0.5">${lines.join("")}</g>`;
}

function cropMarkers(width: number, height: number, color: string): string {
  const inset = 24;
  const length = 90;
  return `<g stroke="${color}" stroke-width="12" fill="none">
    <path d="M ${inset + length} ${inset} H ${inset} V ${inset + length}"/>
    <path d="M ${width - inset - length} ${inset} H ${width - inset} V ${inset + length}"/>
    <path d="M ${inset} ${height - inset - length} V ${height - inset} H ${inset + length}"/>
    <path d="M ${width - inset} ${height - inset - length} V ${height - inset} H ${width - inset - length}"/>
  </g>`;
}

function label(text: string, width: number, y = 78): string {
  return `<text x="${width / 2}" y="${y}" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="52" font-weight="700">${escapeXml(text)}</text>`;
}

function rasterSvg(
  width: number,
  height: number,
  title: string,
  colors: readonly [string, string],
  art: string,
): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${colors[0]}"/>
        <stop offset="1" stop-color="${colors[1]}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    ${gridLines(width, height, Math.round(Math.min(width, height) / 10))}
    <line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="#fef08a" stroke-width="8"/>
    <line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="#fef08a" stroke-width="8"/>
    <circle cx="${width / 2}" cy="${height / 2}" r="32" fill="none" stroke="#ffffff" stroke-width="10"/>
    ${cropMarkers(width, height, "#fb7185")}
    ${label(title, width)}
    ${art}
  </svg>`);
}

async function writePng(path: string, svg: Buffer): Promise<void> {
  await sharp(svg, { density: 144 }).png({ compressionLevel: 9, palette: false }).toFile(path);
}

async function writeJpeg(path: string, svg: Buffer): Promise<void> {
  await sharp(svg, { density: 144 }).jpeg({ quality: 94, chromaSubsampling: "4:4:4" }).toFile(path);
}

await mkdir(fixtureAssetDirectory, { recursive: true });

await writePng(
  fixtureAssetPaths.dentalIntraoral,
  rasterSvg(1200, 675, "INTRAORAL GRID · LEFT ← → RIGHT", ["#7f1d1d", "#1e3a8a"], `
    <g fill="#fff7ed" stroke="#fb923c" stroke-width="9">
      <rect x="170" y="225" width="860" height="225" rx="110"/>
      <g fill="#fde68a">
        <rect x="480" y="238" width="112" height="90" rx="18"/><rect x="608" y="238" width="112" height="90" rx="18"/>
        <rect x="480" y="348" width="112" height="90" rx="18"/><rect x="608" y="348" width="112" height="90" rx="18"/>
      </g>
    </g>`),
);

await writePng(
  fixtureAssetPaths.dentalModel,
  rasterSvg(1200, 675, "MODEL GRID · SCALE CHECK", ["#064e3b", "#312e81"], `
    <g fill="none" stroke="#a7f3d0" stroke-width="18">
      <path d="M 210 405 Q 600 125 990 405"/>
      <path d="M 250 455 Q 600 230 950 455"/>
    </g>
    <g fill="#ffffff">${Array.from({ length: 9 }, (_, index) => `<circle cx="${280 + index * 80}" cy="${340 - Math.abs(4 - index) * 22}" r="30"/>`).join("")}</g>`),
);

await writeJpeg(
  fixtureAssetPaths.frontalBoard,
  rasterSvg(750, 1000, "FRONTAL · TOP ↑", ["#4c1d95", "#0f766e"], `
    <g fill="none" stroke="#ffffff" stroke-width="16">
      <rect x="130" y="170" width="490" height="690" rx="210"/>
      <circle cx="280" cy="420" r="24"/><circle cx="470" cy="420" r="24"/>
      <path d="M 270 670 Q 375 735 480 670"/>
    </g>
    <text x="375" y="930" text-anchor="middle" fill="#fef08a" font-family="Arial" font-size="42">PORTRAIT 3:4</text>`),
);

await writePng(
  fixtureAssetPaths.syntheticProfile,
  rasterSvg(900, 900, "PROFILE LAYER · P", ["#0f766e", "#164e63"], `
    <g fill="none" stroke="#5eead4" stroke-width="18">
      <path d="M 340 180 C 525 170 610 275 590 370 C 575 435 650 440 590 492 C 630 540 565 590 535 655 C 510 720 420 760 310 710"/>
      <path d="M 310 710 C 210 640 200 340 340 180"/>
    </g>
    <g fill="#fef08a">${([[590,370],[590,492],[535,655],[340,180]] as readonly (readonly [number, number])[]).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="15"/>`).join("")}</g>`),
);

await writePng(
  fixtureAssetPaths.syntheticCeph,
  rasterSvg(900, 900, "CEPH LAYER · C", ["#172554", "#581c87"], `
    <g fill="none" stroke="#f0abfc" stroke-width="13">
      <ellipse cx="410" cy="390" rx="240" ry="285"/>
      <path d="M 400 290 Q 615 330 590 430 L 675 480 L 580 510 Q 620 555 525 650"/>
      <path d="M 310 650 L 540 650 L 625 530"/>
      <line x1="170" y1="150" x2="680" y2="710" stroke-dasharray="24 18"/>
    </g>
    <g fill="#fef08a">${([[590,430],[675,480],[580,510],[525,650]] as readonly (readonly [number, number])[]).map(([x,y])=>`<rect x="${x-12}" y="${y-12}" width="24" height="24"/>`).join("")}</g>`),
);

await writePng(
  fixtureAssetPaths.verticalCeph,
  rasterSvg(900, 900, "VERTICAL CEPH · NO PATIENT DATA", ["#111827", "#1e3a8a"], `
    <g fill="none" stroke="#67e8f9" stroke-width="12">
      <ellipse cx="440" cy="365" rx="230" ry="270"/>
      <path d="M 380 620 L 570 620 L 670 500 L 580 460 L 610 390"/>
      <line x1="210" y1="160" x2="630" y2="730"/>
      <line x1="260" y1="700" x2="670" y2="700"/>
      <path d="M 315 670 A 70 70 0 0 1 370 615" stroke="#fbbf24"/>
    </g>`),
);
