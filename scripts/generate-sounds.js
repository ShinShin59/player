#!/usr/bin/env node
/**
 * Scans the parent Audio folder for MP3 files and generates sounds.json manifest.
 * Copies MP3 files to public/ so they can be served and committed to the repo.
 * Run from player directory: node scripts/generate-sounds.js
 */
import { readdir, stat, mkdir, copyFile, rm } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_FOLDERS = ["ENVIRO", "UNITS", "VOICES", "UI", "Media"];
const AUDIO_ROOT = join(__dirname, "..", "..");
const PUBLIC_DIR = join(__dirname, "..", "public");

async function copyMp3Recursive(srcDir, dstDir) {
  let count = 0;
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const dstPath = join(dstDir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      await mkdir(dstPath, { recursive: true });
      count += await copyMp3Recursive(srcPath, dstPath);
    } else if (entry.isFile() && entry.name.endsWith(".mp3")) {
      await copyFile(srcPath, dstPath);
      count++;
    }
  }
  return count;
}

async function copyMp3Files() {
  for (const folder of AUDIO_FOLDERS) {
    const srcDir = join(AUDIO_ROOT, folder);
    const dstDir = join(PUBLIC_DIR, folder);
    try {
      await stat(srcDir);
    } catch {
      continue;
    }
    try {
      await rm(dstDir, { recursive: true, force: true });
    } catch {}
    await mkdir(dstDir, { recursive: true });
    const count = await copyMp3Recursive(srcDir, dstDir);
    console.log(`Copied ${count} MP3s to public/${folder}/`);
  }
}

async function findMp3Files(dir, basePath = "") {
  const results = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        results.push(...(await findMp3Files(fullPath, relPath)));
      } else if (entry.name.endsWith(".mp3")) {
        const name = entry.name.replace(/\.mp3$/, "");
        const letter = /^[A-Za-z]/.test(name) ? name[0].toUpperCase() : "#";
        results.push({ name, path: relPath, letter });
      }
    }
  } catch (err) {
    console.warn(`Warning: could not read ${dir}:`, err.message);
  }
  return results;
}

async function main() {
  await copyMp3Files();
  const sounds = [];
  for (const folder of AUDIO_FOLDERS) {
    const folderPath = join(AUDIO_ROOT, folder);
    try {
      await stat(folderPath);
    } catch {
      continue;
    }
    const mp3s = await findMp3Files(folderPath, folder);
    sounds.push(...mp3s);
  }
  sounds.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const outputPath = join(__dirname, "..", "public", "sounds.json");
  const { writeFile } = await import("fs/promises");
  await writeFile(outputPath, JSON.stringify(sounds));
  console.log(`Generated sounds.json with ${sounds.length} sounds`);
}

main().catch(console.error);
