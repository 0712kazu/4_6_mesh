import './style.css';

import GeoJSON from 'ol/format/GeoJSON.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Feature from 'ol/Feature.js';
import Polygon from 'ol/geom/Polygon.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import XYZ from 'ol/source/XYZ.js';
import VectorSource from 'ol/source/Vector.js';
import { Fill, Stroke, Style } from 'ol/style.js';
import { fromLonLat, transform } from 'ol/proj.js';
import { createEmpty, extend as extendExtent } from 'ol/extent.js';

const GSI_STD_URL = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
const GSI_HILLSHADE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png';
const INITIAL_CENTER = fromLonLat([139.7671, 35.6812]);
const INITIAL_ZOOM = 9;
const DEFAULT_PADDING = [48, 48, 48, 48];

const cellSizeInput = document.getElementById('cellSize');
const colsInput = document.getElementById('cols');
const rowsInput = document.getElementById('rows');
const bgOpacityInput = document.getElementById('bgOpacity');
const bgOpacityValueEl = document.getElementById('bgOpacityValue');
const fileBaseNameInput = document.getElementById('fileBaseName');
const centerXEl = document.getElementById('centerX');
const centerYEl = document.getElementById('centerY');
const lonEl = document.getElementById('lon');
const latEl = document.getElementById('lat');
const exportGeoJsonBtn = document.getElementById('exportGeoJsonBtn');
const exportPngBtn = document.getElementById('exportPngBtn');
const fitMeshBtn = document.getElementById('fitMeshBtn');

const meshSource = new VectorSource();
const meshLayer = new VectorLayer({
  source: meshSource,
  style: new Style({
    fill: new Fill({ color: 'rgba(0,0,0,0)' }),
    stroke: new Stroke({ color: '#808080', width: 1.5 }),
  }),
});

const baseLayer = new TileLayer({
  className: 'base-layer',
  source: new XYZ({
    url: GSI_STD_URL,
    crossOrigin: 'anonymous',
    attributions: '地理院タイル',
  }),
});

const hillshadeLayer = new TileLayer({
  className: 'hillshade-layer',
  source: new XYZ({
    url: GSI_HILLSHADE_URL,
    crossOrigin: 'anonymous',
    attributions: '地理院タイル',
  }),
  opacity: 0.8,
});

const map = new Map({
  target: 'map',
  layers: [baseLayer, hillshadeLayer, meshLayer],
  view: new View({
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    projection: 'EPSG:3857',
  }),
});

let lastCenter = null;

