export const locationService = {
  async getCurrentPosition(): Promise<{ ok: boolean; coords?: GeolocationCoordinates; error?: string }> {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve({ ok: false, error: 'Perangkat tidak mendukung GPS' });
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ ok: true, coords: pos.coords }),
        err => resolve({ ok: false, error: err.code === 1 ? 'Akses lokasi ditolak. Aktifkan GPS.' : err.code === 2 ? 'Lokasi tidak tersedia. Pastikan GPS aktif.' : 'Gagal mendapatkan lokasi' }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },

  haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  isWithinRadius(pos: GeolocationCoordinates, officeLat: number, officeLng: number, radius: number) {
    const distance = this.haversineMeters(pos.latitude, pos.longitude, officeLat, officeLng);
    return {
      ok: distance <= radius,
      distance
    };
  }
};
