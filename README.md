# 固定サイズメッシュ生成ツール

## セットアップ

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

## 仕様

- OpenLayers + Vite のシンプルな Web アプリ
- EPSG:3857 上で固定サイズの正方形メッシュを生成
- 地図クリック位置を中心に、任意の縦横マス数でメッシュを生成
- 背景は地理院タイルの淡色地図 + 陰影起伏図
- 陰影起伏図は multiply / 80% opacity 相当で描画
- 生成メッシュは塗りなし・グレー枠線
- GeoJSON 出力
- メッシュ全体が収まる表示範囲で PNG 出力
