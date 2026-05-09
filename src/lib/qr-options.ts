import type { QRCodeMaskPattern } from "qrcode";

export const ERROR_CORRECTION_LEVELS = ["L", "M", "Q", "H"] as const;
export const IMAGE_FORMATS = ["png", "jpeg", "webp", "svg"] as const;

export type QRErrorCorrectionLevel = (typeof ERROR_CORRECTION_LEVELS)[number];
export type QRImageFormat = (typeof IMAGE_FORMATS)[number];

export interface QRGeneratorOptions {
  text: string;
  errorCorrectionLevel: QRErrorCorrectionLevel;
  margin: number;
  scale: number;
  width: number;
  version: number | null;
  maskPattern: QRCodeMaskPattern | null;
  darkColor: string;
  lightColor: string;
  format: QRImageFormat;
  quality: number;
}

export interface QRQueryParseResult {
  options: QRGeneratorOptions;
  warnings: string[];
}

export const DEFAULT_QR_OPTIONS: QRGeneratorOptions = {
  text: "https://example.com",
  errorCorrectionLevel: "M",
  margin: 4,
  scale: 8,
  width: 512,
  version: null,
  maskPattern: null,
  darkColor: "#000000",
  lightColor: "#ffffff",
  format: "svg",
  quality: 0.92,
};

const COLOR_PATTERN = /^#(?:[0-9a-f]{6})$/i;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseIntegerParam(
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
  warnings: string[],
) {
  const value = params.get(key);
  if (value === null) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    warnings.push(`クエリパラメータ ${key} が不正だったため既定値に戻しました。`);
    return fallback;
  }

  if (parsed < min || parsed > max) {
    warnings.push(`クエリパラメータ ${key} は ${min}-${max} の範囲に補正しました。`);
  }

  return clamp(parsed, min, max);
}

function parseOptionalIntegerParam(
  params: URLSearchParams,
  key: string,
  min: number,
  max: number,
  warnings: string[],
) {
  const value = params.get(key);
  if (value === null || value === "" || value === "auto") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    warnings.push(`クエリパラメータ ${key} が不正だったため auto に戻しました。`);
    return null;
  }

  if (parsed < min || parsed > max) {
    warnings.push(`クエリパラメータ ${key} は ${min}-${max} の範囲に補正しました。`);
  }

  return clamp(parsed, min, max);
}

function parseQualityParam(params: URLSearchParams, warnings: string[]) {
  const value = params.get("quality");
  if (value === null) {
    return DEFAULT_QR_OPTIONS.quality;
  }

  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    warnings.push("クエリパラメータ quality が不正だったため既定値に戻しました。");
    return DEFAULT_QR_OPTIONS.quality;
  }

  if (parsed < 0.1 || parsed > 1) {
    warnings.push("クエリパラメータ quality は 0.1-1.0 の範囲に補正しました。");
  }

  return Number(clamp(parsed, 0.1, 1).toFixed(2));
}

function parseEnumParam<T extends readonly string[]>(
  params: URLSearchParams,
  key: string,
  allowed: T,
  fallback: T[number],
  warnings: string[],
): T[number] {
  const value = params.get(key);
  if (value === null) {
    return fallback;
  }

  if (!allowed.includes(value)) {
    warnings.push(`クエリパラメータ ${key} が不正だったため既定値に戻しました。`);
    return fallback;
  }

  return value as T[number];
}

function parseColorParam(params: URLSearchParams, key: "dark" | "light", fallback: string, warnings: string[]) {
  const value = params.get(key);
  if (value === null) {
    return fallback;
  }

  if (!COLOR_PATTERN.test(value)) {
    warnings.push(`クエリパラメータ ${key} は #rrggbb 形式のみ対応です。`);
    return fallback;
  }

  return value.toLowerCase();
}

export function parseQRQuery(search: string): QRQueryParseResult {
  const params = new URLSearchParams(search);
  const warnings: string[] = [];
  const version = parseOptionalIntegerParam(params, "version", 1, 40, warnings);
  const maskValue = parseOptionalIntegerParam(params, "mask", 0, 7, warnings);

  return {
    options: {
      text: params.get("text") ?? DEFAULT_QR_OPTIONS.text,
      errorCorrectionLevel: parseEnumParam(
        params,
        "ecl",
        ERROR_CORRECTION_LEVELS,
        DEFAULT_QR_OPTIONS.errorCorrectionLevel,
        warnings,
      ),
      margin: parseIntegerParam(params, "margin", DEFAULT_QR_OPTIONS.margin, 0, 20, warnings),
      scale: parseIntegerParam(params, "scale", DEFAULT_QR_OPTIONS.scale, 1, 20, warnings),
      width: parseIntegerParam(params, "width", DEFAULT_QR_OPTIONS.width, 128, 2048, warnings),
      version,
      maskPattern: maskValue as QRCodeMaskPattern | null,
      darkColor: parseColorParam(params, "dark", DEFAULT_QR_OPTIONS.darkColor, warnings),
      lightColor: parseColorParam(params, "light", DEFAULT_QR_OPTIONS.lightColor, warnings),
      format: parseEnumParam(params, "format", IMAGE_FORMATS, DEFAULT_QR_OPTIONS.format, warnings),
      quality: parseQualityParam(params, warnings),
    },
    warnings,
  };
}

function setIfNotDefault<K extends keyof QRGeneratorOptions>(
  params: URLSearchParams,
  key: string,
  value: QRGeneratorOptions[K],
  serialized: string,
  defaultValue: QRGeneratorOptions[K],
) {
  if (value !== defaultValue) {
    params.set(key, serialized);
  }
}

export function buildQRQuery(options: QRGeneratorOptions) {
  const params = new URLSearchParams();
  const d = DEFAULT_QR_OPTIONS;

  // text is always included – it's the primary payload
  params.set("text", options.text);

  setIfNotDefault(params, "ecl", options.errorCorrectionLevel, options.errorCorrectionLevel, d.errorCorrectionLevel);
  setIfNotDefault(params, "margin", options.margin, String(options.margin), d.margin);
  setIfNotDefault(params, "scale", options.scale, String(options.scale), d.scale);
  setIfNotDefault(params, "width", options.width, String(options.width), d.width);

  // Optional fields: null means "auto" which is the default
  if (options.version !== null) params.set("version", String(options.version));
  if (options.maskPattern !== null) params.set("mask", String(options.maskPattern));

  setIfNotDefault(params, "dark", options.darkColor, options.darkColor.toLowerCase(), d.darkColor);
  setIfNotDefault(params, "light", options.lightColor, options.lightColor.toLowerCase(), d.lightColor);
  setIfNotDefault(params, "format", options.format, options.format, d.format);

  // quality is only meaningful for lossy formats; skip if default or format is lossless
  if (isLossyFormat(options.format) && options.quality !== d.quality) {
    params.set("quality", options.quality.toFixed(2));
  }

  return params.toString();
}

export function isLossyFormat(format: QRImageFormat) {
  return format === "jpeg" || format === "webp";
}
