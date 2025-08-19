import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { OSM } from "ol/source";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Style, Stroke, Fill } from "ol/style";
import { Feature, Overlay } from "ol";
import { Geometry, Point } from "ol/geom";
import type { City } from "../services/api";
import CircleStyle from "ol/style/Circle";
import { fromLonLat, toLonLat } from "ol/proj";
import { defaults } from "ol/control";
import { FullScreen } from "ol/control";
import type { Points } from "../types/Points";
import Heatmap from 'ol/layer/Heatmap';
import { getDistance as olSphereGetDistance } from 'ol/sphere';
import type { Coordinate } from "ol/coordinate";

// Normalize strings for matching
export function normalize(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/â/g, "a")
    .replace(/[\W_]/g, "")
    .trim();
}

type InitMapParams = {
  mapRef: React.RefObject<HTMLDivElement | null>;
  drawSourceRef: React.RefObject<VectorSource>;
  pointSourceRef: React.RefObject<VectorSource>;
  turkeySourceRef: React.RefObject<VectorSource>;
  regionHighlightSourceRef: React.RefObject<VectorSource>;
  heatmapPopulLayerRef: React.RefObject<Heatmap>;
  heatmapTempLayerRef: React.RefObject<Heatmap>;
  mockPoints: Points[];
  pointLayerRef: React.RefObject<VectorLayer | null>;
  turkeyLayerRef: React.RefObject<VectorLayer | null>;
  cityData: City[];
  cityOverlayEnabled: boolean;
  cityOverlaysRef: React.RefObject<Overlay[]>;
  pointPopupOverlayRef: React.RefObject<Overlay | null>;
  pointPopupElementRef: React.RefObject<HTMLDivElement | null>;
  styles: any; // Ideally typed, use CSSModule type or similar
};

export const initializeMap = ({
  mapRef,
  drawSourceRef,
  pointSourceRef,
  turkeySourceRef,
  regionHighlightSourceRef,
  heatmapPopulLayerRef,
  heatmapTempLayerRef,
  mockPoints,
  pointLayerRef,
  turkeyLayerRef,
  cityData,
  cityOverlayEnabled,
  cityOverlaysRef,
  pointPopupOverlayRef,
  pointPopupElementRef,
  styles,
}: InitMapParams): Map | null => {
  if (!mapRef.current) return null;

  const drawLayer = new VectorLayer({
    source: drawSourceRef.current,
    style: new Style({
      stroke: new Stroke({ color: "red", width: 2 }),
    }),
  });

  const pointLayer = new VectorLayer({
    source: pointSourceRef.current,
    visible: false,
    style: new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: "#d38a2aff" }),
        stroke: new Stroke({ color: "#333", width: 1 }),
      }),
    }),
  });
  pointLayerRef.current = pointLayer;

  mockPoints.forEach((point: Points) => {
    const feature = new Feature({
      geometry: new Point(fromLonLat(point.coordinates)),
      id: point.id,
      name: point.name,
      description: point.description,
      lon: point.coordinates[0],
      lat: point.coordinates[1],
    });
    pointSourceRef.current.addFeature(feature);
  });

  const turkeyLayer = new VectorLayer({
    source: turkeySourceRef.current,
    visible: false,
    style: new Style({
      stroke: new Stroke({ color: "#414141ff", width: 1 }),
      fill: new Fill({ color: "rgba(114, 114, 114, 0.34)" }),
    }),
  });
  turkeyLayerRef.current = turkeyLayer;

  const regionHighlightLayer = new VectorLayer({
    source: regionHighlightSourceRef.current,
    style: new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({ color: "#1E90FF" }),
        stroke: new Stroke({ color: "#ffffff", width: 1 }),
      }),
    }),
  });

  const map = new Map({
    target: mapRef.current,
    layers: [
      new TileLayer({ source: new OSM() }),
      turkeyLayer,
      drawLayer,
      regionHighlightLayer,
      heatmapPopulLayerRef.current,
      heatmapTempLayerRef.current,
      pointLayer,
    ],
    view: new View({
      center: [35 * 111319.9, 39 * 111319.9],
      zoom: 6,
    }),
controls: defaults().extend([
        new FullScreen({ className: styles.fullScreenButton }),
      ]),
  });

  // City Overlays
  if (cityOverlayEnabled) {
    const overlays = cityData.map((city: City) => {
      const element = document.createElement("div");
      element.className = styles.cityBox;
      element.innerHTML = `<strong>${city.name}</strong><br />${city.region}°C`;

      const overlay = new Overlay({
        element,
        position: fromLonLat([+city.longitude, +city.latitude]),
        positioning: "bottom-center",
        stopEvent: false,
        offset: [0, 10],
      });

      map.addOverlay(overlay);
      return overlay;
    });

    cityOverlaysRef.current = overlays;
  }

  // Create Point Popup Element
  const pointPopupElement = document.createElement("div");
  pointPopupElement.className = styles.pointPopupBox;

  const pointPopupOverlay = new Overlay({
    element: pointPopupElement,
    positioning: "bottom-center",
    stopEvent: true,
    offset: [0, -30],
    insertFirst: false,
  });

  map.addOverlay(pointPopupOverlay);
  pointPopupOverlayRef.current = pointPopupOverlay;
  pointPopupElementRef.current = pointPopupElement;

  return map;
};
export function findCityByName(
  cityList: City[],
  name: string
): any | undefined {
  const normalizedName = normalize(name);
  return cityList.find(
    (c) => normalize(c.name) === normalizedName
  );
}

