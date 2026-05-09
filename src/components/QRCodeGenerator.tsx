import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildQRQuery,
  DEFAULT_QR_OPTIONS,
  ERROR_CORRECTION_LEVELS,
  IMAGE_FORMATS,
  isLossyFormat,
  parseQRQuery,
  type QRGeneratorOptions,
} from "@/lib/qr-options";
import { generateQRPreview, type QRPreviewResult } from "@/lib/qr-preview";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={handleClick}>
      {copied ? "コピー済" : "コピー"}
    </Button>
  );
}

function formatErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** Number input that only commits on blur or Enter, so the user can freely
 *  select-all and retype without intermediate values firing. */
interface NumberInputProps {
  value: number | null;
  min: number;
  max: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
  id?: string;
  onCommit: (value: number | null) => void;
  /** When true, empty string commits as null (optional field). */
  nullable?: boolean;
  /** Parse as float instead of int. */
  float?: boolean;
}

function NumberInput({ value, min, max, step, placeholder, disabled, onCommit, nullable, float, ...rest }: NumberInputProps) {
  const [local, setLocal] = useState(value === null ? "" : String(value));
  const prevValueRef = useRef(value);

  // Sync when the external value changes (e.g. reset or popstate)
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setLocal(value === null ? "" : String(value));
    }
  }, [value]);

  const commitString = (raw: string) => {
    if (raw === "" && nullable) {
      onCommit(null);
      return;
    }
    const parsed = float ? Number.parseFloat(raw) : Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setLocal(value === null ? "" : String(value));
      return;
    }
    const clamped = float
      ? Number(clamp(parsed, min, max).toFixed(2))
      : clamp(parsed, min, max);
    setLocal(String(clamped));
    onCommit(clamped);
  };

  const commit = () => commitString(local);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocal(e.target.value);
    // Spinner buttons and arrow-key increments fire inputType="insertReplacementText".
    // Commit immediately for these; typed input is committed only on blur/Enter.
    const inputType = (e.nativeEvent as InputEvent).inputType;
    if (inputType === "insertReplacementText") {
      commitString(e.target.value);
    }
  };

  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      value={local}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
      {...rest}
    />
  );
}

