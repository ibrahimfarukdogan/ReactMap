// MapContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Map } from 'ol';

interface MapContextType {
  map: Map | null;
  setMap: (map: Map) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
const [map, setMap] = useState<Map | null>(null);

  return (
    <MapContext.Provider value={{ map, setMap }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMap must be used within a MapProvider');
  return context;
};
