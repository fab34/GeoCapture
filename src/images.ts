import { App, Editor, TFile, normalizePath } from "obsidian";

const WIKI_IMAGE = /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?]]/g;
const MARKDOWN_IMAGE = /!\[[^\]]*]\(([^)]+)\)/g;
const SUPPORTED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg"]);

interface ImageMatch {
  path: string;
  line: number;
}

export interface ImageContext {
  file: TFile | null;
  line: number;
  path: string;
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

export function isSupportedExifImage(file: TFile): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
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

function findImageFileByName(app: App, imagePath: string): TFile | null {
  const fileName = getFileName(imagePath);

  if (!fileName) {
    return null;
  }

  const lowerFileName = fileName.toLowerCase();
  const candidates = app.vault
    .getFiles()
    .filter((file) => file.name.toLowerCase() === lowerFileName);

  if (candidates.length === 0) {
    return null;
  }

  return candidates.find(isSupportedExifImage) ?? candidates[0];
}

function getFileName(imagePath: string): string | null {
  const withoutQuery = imagePath.split(/[?#]/)[0];
  const parts = normalizePath(withoutQuery).split("/");
  const fileName = parts.at(-1)?.trim();

  return fileName || null;
}
