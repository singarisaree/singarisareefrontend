export interface DetectedAddress {
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  isHyderabad: boolean;
}

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export async function requestDeviceLocation(): Promise<GeolocationPosition> {
  const attempt = (enableHighAccuracy: boolean) =>
    getPosition({
      enableHighAccuracy,
      timeout: enableHighAccuracy ? 20000 : 30000,
      maximumAge: enableHighAccuracy ? 120000 : 300000,
    });

  try {
    return await attempt(true);
  } catch (error) {
    const code = (error as GeolocationPositionError)?.code;
    if (code === 1) throw error;
    return attempt(false);
  }
}

export async function reverseGeocodeAddress(lat: number, lon: number): Promise<DetectedAddress> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=en`,
    { headers: { 'Accept-Language': 'en' } },
  );
  if (!response.ok) throw new Error('Unable to map your location');

  const data = (await response.json()) as { address?: Record<string, string> };
  const address = data.address || {};

  const city = address.city || address.town || address.village || '';
  const state = address.state || '';
  const postalCode = address.postcode || '';
  const rawCountry = address.country || '';
  const country =
    rawCountry.toLowerCase() === 'india' || rawCountry.toLowerCase() === 'in' ? 'India' : rawCountry;
  const landmark =
    address.suburb || address.neighbourhood || address.county || address.state_district || '';
  const addressLine2 = address.road || address.residential || address.hamlet || '';
  const addressLine1 = address.house_number || '';

  const cityLower = city.toLowerCase();
  const districtLower = (address.state_district || '').toLowerCase();
  const suburbLower = (address.suburb || address.neighbourhood || '').toLowerCase();
  const countyLower = (address.county || '').toLowerCase();
  const hyderabadMarkers = [
    'hyderabad',
    'secunderabad',
    'cyberabad',
    'kukatpally',
    'gachibowli',
    'madhapur',
    'hitech city',
    'hitec city',
  ];
  const isHyderabad =
    hyderabadMarkers.some(
      (m) =>
        cityLower.includes(m) ||
        districtLower.includes(m) ||
        suburbLower.includes(m) ||
        countyLower.includes(m),
    ) || /^500\d{3}$/.test(postalCode);

  return {
    addressLine1,
    addressLine2,
    landmark,
    city,
    state,
    postalCode,
    country,
    latitude: lat,
    longitude: lon,
    isHyderabad,
  };
}

export async function detectUserAddress(): Promise<DetectedAddress> {
  const position = await requestDeviceLocation();
  return reverseGeocodeAddress(position.coords.latitude, position.coords.longitude);
}

export function getLocationErrorMessage(error: unknown): string {
  const code = (error as GeolocationPositionError)?.code;
  if (code === 1) {
    return 'Location permission denied. Allow access or enter your address manually.';
  }
  if (code === 2) {
    return 'Unable to find your location right now. Please enter your address manually.';
  }
  if (code === 3) {
    return 'Location is taking longer than expected. Please try again or enter your address manually.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Could not detect location. Please enter your address manually.';
}
