// Wraps the browser Geolocation API in a promise so it can be awaited
// inside async handlers. Rejects with a readable message if permission
// is denied or the browser doesn't support it.
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        const messages = {
          1: "Location permission denied. Please allow location access and try again.",
          2: "Location unavailable. Check your device's location/GPS settings.",
          3: "Location request timed out. Try again.",
        };
        reject(new Error(messages[error.code] || "Failed to get location"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};