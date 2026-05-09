# QR Generator

React + TypeScript で構築した静的な QR Code 生成 SPA です。

すべてのオプションはクエリパラメータで制御できるため、ブラウザの検索エンジン機能を使って URL バーから直接 QR を生成できます。

## セットアップ

依存パッケージのインストール:

```bash
bun install
```

開発サーバーの起動:

```bash
bun dev
```

本番ビルド:

```bash
bun run build
```

## クエリパラメータ

デフォルト値と同じ場合は URL に出力されません。

| パラメータ | 内容 | デフォルト |
| --- | --- | --- |
| `text` | QR コードに埋め込むテキスト | `https://example.com` |
| `ecl` | 誤り訂正レベル（`L` / `M` / `Q` / `H`） | `M` |
| `margin` | 余白（クワイエットゾーン）のモジュール数（0–20） | `4` |
| `width` | 出力幅（px）（128–2048） | `512` |
| `mask` | マスクパターン（`auto` または `0`–`7`） | `auto` |
| `dark` | 前景色（`#rrggbb`） | `#000000` |
| `light` | 背景色（`#rrggbb`） | `#ffffff` |
| `format` | 出力形式（`svg` / `png` / `jpeg` / `webp`） | `svg` |
| `quality` | JPEG/WebP の品質（`0.1`–`1.0`）| `0.92` |

## 検索エンジンへの登録

ブラウザの検索エンジン設定に以下の形式で登録すると、URL バーのキーワードから直接 QR を生成できます。

```
http://<ホスト>/?text=%s
```

アプリ内の「検索エンジンに登録」カードにも登録用 URL が表示されます（現在のオプションが反映された状態でコピーできます）。

## E2E テスト（Playwright）

ブラウザのインストール（初回のみ）:

```bash
bunx playwright install
```

テストの実行:

```bash
bun run test:e2e
```

## デプロイ（Cloudflare Pages）

完全にブラウザで動作する静的サイトです。

- **ビルドコマンド:** `bun run build`
- **出力ディレクトリ:** `dist`

---

QR Code は株式会社デンソーウェーブの登録商標です。
