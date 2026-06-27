import { writable } from 'svelte/store'

export type CallKind = 'call' | 'meeting'

export type CallStateData =
  | { status: 'idle' }
  | { status: 'incoming'; roomId: string; roomName: string; callerId: string; callerName: string; callerAvatar?: string; kind: CallKind; voiceOnly?: boolean }
  | { status: 'prejoin'; roomId: string; roomName: string; mode: 'start' | 'join'; participantIds?: string[]; kind: 'meeting' }
  | { status: 'calling'; roomId: string; roomName: string; kind: CallKind; voiceOnly?: boolean; isMinimized?: boolean }
  | { status: 'ongoing'; roomId: string; roomName: string; kind: CallKind; voiceOnly?: boolean; isMinimized?: boolean }

export const callState = writable<CallStateData>({ status: 'idle' })

export type FloatingReaction = {
  id: string
  emoji: string
  peerId: string
  peerName: string
}

export const floatingReactions = writable<FloatingReaction[]>([])

export const raisedHands = writable<Set<string>>(new Set())

export const sharingPeers = writable<Set<string>>(new Set())

export const activeSpeaker = writable<string | null>(null)
