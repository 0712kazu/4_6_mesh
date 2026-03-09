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
import {Fill, Stroke, Style} from 'ol/style.js';
import {fromLonLat, transform} from 'ol/proj.js';
import {createEmpty, extend as extendExtent} from 'ol/extent.js';

const GSI_STD_URL = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
const GSI_RELIEF_URL = 'https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png';
const INITIAL_CENTER = fromLonLat([139.7671, 35.6812]);
const INITIAL_ZOOM = 9;
const DEFAULT_PADDING = [48, 48, 48, 48];

const cellSizeInput = document.getElementById('cellSize');
const colsInput = document.getElementById('cols');
const rowsInput = document.getElementById('rows');
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
    fill: new Fill({color: 'rgba(0,0,0,0)'}),
    stroke: new Stroke({color: '#808080', width: 1.5}),
  }),
});

const baseLayer = new TileLayer({
  source: new XYZ({
    url: GSI_STD_URL,
    crossOrigin: 'anonymous',
    attributions: '地理院タイル',
  }),
});

const reliefLayer = new TileLayer({
  className: 'relief-layer',
  source: new XYZ({
    url: GSI_RELIEF_URL,
    crossOrigin: 'anonymous',
    attributions: '地理院タイル',
  }),
});

const map = new Map({
  target: 'map',
  layers: [baseLayer, reliefLayer, meshLayer],
  view: new View({
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    projection: 'EPSG:3857',
  }),
});

let lastCenter = null;

function formatNumber(value, digits = 3) {
  return Number(value).toLocaleString('ja-JP', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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
  centerXEl.textContent = formatNumber(center[0], 3);
  centerYEl.textContent = formatNumber(center[1], 3);
  lonEl.textContent = formatNumber(lon, 6);
  latEl.textContent = formatNumber(lat, 6);
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
    dataProjection: 'EPSG:3857',
    rightHanded: true,
    decimals: 3,
  });

  const blob = new Blob([geojson], {type: 'application/geo+json;charset=utf-8'});
  downloadBlob(blob, 'mesh.geojson');
}

function drawExportCanvas() {
  const size = map.getSize();
  if (!size) throw new Error('地図サイズを取得できませんでした。');

  const [width, height] = size;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const context = exportCanvas.getContext('2d');

  if (!context) throw new Error('Canvas コンテキストを作成できませんでした。');

  const layerCanvases = map.getViewport().querySelectorAll('.ol-layer canvas, canvas.ol-layer');

  layerCanvases.forEach((canvas) => {
    if (canvas.width === 0 || canvas.height === 0) return;

    const opacity = canvas.parentElement?.style.opacity || canvas.style.opacity || '1';
    context.globalAlpha = Number(opacity) || 1;

    const parentClass = canvas.parentElement?.className || '';
    context.globalCompositeOperation = String(parentClass).includes('relief-layer') ? 'multiply' : 'source-over';
    if (String(parentClass).includes('relief-layer')) {
      context.globalAlpha *= 0.8;
    }

    const transform = canvas.style.transform;
    if (transform) {
      const matrix = transform
        .match(/^matrix\(([^\(]*)\)$/)?.[1]
        .split(',')
        .map(Number);

      if (matrix && matrix.length === 6) {
        context.setTransform(...matrix);
      } else {
        context.setTransform(1, 0, 0, 1, 0, 0);
      }
    } else {
      context.setTransform(1, 0, 0, 1, 0, 0);
    }

    const backgroundColor = canvas.parentElement?.style.backgroundColor;
    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(canvas, 0, 0);
  });

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
      canvas.toBlob((blob) => {
        if (!blob) {
          window.alert('PNG の生成に失敗しました。');
          return;
        }
        downloadBlob(blob, 'mesh.png');
      }, 'image/png');
    } catch (error) {
      console.error(error);
      window.alert('PNG の書き出し中にエラーが発生しました。');
    }
  });

  map.renderSync();
}

map.on('singleclick', (event) => {
  generateMesh(event.coordinate);
});

fitMeshBtn.addEventListener('click', fitMesh);
exportGeoJsonBtn.addEventListener('click', exportGeoJSON);
exportPngBtn.addEventListener('click', exportPng);

// 初期表示用に東京駅付近へ仮メッシュを置く
if (!lastCenter) {
  generateMesh(INITIAL_CENTER);
  fitMesh();
}
