import { createSlice } from "@reduxjs/toolkit";
import type {PayloadAction} from '@reduxjs/toolkit';
import type { Points } from "../types/Points";

interface PointState {
  points: Points[];
  formData: {
    name: string;
    description: string;
    lat: number;
    lon: number;
  };
}

const initialState: PointState = {
  points: [],
  formData: {
    name: "",
    description: "",
    lat: 0,
    lon: 0,
  },
};

const pointSlice = createSlice({
  name: "point",
  initialState,
  reducers: {
    addPoint: (state, action: PayloadAction<Points>) => {
      state.points.push(action.payload);
    },
    setFormData: (
      state,
      action: PayloadAction<{
        name: string;
        description: string;
        lat: number;
        lon: number;
      }>
    ) => {
      state.formData = action.payload;
    },
    clearFormData: (state) => {
      state.formData = {
        name: "",
        description: "",
        lat: 0,
        lon: 0,
      };
    },
  },
});

export const { addPoint, setFormData, clearFormData } = pointSlice.actions;

export default pointSlice.reducer;
