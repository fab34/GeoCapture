import { App, Editor, TFile, normalizePath } from "obsidian";

const WIKI_IMAGE = /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?]]/g;
const MARKDOWN_IMAGE = /!\[[^\]]*]\(([^)]+)\)/g;
const SUPPORTED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg"]);

interface ImageMatch {
  path: string;
  line: number;
}

export interface ImageContext {
  file: TFile;
  line: number;
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
    if (imageFile) {
      return {
        file: imageFile,
        line: match.line,
      };
    }
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
  if (/^[a-z]+:\/\//i.test(imagePath)) {
    return null;
  }

  const linkedFile = app.metadataCache.getFirstLinkpathDest(imagePath, sourceFile.path);
  if (linkedFile instanceof TFile) {
    return linkedFile;
  }

  const sourceFolder = sourceFile.parent?.path ?? "";
  const relativePath = normalizePath(sourceFolder ? `${sourceFolder}/${imagePath}` : imagePath);
  const file = app.vault.getAbstractFileByPath(relativePath);

  return file instanceof TFile ? file : null;
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