function formatNumber(value, digits = 3, useGrouping = true) {
  return Number(value).toLocaleString('ja-JP', {
    useGrouping,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatMeterCoordinate(value) {
  return formatNumber(value, 3, false);
}

function formatLatLon(value) {
  return formatNumber(value, 6, false);
}

function sanitizeFilenamePart(value) {
  return String(value)
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');
}

function getCenterFilenamePart(value) {
  return sanitizeFilenamePart(Number(value).toFixed(3));
}

function getDefaultBaseName(center = lastCenter) {
  if (!center) return 'mesh';
  const xPart = getCenterFilenamePart(center[0]);
  const yPart = getCenterFilenamePart(center[1]);
  return `mesh_${xPart}_${yPart}`;
}

function getBaseFilename() {
  const raw = fileBaseNameInput.value.trim();
  if (raw) return sanitizeFilenamePart(raw);

  const defaultName = getDefaultBaseName();
  fileBaseNameInput.value = defaultName;
  return defaultName;
}

function updateFileBaseName(center) {
  fileBaseNameInput.value = getDefaultBaseName(center);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readPositiveInt(input, fallback) {
  const value = Number.parseInt(input.value, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readPositiveFloat(input, fallback) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function buildSquareRing(minX, minY, maxX, maxY) {
  return [[
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ]];
}

function getMeshExtent() {
  const features = meshSource.getFeatures();
  if (!features.length) return null;

  const extent = createEmpty();
  for (const feature of features) {
    extendExtent(extent, feature.getGeometry().getExtent());
  }
  return extent;
}

function updateCoordinatePanel(center) {
  const [lon, lat] = transform(center, 'EPSG:3857', 'EPSG:4326');
  centerXEl.textContent = formatMeterCoordinate(center[0]);
  centerYEl.textContent = formatMeterCoordinate(center[1]);
  lonEl.textContent = formatLatLon(lon);
  latEl.textContent = formatLatLon(lat);
}

function updateBackgroundOpacity() {
  const value = Math.max(0, Math.min(100, Number(bgOpacityInput.value) || 0));
  const ratio = value / 100;

  bgOpacityInput.value = String(value);
  bgOpacityValueEl.textContent = `${value}%`;

  baseLayer.setOpacity(ratio);
  hillshadeLayer.setOpacity(0.8 * ratio);
}

function generateMesh(center) {
  const cellSize = readPositiveFloat(cellSizeInput, 1500);
  const cols = readPositiveInt(colsInput, 6);
  const rows = readPositiveInt(rowsInput, 4);

  cellSizeInput.value = String(cellSize);
  colsInput.value = String(cols);
  rowsInput.value = String(rows);

  const totalWidth = cols * cellSize;
  const totalHeight = rows * cellSize;
  const originX = center[0] - totalWidth / 2;
  const originY = center[1] - totalHeight / 2;

  const features = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const minX = originX + col * cellSize;
      const minY = originY + row * cellSize;
      const maxX = minX + cellSize;
      const maxY = minY + cellSize;

      const feature = new Feature({
        geometry: new Polygon(buildSquareRing(minX, minY, maxX, maxY)),
        row: row + 1,
        col: col + 1,
        center_x: center[0],
        center_y: center[1],
        cell_size: cellSize,
      });

      features.push(feature);
    }
  }

  meshSource.clear(true);
  meshSource.addFeatures(features);
  lastCenter = center;
  updateCoordinatePanel(center);
  updateFileBaseName(center);
}

function fitMesh() {
  const extent = getMeshExtent();
  if (!extent) return;
  map.getView().fit(extent, {
    padding: DEFAULT_PADDING,
    duration: 250,
    maxZoom: 18,
  });
}

function exportGeoJSON() {
  if (!meshSource.getFeatures().length) {
    window.alert('先に地図上をクリックしてメッシュを生成してください。');
    return;
  }

  const format = new GeoJSON();
  const geojson = format.writeFeatures(meshSource.getFeatures(), {
    featureProjection: 'EPSG:3857',
    dataProjection: 'EPSG:4326',
    rightHanded: true,
    decimals: 8,
  });

  const baseName = getBaseFilename();
  const blob = new Blob([geojson], { type: 'application/geo+json;charset=utf-8' });
  downloadBlob(blob, `${baseName}.geojson`);
}

function applyCanvasTransform(context, canvas) {
  const transform = canvas.style.transform;

  if (transform && transform.startsWith('matrix(')) {
    const values = transform
      .slice(7, -1)
      .split(',')
      .map((value) => Number(value.trim()));

    if (values.length === 6 && values.every((value) => Number.isFinite(value))) {
      context.setTransform(...values);
      return;
    }
  }

  const width = Number.parseFloat(canvas.style.width);
  const height = Number.parseFloat(canvas.style.height);

  if (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    context.setTransform(
      canvas.width / width,
      0,
      0,
      canvas.height / height,
      0,
      0
    );
    return;
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
}

function drawLayerGroup(context, layerElement, opacity, compositeOperation = 'source-over') {
  if (!layerElement) return;

  const canvases = Array.from(layerElement.querySelectorAll('canvas'));
  if (!canvases.length) return;

  for (const canvas of canvases) {
    if (canvas.width === 0 || canvas.height === 0) continue;

    context.save();
    context.globalAlpha = opacity;
    context.globalCompositeOperation = compositeOperation;

    applyCanvasTransform(context, canvas);

    const backgroundColor = canvas.parentElement?.style.backgroundColor;
    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(canvas, 0, 0);
    context.restore();
  }
}

function drawExportCanvas() {
  const size = map.getSize();
  if (!size) {
    throw new Error('地図サイズを取得できませんでした。');
  }

  const [width, height] = size;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;

  const context = exportCanvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas コンテキストを作成できませんでした。');
  }

  const layerElements = Array.from(map.getViewport().querySelectorAll('.ol-layer'));

  if (!layerElements.length) {
    throw new Error('描画対象レイヤの取得に失敗しました。');
  }

  const baseLayerElement = layerElements[0] || null;
  const hillshadeLayerElement = layerElements[1] || null;
  const meshLayerElement = layerElements[2] || null;

  drawLayerGroup(context, baseLayerElement, baseLayer.getOpacity(), 'source-over');
  drawLayerGroup(context, hillshadeLayerElement, hillshadeLayer.getOpacity(), 'multiply');
  drawLayerGroup(context, meshLayerElement, 1, 'source-over');

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';

  return exportCanvas;
}

function exportPng() {
  if (!meshSource.getFeatures().length) {
    window.alert('先に地図上をクリックしてメッシュを生成してください。');
    return;
  }

  const extent = getMeshExtent();
  if (!extent) return;

  map.getView().fit(extent, {
    padding: DEFAULT_PADDING,
    duration: 0,
    maxZoom: 18,
  });

  map.once('rendercomplete', () => {
    try {
      const canvas = drawExportCanvas();
      const baseName = getBaseFilename();

      canvas.toBlob((blob) => {
        if (!blob) {
          window.alert('PNG の生成に失敗しました。');
          return;
        }
        downloadBlob(blob, `${baseName}.png`);
      }, 'image/png');
    } catch (error) {
      console.error('PNG export error:', error);
      window.alert(`PNG の書き出し中にエラーが発生しました: ${error.message}`);
    }
  });

  map.renderSync();
}

map.on('singleclick', (event) => {
  generateMesh(event.coordinate);
});

bgOpacityInput.addEventListener('input', updateBackgroundOpacity);
fitMeshBtn.addEventListener('click', fitMesh);
exportGeoJsonBtn.addEventListener('click', exportGeoJSON);
exportPngBtn.addEventListener('click', exportPng);

updateBackgroundOpacity();

if (!lastCenter) {
  generateMesh(INITIAL_CENTER);
  fitMesh();
}