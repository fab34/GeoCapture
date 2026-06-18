import { App, Editor, TFile, normalizePath } from "obsidian";

const WIKI_IMAGE = /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?]]/g;
const MARKDOWN_IMAGE = /!\[[^\]]*]\(([^)]+)\)/g;
const SUPPORTED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);

interface ImageMatch {
  path: string;
  line: number;
}

export interface ImageContext {
  file: TFile | null;
  line: number;
  path: string;
}

export interface ImageResolutionDiagnostics {
  fileName: string;
  stem: string;
  vaultImages: number;
  sameName: number;
  sameStem: number;
  candidates: string;
}

export function findNearestImageContext(app: App, editor: Editor, sourceFile: TFile): ImageContext | null {
  const imageMatches = findImageMatches(editor);

  if (imageMatches.length === 0) {
    return null;
  }

  const cursorLine = editor.getCursor().line;
  const sorted = imageMatches.sort(
    (a, b) => Math.abs(a.line - cursorLine) - Math.abs(b.line - cursorLine),
  );

  for (const match of sorted) {
    const imageFile = resolveImageFile(app, sourceFile, match.path);
    return {
      file: imageFile,
      line: match.line,
      path: match.path,
    };
  }

  return null;
}

export function findImageContextByPath(
  app: App,
  sourceFile: TFile,
  content: string,
  imageTarget: string,
): ImageContext | null {
  const target = normalizeComparableImagePath(imageTarget);
  const targetFileName = getFileName(target);
  const targetStem = targetFileName ? getFileStem(targetFileName) : "";

  for (const match of findImageMatchesInContent(content)) {
    const matchPath = normalizeComparableImagePath(match.path);
    const matchFileName = getFileName(matchPath);
    const matchStem = matchFileName ? getFileStem(matchFileName) : "";
    const isMatch =
      matchPath === target ||
      (targetFileName !== null && matchFileName !== null && matchFileName.toLowerCase() === targetFileName.toLowerCase()) ||
      (targetStem.length > 0 && matchStem.toLowerCase() === targetStem.toLowerCase());

    if (isMatch) {
      return {
        file: resolveImageFile(app, sourceFile, match.path),
        line: match.line,
        path: match.path,
      };
    }
  }

  return null;
}

export function isSupportedExifImage(file: TFile): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
}

export function diagnoseImageResolution(app: App, imagePath: string): ImageResolutionDiagnostics {
  const fileName = getFileName(imagePath) ?? "";
  const stem = getFileStem(fileName);
  const imageFiles = app.vault.getFiles().filter(isImageFile);
  const lowerFileName = fileName.toLowerCase();
  const lowerStem = stem.toLowerCase();
  const sameName = imageFiles.filter((file) => file.name.toLowerCase() === lowerFileName);
  const sameStem = imageFiles.filter((file) => getFileStem(file.name).toLowerCase() === lowerStem);
  const candidates = [...sameName, ...sameStem.filter((file) => !sameName.includes(file))]
    .slice(0, 3)
    .map((file) => file.path)
    .join(" | ");

  return {
    fileName,
    stem,
    vaultImages: imageFiles.length,
    sameName: sameName.length,
    sameStem: sameStem.length,
    candidates: candidates || "none",
  };
}

function findImageMatches(editor: Editor): ImageMatch[] {
  const matches: ImageMatch[] = [];

  for (let line = 0; line < editor.lineCount(); line += 1) {
    const text = editor.getLine(line);
    matches.push(...findLineMatches(text, line, WIKI_IMAGE));
    matches.push(...findLineMatches(text, line, MARKDOWN_IMAGE));
  }

  return matches;
}

function findImageMatchesInContent(content: string): ImageMatch[] {
  const matches: ImageMatch[] = [];
  const lines = content.split(/\r?\n/);

  for (let line = 0; line < lines.length; line += 1) {
    matches.push(...findLineMatches(lines[line], line, WIKI_IMAGE));
    matches.push(...findLineMatches(lines[line], line, MARKDOWN_IMAGE));
  }

  return matches;
}

function findLineMatches(text: string, line: number, regex: RegExp): ImageMatch[] {
  const matches: ImageMatch[] = [];
  regex.lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const path = cleanImagePath(match[1]);
    if (path) {
      matches.push({ path, line });
    }
  }

  return matches;
}

function resolveImageFile(app: App, sourceFile: TFile, imagePath: string): TFile | null {
  if (!/^[a-z]+:\/\//i.test(imagePath)) {
    const linkedFile = app.metadataCache.getFirstLinkpathDest(imagePath, sourceFile.path);
    if (linkedFile instanceof TFile) {
      return linkedFile;
    }

    const sourceFolder = sourceFile.parent?.path ?? "";
    const relativePath = normalizePath(sourceFolder ? `${sourceFolder}/${imagePath}` : imagePath);
    const file = app.vault.getAbstractFileByPath(relativePath);

    if (file instanceof TFile) {
      return file;
    }
  }

  return findImageFileByName(app, imagePath);
}

function cleanImagePath(path: string | undefined): string | null {
  if (!path) {
    return null;
  }

  const trimmed = path.trim().replace(/^<|>$/g, "");

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function normalizeComparableImagePath(path: string): string {
  const cleaned = cleanImagePath(path) ?? path;
  return normalizePath(cleaned.split(/[?#]/)[0]).toLowerCase();
}

function findImageFileByName(app: App, imagePath: string): TFile | null {
  const fileName = getFileName(imagePath);

  if (!fileName) {
    return null;
  }

  const lowerFileName = fileName.toLowerCase();
  const lowerStem = getFileStem(fileName).toLowerCase();
  const imageFiles = app.vault.getFiles().filter(isImageFile);
  const exactCandidates = imageFiles.filter((file) => file.name.toLowerCase() === lowerFileName);
  const stemCandidates = imageFiles.filter((file) => getFileStem(file.name).toLowerCase() === lowerStem);
  const candidates = [...exactCandidates, ...stemCandidates.filter((file) => !exactCandidates.includes(file))];

  if (candidates.length === 0) {
    return null;
  }

  return candidates.find(isSupportedExifImage) ?? candidates[0];
}

function getFileName(imagePath: string): string | null {
  const withoutQuery = imagePath.split(/[?#]/)[0];
  const parts = normalizePath(withoutQuery).split("/");
  const fileName = parts[parts.length - 1]?.trim();

  return fileName || null;
}

function getFileStem(fileName: string): string {
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart > 0 ? fileName.slice(0, extensionStart) : fileName;
}

function isImageFile(file: TFile): boolean {
  return IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
}
