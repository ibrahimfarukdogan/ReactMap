import { configureStore } from '@reduxjs/toolkit';
import mapReducer from "./mapSlice";
import pointReducer from "./pointSlice";

export const store = configureStore({
  reducer: {
    map: mapReducer,
    point: pointReducer,
  },
});

// For typing hooks like useSelector/useDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;