// src/pages/MapView.tsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useMap } from "../context/MapContext";
import {
  clearMapSelections,
  findCityByName,
  getDistance,
  getGeomCenter,
  initializeMap,
} from "../utils/mapfunctions";
import styles from "./MapView.module.css";
import VectorSource from "ol/source/Vector";
import HeatmapLayer from "ol/layer/Heatmap";
import type VectorLayer from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";
import type { Points } from "../types/Points";
import { Feature, Overlay } from "ol";
import {
  styleClickedFeature,
  styleDragBoxFeature,
  styleHoverFeature,
  stylePointClickedFeature,
  stylePointHoverFeature,
  styleRegionFeature,
} from "../utils/styles";
import {
  setCityData,
  setCityOverlayEnabled,
  setDragboxEnabled,
  setDrawEnabled,
  setDrawnRadiusKm,
  setDrawPointEnabled,
  setDrawPointInteraction,
  setFeatureClickEnabled,
  setHeatmapPopulEnabled,
  setHeatmapTempEnabled,
  setSelectedAreaKm2,
  setSelectedPointId,
  setShowPoints,
  setTurkeyVisible,
} from "../store/mapSlice";
import { fetchCities, getWeatherForCity } from "../services/api";
import { LineString, Point, Circle, type Geometry } from "ol/geom";
import { fromLonLat, toLonLat } from "ol/proj";
import { getArea, getLength } from "ol/sphere";

import drawing from "/drawing.svg";
import drawingstop from "/drawingstop.svg";
import dragbox from "/dragbox.svg";
import dragboxstop from "/dragboxstop.svg";
import heatmappopulicon from "/heatmappopul.svg";
import heatmappopulstopicon from "/heatmappopulstop.svg";
import heatmapthermoicon from "/heatmapthermo.svg";
import heatmapthermostopicon from "/heatmapthermostop.svg";
import "ol/ol.css";
import { DragBox, Draw, Snap } from "ol/interaction";
import { platformModifierKeyOnly } from "ol/events/condition";

