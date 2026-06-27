import { describe, it, expect, beforeEach } from 'vitest'
import { readRoomIds, markRoomAsRead, clearReadRooms } from '$lib/stores/chatReadStore'
import { get } from 'svelte/store'

describe('chatReadStore', () => {
  beforeEach(() => {
    clearReadRooms()
  })

  describe('readRoomIds', () => {
    it('should initialize as empty Set', () => {
      const value = get(readRoomIds)
      expect(value).toBeInstanceOf(Set)
      expect(value.size).toBe(0)
    })
  })

  describe('markRoomAsRead', () => {
    it('should add a room ID to the set', () => {
      markRoomAsRead('room-1')
      const value = get(readRoomIds)
      expect(value.has('room-1')).toBe(true)
    })

    it('should add multiple room IDs', () => {
      markRoomAsRead('room-1')
      markRoomAsRead('room-2')
      markRoomAsRead('room-3')
      const value = get(readRoomIds)
      expect(value.size).toBe(3)
      expect(value.has('room-1')).toBe(true)
      expect(value.has('room-2')).toBe(true)
      expect(value.has('room-3')).toBe(true)
    })

    it('should not duplicate room IDs', () => {
      markRoomAsRead('room-1')
      markRoomAsRead('room-1')
      const value = get(readRoomIds)
      expect(value.size).toBe(1)
    })
  })

  describe('clearReadRooms', () => {
    it('should clear all room IDs', () => {
      markRoomAsRead('room-1')
      markRoomAsRead('room-2')
      expect(get(readRoomIds).size).toBe(2)

      clearReadRooms()
      expect(get(readRoomIds).size).toBe(0)
    })

    it('should work on already empty set', () => {
      clearReadRooms()
      expect(get(readRoomIds).size).toBe(0)
    })
  })
})
