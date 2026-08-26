export interface City {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  wageBase: number; // base daily wage in INR for that market
}

export const CITIES: City[] = [
  { id: "lucknow", name: "Lucknow", state: "Uttar Pradesh", latitude: 26.8467, longitude: 80.9462, wageBase: 900 },
  { id: "kanpur", name: "Kanpur", state: "Uttar Pradesh", latitude: 26.4499, longitude: 80.3319, wageBase: 880 },
  { id: "delhi", name: "Delhi", state: "Delhi", latitude: 28.6139, longitude: 77.2090, wageBase: 1100 },
  { id: "noida", name: "Noida", state: "Uttar Pradesh", latitude: 28.5355, longitude: 77.3910, wageBase: 1080 },
  { id: "varanasi", name: "Varanasi", state: "Uttar Pradesh", latitude: 25.3176, longitude: 82.9739, wageBase: 850 },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan", latitude: 26.9124, longitude: 75.7873, wageBase: 920 },
  { id: "mumbai", name: "Mumbai", state: "Maharashtra", latitude: 19.0760, longitude: 72.8777, wageBase: 1200 },
];

export function getCity(id: string): City {
  return CITIES.find((c) => c.id === id) || CITIES[0];
}
