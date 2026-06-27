import { describe, it, expect, vi, beforeEach } from 'vitest'
import { locationService } from '$lib/services/locationService'

describe('locationService', () => {
  describe('haversineMeters', () => {
    it('returns 0 for identical coordinates', () => {
      expect(locationService.haversineMeters(-6.2088, 106.8456, -6.2088, 106.8456)).toBe(0)
    })

    it('calculates correct distance Jakarta–Bandung (~116 km)', () => {
      const d = locationService.haversineMeters(-6.2088, 106.8456, -6.9175, 107.6191)
      expect(d).toBeGreaterThan(110_000)
      expect(d).toBeLessThan(120_000)
    })

    it('is symmetric: A→B === B→A', () => {
      const d1 = locationService.haversineMeters(-6.2088, 106.8456, -6.9175, 107.6191)
      const d2 = locationService.haversineMeters(-6.9175, 107.6191, -6.2088, 106.8456)
      expect(d1).toBeCloseTo(d2, 0)
    })

    it('handles very short distances (~100 m)', () => {
      const d = locationService.haversineMeters(-6.2088, 106.8456, -6.2097, 106.8456)
      expect(d).toBeGreaterThan(90)
      expect(d).toBeLessThan(110)
    })

    it('handles antipodal points (~20 000 km)', () => {
      const d = locationService.haversineMeters(0, 0, 0, 180)
      expect(d).toBeGreaterThan(19_000_000)
    })
  })

  describe('isWithinRadius', () => {
    const officeLat = -6.2088
    const officeLng = 106.8456

    it('returns ok=true when exactly at the office', () => {
      const coords = { latitude: officeLat, longitude: officeLng } as GeolocationCoordinates
      const r = locationService.isWithinRadius(coords, officeLat, officeLng, 100)
      expect(r.ok).toBe(true)
      expect(r.distance).toBe(0)
    })

    it('returns ok=true when inside radius', () => {
      const coords = { latitude: -6.2090, longitude: 106.8458 } as GeolocationCoordinates
      const r = locationService.isWithinRadius(coords, officeLat, officeLng, 100)
      expect(r.ok).toBe(true)
    })

    it('returns ok=false when outside radius', () => {
      const coords = { latitude: -6.9175, longitude: 107.6191 } as GeolocationCoordinates
      const r = locationService.isWithinRadius(coords, officeLat, officeLng, 100)
      expect(r.ok).toBe(false)
    })

    it('returns ok=true when exactly at the boundary', () => {
      const coords = { latitude: -6.2088, longitude: 106.8465 } as GeolocationCoordinates
      const r = locationService.isWithinRadius(coords, officeLat, officeLng, 100)
      expect(r.ok).toBe(true)
    })
  })

  describe('getClosestLocation', () => {
    const coords = { latitude: -6.2088, longitude: 106.8456 } as GeolocationCoordinates

    it('finds the closest valid location', () => {
      const locations = [
        { name: 'Kantor A', lat: -6.2088, lng: 106.8456, radius: 100 },
        { name: 'Kantor B', lat: -6.9175, lng: 107.6191, radius: 100 },
      ]
      const r = locationService.getClosestLocation(coords, locations, -6.2, 106.8, 100)
      expect(r.name).toBe('Kantor A')
      expect(r.ok).toBe(true)
    })

    it('returns ok=false when no location is within radius', () => {
      const locations = [{ name: 'Far', lat: -6.9175, lng: 107.6191, radius: 10 }]
      const r = locationService.getClosestLocation(coords, locations, -6.2, 106.8, 100)
      expect(r.ok).toBe(false)
    })

    it('uses fallback when locations list is empty', () => {
      const r = locationService.getClosestLocation(coords, [], -6.2088, 106.8456, 100)
      expect(r.ok).toBe(true)
      expect(r.name).toBe('Kantor Pusat')
    })

    it('uses fallback when locations is null', () => {
      const r = locationService.getClosestLocation(coords, null as any, -6.2088, 106.8456, 100)
      expect(r.ok).toBe(true)
    })
  })

  describe('getCurrentPosition', () => {
    it('returns ok with coords on success', async () => {
      const mockCoords = { latitude: -6.2088, longitude: 106.8456, accuracy: 10 } as GeolocationCoordinates
      vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementationOnce(
        (success) => success({ coords: mockCoords } as GeolocationPosition)
      )
      const r = await locationService.getCurrentPosition()
      expect(r.ok).toBe(true)
      expect(r.coords).toEqual(mockCoords)
    })

    it('returns error when permission denied', async () => {
      vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementationOnce(
        (_success, error) => error?.({ code: 1, message: 'denied' } as GeolocationPositionError)
      )
      const r = await locationService.getCurrentPosition()
      expect(r.ok).toBe(false)
      expect(r.error).toContain('ditolak')
    })

    it('returns error when position unavailable', async () => {
      vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementationOnce(
        (_success, error) => error?.({ code: 2, message: 'unavailable' } as GeolocationPositionError)
      )
      const r = await locationService.getCurrentPosition()
      expect(r.ok).toBe(false)
      expect(r.error).toContain('tidak tersedia')
    })

    it('returns error for generic failure', async () => {
      vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementationOnce(
        (_success, error) => error?.({ code: 3, message: 'timeout' } as GeolocationPositionError)
      )
      const r = await locationService.getCurrentPosition()
      expect(r.ok).toBe(false)
      expect(r.error).toContain('Gagal')
    })

    it('returns error when geolocation is not supported', async () => {
      const orig = navigator.geolocation
      Object.defineProperty(navigator, 'geolocation', { value: undefined, writable: true })
      const r = await locationService.getCurrentPosition()
      expect(r.ok).toBe(false)
      expect(r.error).toContain('tidak mendukung')
      Object.defineProperty(navigator, 'geolocation', { value: orig, writable: true })
    })
  })
})
