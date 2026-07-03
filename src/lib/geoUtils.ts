/**
 * Utilitários de Geolocalização Matemática
 * V21 Mobile Geofencing
 */

/**
 * Calcula a distância em Metros entre duas Coordenadas Globais (Lat/Lng)
 * Utiliza a Fórmula de Haversine para considerar a curvatura do planeta Terra.
 * 
 * @param lat1 Latitude do Ponto A (Usuário)
 * @param lon1 Longitude do Ponto A (Usuário)
 * @param lat2 Latitude do Ponto B (Sede/Empresa)
 * @param lon2 Longitude do Ponto B (Sede/Empresa)
 * @returns Distância física aproximada em metros.
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRadian = (angle: number) => (Math.PI / 180) * angle;

  const R = 6371e3; // Raio volumétrico da Terra em Metros
  const radLat1 = toRadian(lat1);
  const radLat2 = toRadian(lat2);
  const deltaLat = toRadian(lat2 - lat1);
  const deltaLon = toRadian(lon2 - lon1);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(radLat1) * Math.cos(radLat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceInMetres = R * c;
  
  return distanceInMetres;
}
