import "./App.css";
import MapView from "./components/MapView";
import { MapProvider } from "./context/MapContext";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";

function App() {
  return (
    <Provider store={store}>
    <Router>
      <MapProvider>
        <Routes>
          <Route path="/" element={<MapView />} />
        </Routes>
      </MapProvider>
    </Router>
    </Provider>
  );
}

export default App;
