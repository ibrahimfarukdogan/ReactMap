import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit';
import type { City } from "../services/api";
import { Draw } from "ol/interaction";

interface MapState {
  cityData: City[];
  drawPointInteraction: Draw | null;

  drawEnabled: boolean;
  dragboxEnabled: boolean;
  heatmapPopulEnabled: boolean;
  heatmapTempEnabled: boolean;
  drawPointEnabled: boolean;
  drawPolygonEnabled: boolean;
  drawCircleEnabled: boolean;
  featureClickEnabled: boolean;

  showPoints: boolean;
  turkeyVisible: boolean;
  cityOverlayEnabled: boolean;

  selectedPointId: number | null;
  selectedAreaKm2: string | null;
  DrawnRadiusKm: string | null;
}

const initialState: MapState = {
  cityData: [],
  drawPointInteraction: null,

  drawEnabled: false,
  dragboxEnabled: false,
  heatmapPopulEnabled: false,
  heatmapTempEnabled: false,
  drawPointEnabled: false,
  drawPolygonEnabled: false,
  drawCircleEnabled: false,
  featureClickEnabled: true,

  showPoints: false,
  turkeyVisible: false,
  cityOverlayEnabled: false,

  selectedPointId: null,
  selectedAreaKm2: null,
  DrawnRadiusKm: null,
};

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setCityData(state, action: PayloadAction<City[]>) {
      state.cityData = action.payload;
    },
    setDrawPointInteraction(state, action: PayloadAction<Draw | null>) {
      state.drawPointInteraction = action.payload;
    },
    setSelectedPointId(state, action: PayloadAction<number | null>) {
      state.selectedPointId = action.payload;
    },
    setSelectedAreaKm2(state, action: PayloadAction<string | null>) {
      state.selectedAreaKm2 = action.payload;
    },
    setDrawnRadiusKm: (state, action: PayloadAction<string | null>) => {
  state.DrawnRadiusKm = action.payload;
},
    setDrawEnabled(state, action: PayloadAction<boolean>) {
      state.drawEnabled = action.payload;
    },
    setDrawPointEnabled(state, action: PayloadAction<boolean>) {
      state.drawPointEnabled = action.payload;
    },
    setDrawPolygonEnabled(state, action: PayloadAction<boolean>) {
      state.drawCircleEnabled = action.payload;
    },
    setDrawCircleEnabled(state, action: PayloadAction<boolean>) {
      state.drawCircleEnabled = action.payload;
    },
    setFeatureClickEnabled(state, action: PayloadAction<boolean>) {
      state.featureClickEnabled = action.payload;
    },
    setDragboxEnabled(state, action: PayloadAction<boolean>) {
      state.dragboxEnabled = action.payload;
    },
    setHeatmapPopulEnabled(state, action: PayloadAction<boolean>) {
      state.heatmapPopulEnabled = action.payload;
    },
    setHeatmapTempEnabled(state, action: PayloadAction<boolean>) {
      state.heatmapTempEnabled = action.payload;
    },

    setShowPoints(state, action: PayloadAction<boolean>) {
      state.showPoints = action.payload;
    },
    setTurkeyVisible(state, action: PayloadAction<boolean>) {
      state.turkeyVisible = action.payload;
    },
    setCityOverlayEnabled(state, action: PayloadAction<boolean>) {
      state.cityOverlayEnabled = action.payload;
    },
  },
});

export const {
  setCityData,
  setSelectedPointId,
  setDrawPointInteraction,
  setDrawPolygonEnabled,
  setDrawCircleEnabled,

  setDrawEnabled,
  setDrawPointEnabled,
  setDragboxEnabled,
  setHeatmapPopulEnabled,
  setHeatmapTempEnabled,
  setFeatureClickEnabled,

  setShowPoints,
  setTurkeyVisible,
  setCityOverlayEnabled,
  setSelectedAreaKm2,
  setDrawnRadiusKm,
} = mapSlice.actions;

export default mapSlice.reducer;