export default function MapView() {
  const dispatch = useAppDispatch();
  const {
    cityData,
    selectedAreaKm2,
    drawEnabled,
    dragboxEnabled,
    heatmapPopulEnabled,
    heatmapTempEnabled,
    drawPointEnabled,
    featureClickEnabled,
    showPoints,
    turkeyVisible,
    cityOverlayEnabled,
    drawPolygonEnabled,
    drawCircleEnabled,
    DrawnRadiusKm,

    selectedPointId,
  } = useAppSelector((state) => state.map);

  const { map, setMap } = useMap();

  const drawSourceRef = useRef<VectorSource>(new VectorSource());
  const heatmapSourceRef = useRef<VectorSource>(new VectorSource());
  const regionHighlightSourceRef = useRef<VectorSource>(new VectorSource());
  const pointSourceRef = useRef<VectorSource>(new VectorSource());

  const pointLayerRef = useRef<VectorLayer>(null);
  const turkeyLayerRef = useRef<VectorLayer | null>(null);

  const cityOverlaysRef = useRef<Overlay[]>([]);

  const pointPopupOverlayRef = useRef<Overlay | null>(null);

  const pointPopupElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInitializedRef = useRef(false);

  const dragBoxSelectedFeaturesRef = useRef<Feature<Geometry>[]>([]);
  const hoveredFeatureRef = useRef<Feature<Geometry> | null>(null);
  const selectedRegionRef = useRef<Feature<Geometry> | null>(null);
  const selectedFeatureRef = useRef<Feature<Geometry> | null>(null);
  const selectedPointRef = useRef<Feature<Geometry> | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    lat: number;
    lon: number;
  }>({
    name: "",
    description: "",
    lat: 0,
    lon: 0,
  });

  const mockPointsRef = useRef<Points[]>([
    {
      id: 0,
      name: "Point A",
      description: "Near Istanbul",
      coordinates: [28.98, 41.01],
    },
    {
      id: 1,
      name: "Point B",
      description: "Near Ankara",
      coordinates: [32.85, 39.93],
    },
    {
      id: 2,
      name: "Point C",
      description: "Near Izmir",
      coordinates: [27.14, 38.42],
    },
    {
      id: 3,
      name: "Point D",
      description: "Near Antalya",
      coordinates: [30.7, 36.89],
    },
  ]);
  //yapiacaklar, city labels uzaklaşıp yakınlaşınca gelmiyor düzelt, 2. stil ekle mock pointlere, 3. hover ve click eventleri useEffectlere ayır 4. polygon shape ile city seçme ekle
  const turkeySourceRef = useRef<VectorSource>(
    new VectorSource({
      url: "/borders_turkey.geojson", // Replace with the correct path or URL
      format: new GeoJSON(),
    })
  );

  const heatmapPopulLayerRef = useRef<HeatmapLayer>(
    new HeatmapLayer({
      source: heatmapSourceRef.current,
      blur: 15,
      radius: 50,
      gradient: [
        "rgba(0, 0, 255, 0)",
        "rgba(0, 0, 255, 0.5)",
        "rgba(0, 255, 255, 0.7)",
        "rgba(0, 255, 0, 0.8)",
        "rgba(255, 255, 0, 0.9)",
        "rgba(255, 0, 0, 1)",
      ],
      weight: (feature) => feature.get("weight") || 0,
      visible: false,
    })
  );

  const heatmapTempLayerRef = useRef<HeatmapLayer>(
    new HeatmapLayer({
      source: heatmapSourceRef.current,
      weight: (feature) => feature.get("temperature") || 0,
      blur: 20,
      radius: 30,
      gradient: [
        "rgba(0, 0, 255, 0)",
        "rgba(0, 0, 255, 0.5)",
        "rgba(0, 255, 255, 0.7)",
        "rgba(0, 255, 0, 0.8)",
        "rgba(255, 255, 0, 0.9)",
        "rgba(255, 0, 0, 1)",
      ],
      visible: false, // initially hidden
    })
  );

  const toggleDrawing = () => {
    if (!drawEnabled) {
      dispatch(setDragboxEnabled(false));
      dispatch(setHeatmapPopulEnabled(false));
      dispatch(setHeatmapTempEnabled(false));
      heatmapPopulLayerRef.current.setVisible(false);
      heatmapTempLayerRef.current.setVisible(false);
    }
    dispatch(setDrawEnabled(!drawEnabled));
  };
  const toggleDragBox = () => {
    if (!dragboxEnabled) {
      dispatch(setDrawEnabled(false));
      dispatch(setHeatmapPopulEnabled(false));
      dispatch(setHeatmapTempEnabled(false));
      heatmapPopulLayerRef.current.setVisible(false);
      heatmapTempLayerRef.current.setVisible(false);
    }
    dispatch(setDragboxEnabled(!dragboxEnabled));
  };
  const toggleHeatPopulMap = () => {
    if (!heatmapPopulEnabled) {
      dispatch(setDragboxEnabled(false));
      dispatch(setDrawEnabled(false));
      dispatch(setHeatmapTempEnabled(false));
      heatmapTempLayerRef.current.setVisible(false);
    }
    heatmapPopulLayerRef.current.setVisible(!heatmapPopulEnabled);
    dispatch(setHeatmapPopulEnabled(!heatmapPopulEnabled));
  };
  const toggleHeatTempMap = () => {
    if (!heatmapTempEnabled) {
      dispatch(setDragboxEnabled(false));
      dispatch(setDrawEnabled(false));
      dispatch(setHeatmapPopulEnabled(false));
      heatmapPopulLayerRef.current.setVisible(false);
    }
    heatmapTempLayerRef.current.setVisible(!heatmapTempEnabled);
    dispatch(setHeatmapTempEnabled(!heatmapTempEnabled));
  };
  const toggleTurkeyLayer = () => {
    if (turkeyVisible) {
      dispatch(setDrawEnabled(false));
      dispatch(setDragboxEnabled(false));
      dispatch(setHeatmapPopulEnabled(false));
      dispatch(setHeatmapTempEnabled(false));
      dispatch(setCityOverlayEnabled(false));
      heatmapPopulLayerRef.current.setVisible(false);
      heatmapTempLayerRef.current.setVisible(false);
    } else {
      dispatch(setShowPoints(false));
      dispatch(setDrawPointEnabled(false));
      pointLayerRef.current?.setVisible(false);
    }
    clearMapSelections({
      selectedFeatureRef,
      selectedPointRef,
      selectedRegionRef,
      dragBoxSelectedFeaturesRef,
      pointPopupOverlayRef,
      pointPopupElementRef,
      regionHighlightSourceRef,
      hoveredFeatureRef,
    });
    dispatch(setSelectedAreaKm2(null));
    turkeyLayerRef.current?.setVisible(!turkeyVisible);

    dispatch(setTurkeyVisible(!turkeyVisible));
  };
  const toggleCityOverlay = () => {
    dispatch(setCityOverlayEnabled(!cityOverlayEnabled));
  };

  const toggleShowPoints = () => {
    if (!showPoints) {
      dispatch(setTurkeyVisible(false));
      dispatch(setDrawPointEnabled(false));
    }
    clearMapSelections({
      selectedFeatureRef,
      selectedPointRef,
      selectedRegionRef,
      dragBoxSelectedFeaturesRef,
      pointPopupOverlayRef,
      pointPopupElementRef,
      regionHighlightSourceRef,
      hoveredFeatureRef,
    });
    dispatch(setSelectedAreaKm2(null));
    pointLayerRef.current?.setVisible(!showPoints);
    dispatch(setShowPoints(!showPoints));
  };

  const toggleDrawPoints = () => {
    dispatch(setDrawPointEnabled(!drawPointEnabled));
  };

  const handleUpdatePoint = ({
    name,
    description,
    lat,
    lon,
  }: {
    name: string;
    description: string;
    lat: number;
    lon: number;
  }) => {
    if (selectedPointId === null) return;

    const updatedPoints = mockPointsRef.current.map((p: Points) =>
      p.id === selectedPointId
        ? {
            ...p,
            name,
            description,
            coordinates: [lon, lat] as [number, number],
          }
        : p
    );

    mockPointsRef.current = updatedPoints;
    refreshPointLayer();
    hidePopup();
  };

  const handleDeletePoint = () => {
    if (selectedPointId === null) return;

    mockPointsRef.current = mockPointsRef.current.filter(
      (p) => p.id !== selectedPointId
    );

    refreshPointLayer();
    hidePopup();
  };

  const refreshPointLayer = () => {
    const source = pointSourceRef.current;
    if (!source) return;

    source.clear();

    mockPointsRef.current.forEach((point) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat(point.coordinates)),
        name: point.name,
        description: point.description,
        lat: point.coordinates[1],
        lon: point.coordinates[0],
        id: point.id,
      });

      source.addFeature(feature);
    });
  };

  const hidePopup = () => {
    if (selectedPointId === null) return;
    const popupEl = pointPopupElementRef.current;
    const popupOv = pointPopupOverlayRef.current;
    if (popupEl) popupEl.style.display = "none";
    if (popupOv) popupOv.setPosition(undefined);
    selectedFeatureRef.current = null;
    dispatch(setSelectedPointId(null));
  };

  // CityData initialization
  useEffect(() => {
    const load = async () => {
      const cities = await fetchCities();
      const enriched = await Promise.all(
        cities.map(async (c) => {
          try {
            const w = await getWeatherForCity(+c.latitude, +c.longitude);
            return { ...c, temperature: w.main.temp };
          } catch {
            return { ...c, temperature: undefined };
          }
        })
      );
      dispatch(setCityData(enriched));
    };
    load();
  }, []);

  // Map initialization
  useEffect(() => {
    if (mapInitializedRef.current || !mapRef.current || !cityData) {
      console.log("not-worked");
      return;
    }
    console.log("worked");
    const initialMap = initializeMap({
      mapRef,
      drawSourceRef,
      pointSourceRef,
      turkeySourceRef,
      regionHighlightSourceRef,
      heatmapPopulLayerRef,
      heatmapTempLayerRef,
      mockPoints: mockPointsRef.current,
      pointLayerRef,
      turkeyLayerRef,
      cityData,
      cityOverlayEnabled,
      cityOverlaysRef,
      pointPopupOverlayRef,
      pointPopupElementRef,
      styles,
    });

    if (!initialMap) return;

    const popupElement = document.createElement("div");
    popupElement.className = styles.popupBox;

    const popupOverlay = new Overlay({
      element: popupElement,
      positioning: "bottom-center",
      stopEvent: false,
      offset: [0, -40],
      insertFirst: false,
    });

    initialMap.addOverlay(popupOverlay);

    if (pointPopupElementRef.current) {
      const pointPopupOverlay = new Overlay({
        element: pointPopupElementRef.current,
        positioning: "bottom-center",
        stopEvent: true,
        offset: [20, -250],
        insertFirst: false,
      });
      initialMap.addOverlay(pointPopupOverlay);
      pointPopupOverlayRef.current = pointPopupOverlay;
    }

    mapInitializedRef.current = true;
    setMap(initialMap);

    return () => {
      if (mapInitializedRef.current) return;
      console.log("at-return");
      initialMap.setTarget(undefined);
      if (selectedRegionRef.current instanceof Feature)
        selectedRegionRef.current?.setStyle(undefined);
      if (pointPopupOverlayRef.current)
        initialMap.removeOverlay(pointPopupOverlayRef.current);
      initialMap.removeOverlay(popupOverlay);
      pointPopupOverlayRef.current = null;
      pointPopupElementRef.current = null;
    };
  }, [cityData]); // Include all relevant dependencies

  // Map hovering
  useEffect(() => {
    if (
      !mapInitializedRef.current ||
      !mapRef.current ||
      !cityData?.length ||
      !map
    )
      return;
    console.log("at-hover");

    const popupElement = document.querySelector(
      `.${styles.popupBox}`
    ) as HTMLElement;
    const popupOverlay = map
      .getOverlays()
      .getArray()
      .find((o) => o.getElement() === popupElement);

    const pointerMoveHandler = (evt: any) => {
      if (!turkeySourceRef.current || !pointSourceRef.current) return;

      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f as Feature);

      if (hoveredFeatureRef.current === feature) return;

      // Reset previous feature style
      if (hoveredFeatureRef.current && hoveredFeatureRef.current !== feature) {
        const isDragSelected = dragBoxSelectedFeaturesRef.current.includes(
          hoveredFeatureRef.current
        );
        const hasPersistentStyle =
          hoveredFeatureRef.current.get("persistStyle") === true;

        if (
          hoveredFeatureRef.current === selectedFeatureRef.current ||
          hoveredFeatureRef.current === selectedPointRef.current
        ) {
          hoveredFeatureRef.current.setStyle(
            hoveredFeatureRef.current.getGeometry()?.getType() === "Point"
              ? stylePointClickedFeature()
              : styleClickedFeature()
          );
        } else if (isDragSelected) {
          hoveredFeatureRef.current.setStyle(styleDragBoxFeature());
        } else if (!hasPersistentStyle) {
          hoveredFeatureRef.current.setStyle(undefined);
        }
      }

      hoveredFeatureRef.current = feature || null;

      if (!feature) {
        popupElement.style.display = "none";
        popupOverlay?.setPosition(undefined);
        map.getViewport().style.cursor = "";
        return;
      }

      const geomType = feature.getGeometry()?.getType();

      if (geomType === "Point" && pointSourceRef.current.hasFeature(feature)) {
        feature.setStyle(stylePointHoverFeature());
        map.getViewport().style.cursor = "pointer";
        return;
      }

      if ((geomType === "Polygon" || geomType === "MultiPolygon") && cityData) {
        const name = feature.get("Name") ?? "Unknown";
        const city = findCityByName(cityData, name);

        popupElement.innerHTML = city
          ? `
          <strong>⬤ ${city.name}</strong><br />
          Population: ${city.population.toLocaleString()}<br />
          ${
            city.temperature !== undefined
              ? `Temperature: ${city.temperature}°C`
              : ""
          }`
          : `
          <strong>⬤ Unknown city</strong><br />
          Population: Unknown<br />
          Temperature: Unknown°C`;

        feature.setStyle(styleHoverFeature());
        popupOverlay?.setPosition(evt.coordinate);
        popupElement.style.display = "block";
        map.getViewport().style.cursor = "pointer";
        return;
      }

      popupOverlay?.setPosition(undefined);
      popupElement.style.display = "none";
      map.getViewport().style.cursor = "";
    };

    map.on("pointermove", pointerMoveHandler);
    return () => {
      map.un("pointermove", pointerMoveHandler);
    };
  }, [map, cityData]);

  // Map click events
  useEffect(() => {
    if (
      !mapInitializedRef.current ||
      !mapRef.current ||
      !cityData?.length ||
      !map
    )
      return;
    console.log("at-click");

    const handleClick = (evt: any) => {
      if (!featureClickEnabled) return;

      const feature = map.forEachFeatureAtPixel(
        evt.pixel,
        (feat) => feat as Feature<Geometry>
      );

      if (!feature) {
        clearMapSelections({
          selectedFeatureRef,
          selectedPointRef,
          selectedRegionRef,
          dragBoxSelectedFeaturesRef,
          pointPopupOverlayRef,
          pointPopupElementRef,
          regionHighlightSourceRef,
          hoveredFeatureRef,
        });
        dispatch(setSelectedAreaKm2(null));
        return;
      }

      const geomType = feature.getGeometry()?.getType();

      if (dragBoxSelectedFeaturesRef.current.length > 0) {
        dragBoxSelectedFeaturesRef.current.forEach((f) =>
          f.setStyle(undefined)
        );
        dragBoxSelectedFeaturesRef.current = [];
        dispatch(setSelectedAreaKm2(null));
      }
      console.log(
        " geomType: ",
        geomType,
        " showPoints: ",
        showPoints,
        " draw: ",
        drawPointEnabled
      );
      if (geomType === "Point" && showPoints && !drawPointEnabled) {
        if (selectedPointRef.current && selectedPointRef.current !== feature) {
          selectedPointRef.current.setStyle(undefined);
        }

        selectedPointRef.current = feature;
        feature.setStyle(stylePointClickedFeature());

        const name = feature.get("name");
        const description = feature.get("description");
        const lat = feature.get("lat");
        const lon = feature.get("lon");
        const id = feature.get("id");

        dispatch(setSelectedPointId(id));
        setFormData({ name, description, lat, lon });
        console.log(
          " name: ",
          name,
          " selectpoint",
          selectedPointId,
          id,
          " pointPopupElementRef.current ",
          pointPopupElementRef.current
        );

        const pointPopupOverlay = pointPopupOverlayRef.current;
        const pointPopupElement = pointPopupElementRef.current;

        if (pointPopupOverlay && pointPopupElement) {
          pointPopupOverlay.setPosition(fromLonLat([lon, lat]));
          const zoom = map.getView().getZoom() ?? 0;
          pointPopupElement.style.display = zoom < 6 ? "none" : "block";
        }
        return;
      }

      if (
        (geomType === "Polygon" || geomType === "MultiPolygon") &&
        turkeyVisible
      ) {
        const name = feature.get("Name");
        const clickedCity = findCityByName(cityData, name);

        if (!clickedCity) return;

        if (selectedFeatureRef.current)
          selectedFeatureRef.current.setStyle(undefined);

        feature.setStyle(styleClickedFeature());

        const geom = feature.getGeometry();
        if (geom) {
          const areaMeters = getArea(geom, { projection: "EPSG:3857" });
          dispatch(
            setSelectedAreaKm2((areaMeters / 1_000_000).toFixed(3) + " km²")
          );
        }

        selectedFeatureRef.current = feature;
        selectedRegionRef.current = clickedCity.region;

        regionHighlightSourceRef.current.clear();

        cityData
          .filter((c) => c.region === clickedCity.region)
          .forEach((city) => {
            const feature = new Feature({
              geometry: new Point(
                fromLonLat([+city.longitude, +city.latitude])
              ),
            });
            feature.set("region", city.region);
            feature.set("persistStyle", true);
            feature.setStyle(styleRegionFeature(city.region));
            regionHighlightSourceRef.current.addFeature(feature);
          });

        return;
      }

      const pointPopupOverlay = pointPopupOverlayRef.current;
      const pointPopupElement = pointPopupElementRef.current;

      if (pointPopupOverlay && pointPopupElement) {
        pointPopupOverlay.setPosition(undefined);
        pointPopupElement.style.display = "none";
      }

      selectedFeatureRef.current = null;
    };

    const handleResolutionChange = () => {
      const zoom = map.getView().getZoom();

      if (cityOverlayEnabled && cityOverlaysRef.current) {
        cityOverlaysRef.current.forEach((overlay) => {
          const element = overlay.getElement();
          if (element)
            element.style.display = zoom && zoom < 6 ? "none" : "block";
        });
      }

      const popupEl = pointPopupElementRef.current;
      if (popupEl) {
        popupEl.style.display = zoom && zoom < 6 ? "none" : "block";
      }
    };

    map.on("click", handleClick);
    map.getView().on("change:resolution", handleResolutionChange);

    return () => {
      map.un("click", handleClick);
      map.getView().un("change:resolution", handleResolutionChange);
    };
  }, [
    map,
    cityData,
    cityOverlayEnabled,
    featureClickEnabled,
    drawPointEnabled,
    showPoints,
    turkeyVisible,
  ]);

  useEffect(() => {
    if (!map || !cityData) return;
    const zoom = map.getView().getZoom() ?? 0;

    // Only create overlays once
    if (cityOverlaysRef.current.length === 0) {
      const overlays = cityData.map((city) => {
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
        overlay.setMap(map);
        return overlay;
      });

      cityOverlaysRef.current = overlays;
    }

    const updateOverlayVisibility = () => {
      cityOverlaysRef.current.forEach((overlay) => {
        const element = overlay.getElement();
        if (element) {
          element.style.display =
            cityOverlayEnabled && zoom >= 6 ? "block" : "none";
        }
      });
    };

    updateOverlayVisibility();
  }, [cityOverlayEnabled, map, cityData]);

  useEffect(() => {
    if (!map) return;
    let draw: Draw | null = null;
    let snap: Snap | null = null;

    if (drawEnabled) {
      const drawInteraction = new Draw({
        source: drawSourceRef.current,
        type: "LineString",
        maxPoints: 2,
      });

      drawInteraction.on("drawstart", () => {
        drawSourceRef.current.clear();
        if (selectedFeatureRef.current) {
          selectedFeatureRef.current.setStyle(undefined); // Remove style from previously selected feature
          selectedFeatureRef.current = null;
          dispatch(setSelectedAreaKm2(null));
        }
        dispatch(setFeatureClickEnabled(false));
      });

      drawInteraction.on("drawend", (event) => {
        const geom = event.feature.getGeometry() as LineString;
        const lengthMeters = getLength(geom);
        dispatch(
          setSelectedAreaKm2((lengthMeters / 1_000_000).toFixed(2) + " km²")
        );

        dispatch(setFeatureClickEnabled(true));
      });

      const snapInteraction = new Snap({
        source: turkeySourceRef.current,
      });

      map.addInteraction(drawInteraction);
      map.addInteraction(snapInteraction);

      draw = drawInteraction;
      snap = snapInteraction;
    }
    return () => {
      drawSourceRef.current.clear();
      if (draw) {
        map.removeInteraction(draw);
        dispatch(setSelectedAreaKm2(null));
        draw = null;
      }
      if (snap) {
        map.removeInteraction(snap);
        snap = null;
      }
    };
  }, [drawEnabled, map]);

  useEffect(() => {
    if (!map) return;

    let dragBox: DragBox | null = null;

    if (dragboxEnabled) {
      dragBox = new DragBox({
        condition: platformModifierKeyOnly, // hold Shift to draw box
      });
      dragBox.on("boxstart", () => {
        if (selectedFeatureRef.current) {
          selectedFeatureRef.current.setStyle(undefined); // Remove style from previously selected feature
          selectedFeatureRef.current = null;
          dispatch(setSelectedAreaKm2(null));
        }
        dispatch(setFeatureClickEnabled(false));
      });
      dragBox.on("boxend", () => {
        const extent = dragBox!.getGeometry().getExtent();
        const features = turkeySourceRef.current.getFeaturesInExtent(extent);

        let totalArea = 0;

        features.forEach((feature) => {
          const geom = feature.getGeometry();
          if (!geom) return;

          const type = geom.getType();
          if (type === "Polygon" || type === "MultiPolygon") {
            totalArea += getArea(geom, { projection: "EPSG:3857" });
            feature.setStyle(styleDragBoxFeature()); // Set red style
            dragBoxSelectedFeaturesRef.current.push(feature);
          }
        });

        dispatch(
          setSelectedAreaKm2((totalArea / 1_000_000).toFixed(2) + " km²")
        );

        dispatch(setFeatureClickEnabled(true));
      });

      map.addInteraction(dragBox);
    }
    return () => {
      if (dragBox) {
        map.removeInteraction(dragBox);
        dragBoxSelectedFeaturesRef.current.forEach((f) =>
          f.setStyle(undefined)
        );
        dragBoxSelectedFeaturesRef.current = [];
        dragBox = null;
        dispatch(setSelectedAreaKm2(null));
      }
    };
  }, [dragboxEnabled, map]);

  useEffect(() => {
    if (!map || !cityData) return;
    const features = cityData.map((city) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([+city.longitude, +city.latitude])),
      });
      feature.set("weight", city.population / 20000000);
      if (typeof city.temperature === "number") {
        const clamped = Math.max(0, Math.min(1, (city.temperature - 25) / 10));
        feature.set("temperature", clamped);
      } else {
        console.warn(`[HeatmapTemp] ${city.name} has no valid temperature`);
      }
      return feature;
    });
    heatmapSourceRef.current.clear();
    heatmapSourceRef.current.addFeatures(features);
  }, [map, cityData]);

  useEffect(() => {
    if (!map || !drawPointEnabled) return;

    const draw = new Draw({
      source: pointSourceRef.current,
      type: "Point",
    });

    draw.on("drawend", (event) => {
      const feature = event.feature;
      const geometry = feature.getGeometry();

      if (!geometry || !(geometry instanceof Point)) {
        console.warn("Expected a Point geometry.");
        return;
      }

      const coord = geometry.getCoordinates();
      const lonLat = toLonLat(coord); // convert to EPSG:4326

      const newPoint: Points = {
        id: mockPointsRef.current.length,
        name: "Unknown",
        description: "Unknown",
        coordinates: [lonLat[0], lonLat[1]],
      };

      mockPointsRef.current.push(newPoint);

      feature.set("id", newPoint.id);
      feature.set("name", newPoint.name);
      feature.set("description", newPoint.description);
      feature.set("lat", lonLat[1]);
      feature.set("lon", lonLat[0]);

      setDrawPointEnabled(false); // auto-disable drawing
    });

    dispatch(setDrawPointInteraction(null));
    map.addInteraction(draw);

    return () => {
      map.removeInteraction(draw);
      dispatch(setDrawPointInteraction(null));
    };
  }, [drawPointEnabled, map]);

  useEffect(() => {
  if (!map) return;

  let draw: Draw | null = null;

  if (drawPolygonEnabled) {
    draw = new Draw({
      source: drawSourceRef.current, // assumes this is a VectorSource already used for drawing
      type: 'Polygon',
    });

    draw.on('drawstart', () => {
      // Clear previous selections
      drawSourceRef.current.clear();
      dragBoxSelectedFeaturesRef.current.forEach((f) => f.setStyle(undefined));
      dragBoxSelectedFeaturesRef.current = [];
      dispatch(setSelectedAreaKm2(null));
    });

    draw.on('drawend', (e) => {
      const drawnFeature = e.feature;
      const polygonGeom = drawnFeature.getGeometry();

      const selectedCities: Feature[] = [];
      let totalArea = 0;

      const cityFeatures = turkeySourceRef.current.getFeatures();

      cityFeatures.forEach((feature) => {
        const geom = feature.getGeometry();
        if (!geom) return;

        const type = geom.getType();
        if (type !== 'Polygon' && type !== 'MultiPolygon') return;

        // Check intersection
        if (polygonGeom && polygonGeom.intersectsExtent(geom.getExtent())) {
          selectedCities.push(feature);
          feature.setStyle(styleDragBoxFeature());
          totalArea += getArea(geom, { projection: 'EPSG:3857' });
        }
      });

      dragBoxSelectedFeaturesRef.current = selectedCities;
      dispatch(
        setSelectedAreaKm2((totalArea / 1_000_000).toFixed(2) + ' km²')
      );
    });

    map.addInteraction(draw);
  }

  return () => {
    if (draw) {
      map.removeInteraction(draw);
      drawSourceRef.current.clear();
      dragBoxSelectedFeaturesRef.current.forEach((f) =>
        f.setStyle(undefined)
      );
      dragBoxSelectedFeaturesRef.current = [];
      dispatch(setSelectedAreaKm2(null));
    }
  };
  }, [map, drawPolygonEnabled]);

  useEffect(() => {
  if (!map) return;

  let draw: Draw | null = null;

  if (drawCircleEnabled) {
    drawSourceRef.current.clear();
    dragBoxSelectedFeaturesRef.current.forEach((f) => f.setStyle(undefined));
    dragBoxSelectedFeaturesRef.current = [];
    dispatch(setSelectedAreaKm2(null));
    dispatch(setDrawnRadiusKm(null));

    draw = new Draw({
      source: drawSourceRef.current,
      type: 'Circle',
    });

    draw.on('drawend', (event) => {
      const circleGeom = event.feature.getGeometry() as Circle;
      const center = circleGeom.getCenter();
      const radiusMeters = circleGeom.getRadius();
      const radiusKm = radiusMeters / 1000;

      dispatch(setDrawnRadiusKm(radiusKm.toString()));

      const cityFeatures = turkeySourceRef.current.getFeatures();

      const selectedCities: Feature[] = [];

      cityFeatures.forEach((feature) => {
        const geom = feature.getGeometry();
        if (!geom) return;

        const coord = getGeomCenter(geom); // helper below
        const distance = getDistance(center, coord); // helper below

        if (distance <= radiusMeters) {
          selectedCities.push(feature);
          feature.setStyle(styleDragBoxFeature());
        }
      });

      dragBoxSelectedFeaturesRef.current = selectedCities;
    });

    map.addInteraction(draw);
  }

  return () => {
    if (draw) {
      map.removeInteraction(draw);
      drawSourceRef.current.clear();
      dragBoxSelectedFeaturesRef.current.forEach((f) => f.setStyle(undefined));
      dragBoxSelectedFeaturesRef.current = [];
      dispatch(setDrawnRadiusKm(null));
    }
  };
}, [map, drawCircleEnabled]);



  return (
    <div className={styles.base}>
      <div className={styles.topfield}>
        <div className={styles.boxfield}>
          <div className={styles.boxbuttonfield}>
            <button
              className={
                turkeyVisible
                  ? styles.regionbuttondeactivate
                  : styles.regionbutton
              }
              onClick={toggleTurkeyLayer}
            >
              {turkeyVisible ? `Hide Regions` : `Show Regions`}
            </button>
            {turkeyVisible && (
              <button
                className={
                  cityOverlayEnabled
                    ? styles.regionbuttondeactivate
                    : styles.regionbutton
                }
                disabled={!turkeyVisible}
                onClick={toggleCityOverlay}
              >
                {cityOverlayEnabled ? "Hide City Labels" : "Show City Labels"}
              </button>
            )}
            {!turkeyVisible && (
              <button
                className={
                  showPoints
                    ? styles.showpointbuttondeactivate
                    : styles.showpointbutton
                }
                disabled={turkeyVisible}
                onClick={toggleShowPoints}
              >
                {showPoints ? "Hide Points" : "Show Points"}
              </button>
            )}
          </div>
          {selectedAreaKm2 && (
            <div className={styles.box}>Total size: {selectedAreaKm2}</div>
          )}
        </div>
        {turkeyVisible && (
          <div className={styles.buttonfield}>
            <button
              className={
                dragboxEnabled ? styles.dragbuttondeactivate : styles.dragbutton
              }
              onClick={toggleDragBox}
              disabled={!turkeyVisible}
            >
              <img
                src={dragboxEnabled ? dragboxstop : dragbox}
                alt="Toggle DragBox"
              />
            </button>
            <button
              className={
                drawEnabled ? styles.drawbuttondeactivate : styles.drawbutton
              }
              disabled={!turkeyVisible}
              onClick={toggleDrawing}
            >
              <img
                src={drawEnabled ? drawingstop : drawing}
                alt="Toggle Draw"
              />
            </button>
            <div className={styles.heatmapbuttonfield}>
              <button
                className={
                  heatmapPopulEnabled
                    ? styles.heatbuttondeactivate
                    : styles.heatbutton
                }
                disabled={!turkeyVisible}
                onClick={toggleHeatPopulMap}
              >
                <img
                  src={
                    heatmapPopulEnabled
                      ? heatmappopulstopicon
                      : heatmappopulicon
                  }
                  alt="Toggle HeatPopulMap"
                />
              </button>
              <button
                className={
                  heatmapTempEnabled
                    ? styles.heattempbuttondeactivate
                    : styles.heattempbutton
                }
                disabled={!turkeyVisible}
                onClick={toggleHeatTempMap}
              >
                <img
                  src={
                    heatmapTempEnabled
                      ? heatmapthermostopicon
                      : heatmapthermoicon
                  }
                  alt="Toggle HeatTempMap"
                />
              </button>
            </div>
          </div>
        )}
        {showPoints && (
          <div className={styles.buttonfield}>
            <button
              className={
                drawPointEnabled
                  ? styles.drawbuttondeactivate
                  : styles.drawbutton
              }
              onClick={toggleDrawPoints}
              disabled={!showPoints}
            >
              <img
                src={drawPointEnabled ? drawingstop : drawing}
                alt="Toggle Draw Points"
              />
            </button>
          </div>
        )}
      </div>

      <div ref={mapRef} className={styles.mapContainer}></div>

      {selectedPointId !== null &&
        pointPopupElementRef.current &&
        createPortal(
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const nameInput = form.elements.namedItem(
                "name"
              ) as HTMLInputElement | null;
              const descInput = form.elements.namedItem(
                "description"
              ) as HTMLInputElement | null;
              const latInput = form.elements.namedItem(
                "lat"
              ) as HTMLInputElement | null;
              const lonInput = form.elements.namedItem(
                "lon"
              ) as HTMLInputElement | null;

              if (!nameInput || !descInput || !latInput || !lonInput) {
                console.error("One or more inputs not found");
                return;
              }

              const name = nameInput.value;
              const description = descInput.value;
              const lat = parseFloat(latInput.value);
              const lon = parseFloat(lonInput.value);
              handleUpdatePoint({ name, description, lat, lon });
            }}
          >
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((d) => ({ ...d, name: e.target.value }))
              }
            />
            <input
              name="description"
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData((d) => ({ ...d, description: e.target.value }))
              }
            />
            <input
              name="lat"
              type="number"
              value={formData.lat}
              onChange={(e) =>
                setFormData((d) => ({
                  ...d,
                  lat: parseFloat(e.target.value),
                }))
              }
            />
            <input
              name="lon"
              type="number"
              value={formData.lon}
              onChange={(e) =>
                setFormData((d) => ({
                  ...d,
                  lon: parseFloat(e.target.value),
                }))
              }
            />
            <button type="submit">Update</button>
            <button type="button" onClick={handleDeletePoint}>
              Delete
            </button>
          </form>,
          pointPopupElementRef.current
        )}
        
    </div>
  );
}
