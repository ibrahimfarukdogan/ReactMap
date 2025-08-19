import { Style, Stroke, Fill } from "ol/style";
import CircleStyle from "ol/style/Circle";

export function stylePointClickedFeature(): Style {
  return new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: "#881414ff" }),
        stroke: new Stroke({ color: "#333", width: 2 }),
      }),
    })
}
export function stylePointHoverFeature(): Style {
  return new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: "#96621fff" }),
        stroke: new Stroke({ color: "#333", width: 2 }),
      }),
    })
}


// Style feature on select
export function styleClickedFeature(): Style {
  return new Style({
    stroke: new Stroke({ color: "#0097ddff", width: 2 }),
    fill: new Fill({ color: "rgba(255, 255, 255, 0.45)" }),
  });
}

// Style feature on hover (non-selected)
export function styleHoverFeature(): Style {
  return new Style({
    stroke: new Stroke({ color: "#ffaa00", width: 2 }),
    fill: new Fill({ color: "rgba(255, 255, 0, 0.3)" }),
  });
}

// Style feature on DragBox select
export function styleDragBoxFeature(): Style {
  return new Style({
    stroke: new Stroke({ color: "#ff514bff", width: 2 }),
    fill: new Fill({ color: "rgba(255, 0, 0, 0.3)" }),
  });
}

const regionColors: Record<string, string> = {
  "Akdeniz": "#FF6347",          // Tomato red
  "Güneydoğu Anadolu": "#7b34a3ff",// SlateBlue
  "Ege": "#3CB371",              // MediumSeaGreen
  "Doğu Anadolu": "#FFD700",     // Gold
  "Karadeniz": "#1E90FF",        // DodgerBlue
  "İç Anadolu": "#a15900ff",       // DarkOrange
  "Marmara": "#FF69B4",          // HotPink
};

export function styleRegionFeature(region: string): Style  {
  return new Style({
    image: new CircleStyle({
      radius: 10,
      fill: new Fill({ color: regionColors[region] ?? "#FF69B4"  }), // Hot pink
      stroke: new Stroke({ color: "#000000ff", width: 2 }),
    })
  })
}