export function QRCodeGenerator() {
  const initialQuery = parseQRQuery(window.location.search);
  const [options, setOptions] = useState<QRGeneratorOptions>(initialQuery.options);
  const [queryWarnings, setQueryWarnings] = useState<string[]>(initialQuery.warnings);
  const [preview, setPreview] = useState<QRPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryString = useMemo(() => buildQRQuery(options), [options]);

  const searchEngineUrl = useMemo(() => {
    const params = new URLSearchParams(queryString);
    params.delete("text");
    const rest = params.toString();
    const qs = rest ? `${rest}&text=%s` : `text=%s`;
    return `${window.location.origin}${window.location.pathname}?${qs}`;
  }, [queryString]);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseQRQuery(window.location.search);
      setOptions(parsed.options);
      setQueryWarnings(parsed.warnings);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const nextUrl = `${window.location.pathname}?${queryString}`;
    window.history.replaceState(null, "", nextUrl);
  }, [queryString]);

  useEffect(() => {
    let cancelled = false;
    setIsGenerating(true);
    setPreviewError(null);

    generateQRPreview(options)
      .then(result => {
        if (cancelled) return;
        setPreview(result);
      })
      .catch(error => {
        if (cancelled) return;
        setPreview(null);
        setPreviewError(formatErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [options]);

  const updateOptions = (updater: (current: QRGeneratorOptions) => QRGeneratorOptions) => {
    setQueryWarnings([]);
    setOptions(current => updater(current));
  };

  const downloadName = `qr-code.${preview?.extension ?? options.format}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">QR Generator</h1>
      </section>

      {queryWarnings.length > 0 && (
        <div
          data-testid="query-warning"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
        >
          {queryWarnings.join(" ")}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,440px)]">
        {/* ── Options panel ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="gap-2">
            <CardTitle>QR オプション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Text input */}
            <div className="space-y-2">
              <Label htmlFor="qr-text">内容</Label>
              <Textarea
                id="qr-text"
                data-testid="text-input"
                value={options.text}
                onChange={event => updateOptions(current => ({ ...current, text: event.target.value }))}
                className="min-h-32 resize-y"
                placeholder="https://example.com"
              />
            </div>

            {/* Grid of option controls */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* ECL */}
              <div className="space-y-2">
                <Label htmlFor="ecl">誤り訂正レベル</Label>
                <Select
                  value={options.errorCorrectionLevel}
                  onValueChange={value =>
                    updateOptions(current => ({
                      ...current,
                      errorCorrectionLevel: value as QRGeneratorOptions["errorCorrectionLevel"],
                    }))
                  }
                >
                  <SelectTrigger id="ecl" data-testid="ecl-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ERROR_CORRECTION_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Margin */}
              <div className="space-y-2">
                <Label htmlFor="margin">余白 (margin)</Label>
                <NumberInput
                  id="margin"
                  data-testid="margin-input"
                  min={0}
                  max={20}
                  value={options.margin}
                  onCommit={v => updateOptions(current => ({ ...current, margin: v ?? DEFAULT_QR_OPTIONS.margin }))}
                />
              </div>

              {/* Width */}
              <div className="space-y-2">
                <Label htmlFor="width">幅 px (width)</Label>
                <NumberInput
                  id="width"
                  data-testid="width-input"
                  min={128}
                  max={2048}
                  value={options.width}
                  onCommit={v => updateOptions(current => ({ ...current, width: v ?? DEFAULT_QR_OPTIONS.width }))}
                />
              </div>

              {/* Mask */}
              <div className="space-y-2">
                <Label htmlFor="mask">マスク (mask)</Label>
                <NumberInput
                  id="mask"
                  data-testid="mask-input"
                  min={0}
                  max={7}
                  placeholder="auto"
                  value={options.maskPattern}
                  nullable
                  onCommit={v => updateOptions(current => ({ ...current, maskPattern: v }))}
                />
              </div>

              {/* Format */}
              <div className="space-y-2">
                <Label htmlFor="format">画像形式 (format)</Label>
                <Select
                  value={options.format}
                  onValueChange={value =>
                    updateOptions(current => ({ ...current, format: value as QRGeneratorOptions["format"] }))
                  }
                >
                  <SelectTrigger id="format" data-testid="format-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_FORMATS.map(format => (
                      <SelectItem key={format} value={format}>
                        {format}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Label htmlFor="quality">品質 (quality)</Label>
                <NumberInput
                  id="quality"
                  data-testid="quality-input"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={options.quality}
                  disabled={!isLossyFormat(options.format)}
                  float
                  onCommit={v =>
                    updateOptions(current => ({ ...current, quality: v ?? DEFAULT_QR_OPTIONS.quality }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {isLossyFormat(options.format)
                    ? "JPEG / WebP 出力時に使用します。"
                    : "PNG / SVG では使われません。"}
                </p>
              </div>

              {/* Dark color */}
              <div className="space-y-2">
                <Label htmlFor="dark-color">濃色 (dark)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="dark-color"
                    data-testid="dark-color-input"
                    type="color"
                    value={options.darkColor}
                    onChange={event => updateOptions(current => ({ ...current, darkColor: event.target.value }))}
                    className="h-10 w-16 cursor-pointer p-1"
                  />
                  <code className="text-sm text-muted-foreground">{options.darkColor}</code>
                </div>
              </div>

              {/* Light color */}
              <div className="space-y-2">
                <Label htmlFor="light-color">淡色 (light)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="light-color"
                    data-testid="light-color-input"
                    type="color"
                    value={options.lightColor}
                    onChange={event => updateOptions(current => ({ ...current, lightColor: event.target.value }))}
                    className="h-10 w-16 cursor-pointer p-1"
                  />
                  <code className="text-sm text-muted-foreground">{options.lightColor}</code>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQueryWarnings([]);
                  setOptions(DEFAULT_QR_OPTIONS);
                }}
                data-testid="reset-button"
              >
                既定値に戻す
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Right column ──────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Preview card */}
          <Card>
            <CardHeader className="gap-2">
              <CardTitle>プレビュー</CardTitle>
              <CardDescription>画像は右クリックでコピー・保存できます。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex min-h-[360px] items-center justify-center rounded-xl border bg-muted/30 p-4"
                style={{ backgroundColor: options.lightColor }}
              >
                {preview ? (
                  <img
                    data-testid="qr-preview-image"
                    src={preview.src}
                    alt={`QR code for: ${options.text || "empty"}`}
                    className="block max-h-[340px] max-w-full rounded-lg object-contain shadow-sm"
                  />
                ) : (
                  <p data-testid="qr-preview-placeholder" className="text-sm text-muted-foreground">
                    {isGenerating ? "QR Code を生成中..." : "プレビューはここに表示されます。"}
                  </p>
                )}
              </div>

              {previewError && (
                <p data-testid="preview-error" className="text-sm text-destructive">
                  {previewError}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button asChild disabled={!preview}>
                  <a href={preview?.src ?? "#"} download={downloadName} data-testid="download-link">
                    画像をダウンロード
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search engine hint card */}
          <Card>
            <CardHeader className="gap-2">
              <CardTitle>検索エンジンに登録</CardTitle>
              <CardDescription>
                キーワード「QR」などで登録すると、アドレスバーから直接 QR を生成できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={searchEngineUrl}
                  className="font-mono text-xs"
                  onFocus={e => e.currentTarget.select()}
                />
                <CopyButton value={searchEngineUrl} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        QRコードは株式会社デンソーウェーブの登録商標です。
      </p>
    </main>
  );
}