export function clearMapSelections(options: {
  selectedFeatureRef: React.RefObject<Feature<Geometry> | null>;
  selectedPointRef: React.RefObject<Feature<Geometry> | null>;
  selectedRegionRef: React.RefObject<Feature<Geometry> | null>;
  dragBoxSelectedFeaturesRef: React.RefObject<Feature<Geometry>[]>;
  pointPopupOverlayRef: React.RefObject<Overlay | null>;
  pointPopupElementRef: React.RefObject<HTMLDivElement | null>;
  regionHighlightSourceRef: any;
  hoveredFeatureRef: React.RefObject<Feature<Geometry> | null>;
}) {
  const {
    selectedFeatureRef,
    selectedPointRef,
    selectedRegionRef,
    dragBoxSelectedFeaturesRef,
    pointPopupOverlayRef,
    pointPopupElementRef,
    regionHighlightSourceRef,
    hoveredFeatureRef,
  } = options;

  if (selectedFeatureRef.current) {
    selectedFeatureRef.current.setStyle(undefined);
    selectedFeatureRef.current = null;
  }
    if (selectedPointRef.current) {
    selectedPointRef.current.setStyle(undefined);
    selectedPointRef.current = null;
  }

  selectedRegionRef.current = null;
  regionHighlightSourceRef.current.clear();

  if (dragBoxSelectedFeaturesRef.current.length > 0) {
    dragBoxSelectedFeaturesRef.current.forEach((f) => f.setStyle(undefined));
    dragBoxSelectedFeaturesRef.current = [];
  }

  if (pointPopupOverlayRef.current) {
    pointPopupOverlayRef.current.setPosition(undefined);
  }
  if (pointPopupElementRef.current) {
    pointPopupElementRef.current.style.display = "none";
  }

  hoveredFeatureRef.current = null;
}

export function getGeomCenter(geometry: Geometry): [number, number] {
  const extent = geometry.getExtent();
  const x = (extent[0] + extent[2]) / 2;
  const y = (extent[1] + extent[3]) / 2;
  return [x, y];
}

export function getDistance(a: Coordinate, b: Coordinate): number {
  const coordA: [number, number] = [a[0], a[1]];
  const coordB: [number, number] = [b[0], b[1]];
  return olSphereGetDistance(toLonLat(coordA), toLonLat(coordB));
}