# 4_6_mesh

固定サイズのメッシュを地図上で生成し、**GeoJSON** と **PNG** として出力できる Web アプリです。  
OpenLayers を使用しており、GitHub Pages 上で動作します。

デモ  
https://0712kazu.github.io/4_6_mesh/

---

# 概要

地図上をクリックすると、その地点を基準に **指定サイズのメッシュグリッド**を生成します。

主な用途

- GIS用メッシュ作成
- 調査区画作成
- 図面作成用グリッド
- 1/25000 図郭ベースのメッシュ生成

---

# 主な機能

## メッシュ生成

- 地図クリックでメッシュ作成
- 横マス数・縦マス数を指定可能
- 1マスのサイズ（m）を指定可能
- メッシュは **EPSG:3857 (Webメルカトル)** で正方形

## 中心座標表示

表示される座標

- EPSG:3857 (m)
- WGS84 (緯度経度)

クリックした座標がそのまま表示されます。

---

# メッシュ生成の安定化処理

クリックした座標が **メッシュ境界と一致する場合の不安定さを避けるため**  
内部的に以下の処理を行っています。

メッシュ生成時のみ

**中心座標を北東方向に 1/4 メッシュ移動**

```
mesh_center_x = click_x + cellSize / 4
mesh_center_y = click_y + cellSize / 4
```

つまり

|用途|使用座標|
|---|---|
|表示座標|クリック位置|
|ファイル名|クリック位置|
|GeoJSON属性|クリック位置|
|メッシュ生成|1/4メッシュオフセット|

この処理により

- メッシュ境界一致問題
- 浮動小数誤差
- タイル境界問題

を回避しています。

---

# 背景地図

使用している地図

### 地理院タイル

淡色地図  
https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png

陰影起伏図  
https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png

表示方法

```
淡色地図
×
陰影起伏図（乗算）
```

背景透過率はUIから調整できます。  
デフォルトは **55%**。

---

# 出力機能

## GeoJSON

座標系

**EPSG:4326（緯度経度）**

各ポリゴン属性

```
row
col
center_x
center_y
mesh_center_x
mesh_center_y
cell_size
```

---

## PNG

PNG出力内容

- 背景地図
- 陰影起伏
- メッシュ

PNGは **現在のメッシュ範囲に自動ズーム**して書き出します。

---

# ファイル名

デフォルト

```
mesh_{centerX}_{centerY}
```

例

```
mesh_15544394.472_4230071.807
```

UIから自由に変更できます。

---

# 使い方

1. メッシュ設定を指定  
   - 1マスサイズ  
   - 横マス数  
   - 縦マス数  

2. 地図をクリック  

3. メッシュが生成される  

4. 必要に応じて
   - 背景透過率調整
   - ファイル名変更

5. 出力

```
GeoJSONを書き出し
PNGを書き出し
```

---

# 開発環境

```
Node.js
Vite
OpenLayers
```

---

# ローカル実行

```
npm install
npm run dev
```

---

# ビルド

```
npm run build
```

---

# デプロイ

GitHub Actions により  
**GitHub Pages へ自動デプロイ**

```
push → build → deploy
```

公開URL

```
https://0712kazu.github.io/4_6_mesh/
```

---

# 使用ライブラリ

OpenLayers  
https://openlayers.org/

---

# ライセンス

MIT