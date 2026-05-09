import * as QRCode from "qrcode";
import type { QRCodeToDataURLOptions, QRCodeToStringOptions } from "qrcode";

import type { QRGeneratorOptions, QRImageFormat } from "@/lib/qr-options";

export interface QRPreviewResult {
  src: string;
  extension: QRImageFormat;
  mimeType: string;
}

function buildSharedOptions(options: QRGeneratorOptions) {
  return {
    errorCorrectionLevel: options.errorCorrectionLevel,
    margin: options.margin,
    scale: options.scale,
    width: options.width,
    version: options.version ?? undefined,
    maskPattern: options.maskPattern ?? undefined,
    color: {
      dark: options.darkColor,
      light: options.lightColor,
    },
  };
}

export async function generateQRPreview(options: QRGeneratorOptions): Promise<QRPreviewResult> {
  const value = options.text.trim();
  if (!value) {
    throw new Error("エンコードする文字列を入力してください。");
  }

  const shared = buildSharedOptions(options);

  if (options.format === "svg") {
    const svgOptions: QRCodeToStringOptions = {
      ...shared,
      type: "svg",
    };
    const svg = await QRCode.toString(value, svgOptions);
    return {
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      extension: "svg",
      mimeType: "image/svg+xml",
    };
  }

  const mimeType = options.format === "png" ? "image/png" : options.format === "jpeg" ? "image/jpeg" : "image/webp";
  const rasterOptions: QRCodeToDataURLOptions =
    options.format === "jpeg" || options.format === "webp"
      ? {
          ...shared,
          type: mimeType,
          rendererOpts: {
            quality: options.quality,
          },
        }
      : {
          ...shared,
          type: mimeType,
        };

  return {
    src: await QRCode.toDataURL(value, rasterOptions),
    extension: options.format,
    mimeType,
  };
}
