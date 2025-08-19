const API_KEY = '01f3e00ea619360866f4fcb73cb1df8a';

export interface City {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  population: number;
  region: string;
  temperature?: number;
}
export async function fetchCities(): Promise<City[]> {
  const response = await fetch('/cities_of_turkey.json');
  if (!response.ok) {
    throw new Error('Failed to fetch cities');
  }
  const data: City[] = await response.json();
  return data;
}
export const getWeatherForCity = async (lat: number, lon: number) => {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    if (!res.ok) {
      const errorData = await res.json();
      console.error('OpenWeatherMap API error:', errorData);
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (error: any) {
    console.error('Error getting temperature data:', error.message || error);
    throw new Error('Failed to get temperature data');
  }
};