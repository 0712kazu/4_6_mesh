# 固定サイズメッシュ生成ツール

OpenLayers + Vite で作った、EPSG:3857 上の固定サイズ正方形メッシュ生成アプリです。

## ローカル起動

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

## GitHub Pages で公開する手順

このプロジェクトには GitHub Pages 用の Actions ワークフローを同梱しています。

1. このフォルダ一式を GitHub リポジトリに push する
2. GitHub の `Settings` → `Pages` を開く
3. `Build and deployment` の `Source` を `GitHub Actions` にする
4. `main` ブランチへ push すると自動で公開される

公開先が通常のプロジェクトページ
`https://<ユーザー名>.github.io/<リポジトリ名>/`
の場合は、そのままで動きます。

### カスタムドメインやユーザーサイトで公開する場合

このプロジェクトは `vite.config.js` でベースパスを切り替えられます。

- 通常の GitHub Pages プロジェクトページ: 自動で `/<repo>/` を使用
- ユーザーサイトやカスタムドメイン: `VITE_BASE_PATH=/` でビルド

例:

```bash
VITE_BASE_PATH=/ npm run build
```

GitHub Pages のカスタムドメイン設定は GitHub 側の `Settings` → `Pages` で行ってください。

## 仕様

- OpenLayers + Vite のシンプルな Web アプリ
- EPSG:3857 上で固定サイズの正方形メッシュを生成
- 地図クリック位置を中心に、任意の縦横マス数でメッシュを生成
- 背景は地理院タイルの淡色地図 + 陰影起伏図
- 陰影起伏図は multiply / 80% opacity 相当で描画
- 生成メッシュは塗りなし・グレー枠線
- GeoJSON 出力
- メッシュ全体が収まる表示範囲で PNG 出力
