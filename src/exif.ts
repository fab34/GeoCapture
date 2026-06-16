import { GeoPoint } from "./types";

const JPEG_SOI = 0xffd8;
const APP1_MARKER = 0xffe1;
const EXIF_HEADER = "Exif\0\0";
const TAG_GPS_IFD = 0x8825;
const TAG_GPS_LAT_REF = 0x0001;
const TAG_GPS_LAT = 0x0002;
const TAG_GPS_LON_REF = 0x0003;
const TAG_GPS_LON = 0x0004;

interface TiffContext {
  view: DataView;
  tiffStart: number;
  littleEndian: boolean;
}

interface IfdEntry {
  tag: number;
  type: number;
  count: number;
  valueOffset: number;
  entryOffset: number;
}

export function readExifGps(arrayBuffer: ArrayBuffer): GeoPoint | null {
  const view = new DataView(arrayBuffer);
  const exifStart = findExifStart(view);

  if (exifStart === null) {
    return null;
  }

  return readGpsFromExif(view, exifStart);
}

function findExifStart(view: DataView): number | null {
  if (view.byteLength < 4 || view.getUint16(0) !== JPEG_SOI) {
    return null;
  }

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    const segmentLength = view.getUint16(offset + 2);
    const segmentStart = offset + 4;

    if (marker === APP1_MARKER && readAscii(view, segmentStart, EXIF_HEADER.length) === EXIF_HEADER) {
      return segmentStart + EXIF_HEADER.length;
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function readGpsFromExif(view: DataView, tiffStart: number): GeoPoint | null {
  const byteOrder = view.getUint16(tiffStart);
  const littleEndian = byteOrder === 0x4949;

  if (!littleEndian && byteOrder !== 0x4d4d) {
    return null;
  }

  const context = { view, tiffStart, littleEndian };
  const magic = readUint16(context, tiffStart + 2);

  if (magic !== 42) {
    return null;
  }

  const firstIfdOffset = readUint32(context, tiffStart + 4);
  const gpsIfdPointer = readIfdEntry(context, tiffStart + firstIfdOffset, TAG_GPS_IFD);

  if (!gpsIfdPointer) {
    return null;
  }

  const gpsIfdOffset = tiffStart + gpsIfdPointer.valueOffset;
  const latRef = readAsciiValue(context, gpsIfdOffset, TAG_GPS_LAT_REF);
  const lonRef = readAsciiValue(context, gpsIfdOffset, TAG_GPS_LON_REF);
  const latEntry = readIfdEntry(context, gpsIfdOffset, TAG_GPS_LAT);
  const lonEntry = readIfdEntry(context, gpsIfdOffset, TAG_GPS_LON);

  if (!latRef || !lonRef || !latEntry || !lonEntry) {
    return null;
  }

  const lat = readDms(context, latEntry);
  const lon = readDms(context, lonEntry);

  if (lat === null || lon === null) {
    return null;
  }

  return {
    lat: latRef.trim().toUpperCase() === "S" ? -lat : lat,
    lon: lonRef.trim().toUpperCase() === "W" ? -lon : lon,
  };
}

function readIfdEntry(context: TiffContext, ifdOffset: number, tag: number): IfdEntry | null {
  const entryCount = readUint16(context, ifdOffset);

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    const entry = {
      tag: readUint16(context, entryOffset),
      type: readUint16(context, entryOffset + 2),
      count: readUint32(context, entryOffset + 4),
      valueOffset: readUint32(context, entryOffset + 8),
      entryOffset,
    };

    if (entry.tag === tag) {
      return entry;
    }
  }

  return null;
}

function readAsciiValue(context: TiffContext, ifdOffset: number, tag: number): string | null {
  const entry = readIfdEntry(context, ifdOffset, tag);

  if (!entry) {
    return null;
  }

  const valueStart = entry.count <= 4 ? entry.entryOffset + 8 : context.tiffStart + entry.valueOffset;
  return readAscii(context.view, valueStart, entry.count).replace(/\0/g, "");
}

function readDms(context: TiffContext, entry: IfdEntry): number | null {
  if (entry.type !== 5 || entry.count !== 3) {
    return null;
  }

  const valueStart = context.tiffStart + entry.valueOffset;
  const degrees = readRational(context, valueStart);
  const minutes = readRational(context, valueStart + 8);
  const seconds = readRational(context, valueStart + 16);

  if ([degrees, minutes, seconds].some((value) => value === null)) {
    return null;
  }

  return (degrees as number) + (minutes as number) / 60 + (seconds as number) / 3600;
}

function readRational(context: TiffContext, offset: number): number | null {
  const numerator = readUint32(context, offset);
  const denominator = readUint32(context, offset + 4);

  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

function readUint16(context: TiffContext, offset: number): number {
  return context.view.getUint16(offset, context.littleEndian);
}

function readUint32(context: TiffContext, offset: number): number {
  return context.view.getUint32(offset, context.littleEndian);
}

function readAscii(view: DataView, offset: number, length: number): string {
  let value = "";

  for (let index = 0; index < length && offset + index < view.byteLength; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }

  return value;
}
