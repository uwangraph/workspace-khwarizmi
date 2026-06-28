import { supabase } from '$lib/supabase'
import { callState, floatingReactions, raisedHands, sharingPeers, activeSpeaker, type FloatingReaction, type CallKind } from '$lib/stores/callStore'
import { notificationService } from './notificationService'
import { chatService } from './chatService'
import toast from 'svelte-french-toast'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

interface Signal {
  type: 'join' | 'offer' | 'answer' | 'ice-candidate' | 'leave' | 'end' | 'raise-hand' | 'reaction' | 'screen-share' | 'mute-remote' | 'kick-remote'
  from: string
  fromName: string
  to?: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  emoji?: string
  raised?: boolean
  sharing?: boolean
}

interface CallInvite {
  roomId: string
  roomName: string
  callerId: string
  callerName: string
  callerAvatar?: string
  participantIds: string[]
  kind: CallKind
  voiceOnly?: boolean
}

class CallService {
  private roomId = ''
  private roomName = ''
  private userId = ''
  private userName = ''
  private kind: CallKind = 'meeting'
  private voiceOnly = false
  private isCaller = false
  private isAnswered = false
  private startTime: number | null = null
  private participantIds: string[] = []
  private signalChannel: ReturnType<typeof supabase.channel> | null = null
  private globalChannel: ReturnType<typeof supabase.channel> | null = null
  private peerConnections = new Map<string, RTCPeerConnection>()
  private peerNames = new Map<string, string>()
  private ringtoneAudio: HTMLAudioElement | null = null
  private audioContext: AudioContext | null = null
  private analysers = new Map<string, { analyser: AnalyserNode, data: Uint8Array<ArrayBuffer> }>()
  private speakerInterval: any = null

  localStream: MediaStream | null = null
  private screenStream: MediaStream | null = null
  private cameraTrackBackup: MediaStreamTrack | null = null

  onRemoteStream: ((peerId: string, peerName: string, stream: MediaStream) => void) | null = null
  onPeerLeft: ((peerId: string) => void) | null = null
  onCallEnded: (() => void) | null = null
  onLocalStreamChanged: (() => void) | null = null

  private playSound(name: 'ringtone' | 'connect' | 'disconnect' | 'mute' | 'unmute' | 'busy') {
    if (typeof Audio === 'undefined') return
    
    // Matikan ringtone jika suara lain dimainkan (kecuali mute/unmute)
    if (name !== 'mute' && name !== 'unmute') {
      this.stopSounds()
    }

    const sounds: Record<string, string> = {
      ringtone: 'https://assets.mixkit.co/active_storage/sfx/1358/1358-preview.mp3', // Contoh URL ringtone
      connect: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
      disconnect: 'https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3',
      mute: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      unmute: 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3',
      busy: 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3',
    }

    try {
      const audio = new Audio(sounds[name])
      if (name === 'ringtone') {
        audio.loop = true
        this.ringtoneAudio = audio
      }
      audio.play().catch(() => console.warn('[CallService] Audio playback blocked'))
    } catch (e) {
      console.warn('[CallService] Failed to play sound:', e)
    }
  }

  private stopSounds() {
    if (this.ringtoneAudio) {
      this.ringtoneAudio.pause()
      this.ringtoneAudio = null
    }
  }

  private initAudioContext() {
    if (typeof window === 'undefined') return
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  private addStreamToAnalyser(peerId: string, stream: MediaStream) {
    try {
      this.initAudioContext()
      if (!this.audioContext) return

      const source = this.audioContext.createMediaStreamSource(stream)
      const analyser = this.audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      this.analysers.set(peerId, { analyser, data: new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer> })
      this.startSpeakerDetection()
    } catch (e) {
      console.warn('[CallService] Failed to add stream to analyser:', e)
    }
  }

  private startSpeakerDetection() {
    if (this.speakerInterval) return
    this.speakerInterval = setInterval(() => {
      let loudestId: string | null = null
      let maxVol = 0
      this.analysers.forEach(({ analyser, data }, id) => {
        analyser.getByteFrequencyData(data)
        const vol = data.reduce((a, b) => a + b, 0) / data.length
        if (vol > maxVol && vol > 20) {
          maxVol = vol
          loudestId = id
        }
      })
      activeSpeaker.set(loudestId)
    }, 1000)
  }

  async subscribeGlobal(userId: string) {
    this.userId = userId

    if (this.globalChannel) return

    this.globalChannel = supabase.channel('workspace-calls', {
      config: { broadcast: { self: false } },
    })

    this.globalChannel.on('broadcast', { event: 'call-invite' }, ({ payload }: { payload: CallInvite }) => {
      if (payload.callerId === userId) return
      if (!payload.participantIds.includes(userId)) return
      
      this.playSound('ringtone')

      callState.set({
        status: 'incoming',
        roomId: payload.roomId,
        roomName: payload.roomName,
        callerId: payload.callerId,
        callerName: payload.callerName,
        callerAvatar: payload.callerAvatar,
        kind: payload.kind ?? 'meeting',
        voiceOnly: payload.voiceOnly,
      })
    })

    this.globalChannel.on('broadcast', { event: 'call-dismissed' }, ({ payload }: { payload: { roomId: string } }) => {
      callState.update((s) => {
        if (s.status === 'incoming' && s.roomId === payload.roomId) {
          this.stopSounds()
          return { status: 'idle' }
        }
        return s
      })
    })

    this.globalChannel.subscribe()
  }

  unsubscribeGlobal() {
    if (this.globalChannel) {
      supabase.removeChannel(this.globalChannel)
      this.globalChannel = null
    }
  }

  async getLocalStream(video = true, audio = true): Promise<MediaStream> {
    if (this.localStream) {
      const hasLiveVideo = this.localStream.getVideoTracks().some(t => t.readyState === 'live')
      if (!video || hasLiveVideo) return this.localStream
      this.localStream.getTracks().forEach(t => t.stop())
      this.localStream = null
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio })
    this.localStream = stream
    return stream
  }

  releaseLocalStream() {
    this.localStream?.getTracks().forEach(t => t.stop())
    this.localStream = null
  }

  private createPeerConnection(peerId: string, peerName: string): RTCPeerConnection {
    const existing = this.peerConnections.get(peerId)
    if (existing) return existing

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.peerNames.set(peerId, peerName)

    this.localStream?.getTracks().forEach((track) => pc.addTrack(track, this.localStream!))

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.signal({
          type: 'ice-candidate',
          from: this.userId,
          fromName: this.userName,
          to: peerId,
          candidate: candidate.toJSON(),
        })
      }
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams
      this.addStreamToAnalyser(peerId, stream)
      this.onRemoteStream?.(peerId, peerName, stream)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.removePeer(peerId)
      }
    }

    this.peerConnections.set(peerId, pc)
    return pc
  }

  private removePeer(peerId: string) {
    this.peerConnections.get(peerId)?.close()
    this.peerConnections.delete(peerId)
    this.peerNames.delete(peerId)
    this.analysers.delete(peerId)
    if (this.analysers.size === 0 && this.speakerInterval) {
      clearInterval(this.speakerInterval)
      this.speakerInterval = null
      activeSpeaker.set(null)
    }
    raisedHands.update((s) => {
      if (s.has(peerId)) {
        const next = new Set(s)
        next.delete(peerId)
        return next
      }
      return s
    })
    sharingPeers.update((s) => {
      if (s.has(peerId)) {
        const next = new Set(s)
        next.delete(peerId)
        return next
      }
      return s
    })
    this.onPeerLeft?.(peerId)
  }

  private signal(s: Signal): Promise<void> {
    return this.signalChannel?.send({ type: 'broadcast', event: 'signal', payload: s }).then(() => {}) ?? Promise.resolve()
  }

  prepareCall(roomId: string, roomName: string, mode: 'start' | 'join', participantIds?: string[]) {
    callState.set({ status: 'prejoin', roomId, roomName, mode, participantIds, kind: 'meeting' })
  }

  async startCall(
    roomId: string,
    roomName: string,
    userId: string,
    userName: string,
    participantIds: string[],
    opts: { kind?: CallKind; voiceOnly?: boolean; callerAvatar?: string } = {}
  ) {
    const kind = opts.kind ?? 'meeting'
    const voiceOnly = !!opts.voiceOnly
    this.roomId = roomId
    this.roomName = roomName
    this.userId = userId
    this.userName = userName
    this.participantIds = participantIds
    this.kind = kind
    this.voiceOnly = voiceOnly
    this.isCaller = true
    this.isAnswered = false
    this.startTime = Date.now()

    this.globalChannel?.send({
      type: 'broadcast',
      event: 'call-invite',
      payload: {
        roomId, roomName, callerId: userId, callerName: userName,
        callerAvatar: opts.callerAvatar, participantIds, kind, voiceOnly,
      } satisfies CallInvite,
    })

    // Kirim notifikasi push FCM (Suggestion 3)
    notificationService.sendBulk(
      participantIds.filter(id => id !== userId),
      'call',
      `Panggilan ${voiceOnly ? 'Suara' : 'Video'} Masuk`,
      `Panggilan dari ${userName}`,
      {
        type: 'call',
        roomId,
        roomName,
        callerId: userId,
        callerName: userName,
        kind,
        voiceOnly
      }
    ).catch(e => console.warn('[CallService] Push notification failed:', e))

    await this.getLocalStream(!voiceOnly, true)
    await this.joinSignalChannel(roomId, userId, userName)
    callState.set({ status: 'calling', roomId, roomName, kind, voiceOnly })
  }

  async joinCall(
    roomId: string,
    roomName: string,
    userId: string,
    userName: string,
    opts: { kind?: CallKind; voiceOnly?: boolean } = {}
  ) {
    this.stopSounds()
    const kind = opts.kind ?? 'meeting'
    const voiceOnly = !!opts.voiceOnly
    this.roomId = roomId
    this.roomName = roomName
    this.userId = userId
    this.userName = userName
    this.kind = kind
    this.voiceOnly = voiceOnly
    this.isCaller = false
    this.isAnswered = true
    this.startTime = Date.now()

    await this.getLocalStream(!voiceOnly, true)
    await this.joinSignalChannel(roomId, userId, userName)
    callState.set({ status: 'ongoing', roomId, roomName, kind, voiceOnly })
  }

  async reinvite(extraParticipantIds: string[] = []): Promise<number> {
    if (!this.roomId || !this.globalChannel) return 0
    const merged = Array.from(new Set([...this.participantIds, ...extraParticipantIds]))
    this.participantIds = merged
    await this.globalChannel.send({
      type: 'broadcast',
      event: 'call-invite',
      payload: {
        roomId: this.roomId,
        roomName: this.roomName,
        callerId: this.userId,
        callerName: this.userName,
        participantIds: merged,
        kind: 'meeting',
      } satisfies CallInvite,
    })
    return merged.length
  }

  getRoomLink(): string {
    if (!this.roomId) return ''
    return `${window.location.origin}/chat/${this.roomId}`
  }

  private async joinSignalChannel(roomId: string, userId: string, userName: string) {
    if (this.signalChannel) {
      supabase.removeChannel(this.signalChannel)
      this.signalChannel = null
    }

    this.signalChannel = supabase.channel(`call:${roomId}`, {
      config: { broadcast: { self: false } },
    })

    this.signalChannel.on('broadcast', { event: 'signal' }, ({ payload }: { payload: Signal }) => {
      this.handleSignal(payload)
    })

    await new Promise<void>((resolve) => {
      this.signalChannel!.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') resolve()
      })
    })

    this.signal({ type: 'join', from: userId, fromName: userName })
  }

  private async handleSignal(signal: Signal) {
    const { type, from, fromName, to } = signal
    if (from === this.userId) return
    if (to && to !== this.userId) return

    switch (type) {
      case 'join': {
        const pc = this.createPeerConnection(from, fromName)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        this.signal({ type: 'offer', from: this.userId, fromName: this.userName, to: from, offer: pc.localDescription! })
        callState.update((s) => (s.status === 'calling' ? { ...s, status: 'ongoing' } : s))
        this.isAnswered = true
        this.playSound('connect')
        break
      }

      case 'offer': {
        const pc = this.createPeerConnection(from, fromName)
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer!))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        this.signal({ type: 'answer', from: this.userId, fromName: this.userName, to: from, answer: pc.localDescription! })
        callState.update((s) => (s.status === 'calling' ? { ...s, status: 'ongoing' } : s))
        this.isAnswered = true
        this.playSound('connect')
        break
      }

      case 'answer': {
        const pc = this.peerConnections.get(from)
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.answer!))
        this.isAnswered = true
        this.playSound('connect')
        break
      }

      case 'ice-candidate': {
        const pc = this.peerConnections.get(from)
        if (pc && signal.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
          } catch {}
        }
        break
      }

      case 'leave': {
        this.removePeer(from)
        this.playSound('disconnect')
        break
      }

      case 'end': {
        const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0
        await this.logCallMessage('ended', duration)
        this.playSound('disconnect')
        this.cleanupCall()
        callState.set({ status: 'idle' })
        this.onCallEnded?.()
        break
      }

      case 'raise-hand': {
        raisedHands.update((s) => {
          const next = new Set(s)
          if (signal.raised) next.add(from)
          else next.delete(from)
          return next
        })
        break
      }

      case 'reaction': {
        if (signal.emoji) this.spawnReaction(from, fromName, signal.emoji)
        break
      }

      case 'screen-share': {
        sharingPeers.update((s) => {
          const next = new Set(s)
          if (signal.sharing) next.add(from)
          else next.delete(from)
          return next
        })
        break
      }

      case 'mute-remote': {
        if (to === this.userId) {
          this.toggleAudio(false)
          toast.error('Mikrofon Anda dimatikan oleh host')
        }
        break
      }

      case 'kick-remote': {
        if (to === this.userId) {
          toast.error('Anda telah dikeluarkan dari rapat')
          this.leaveCall()
        }
        break
      }
    }
  }

  muteRemote(peerId: string) {
    this.signal({ type: 'mute-remote', from: this.userId, fromName: this.userName, to: peerId })
  }

  kickRemote(peerId: string) {
    this.signal({ type: 'kick-remote', from: this.userId, fromName: this.userName, to: peerId })
  }

  async endCall() {
    const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0
    
    // Log call event before cleaning up
    await this.logCallMessage(this.isAnswered ? 'ended' : 'missed', duration)

    this.playSound('disconnect')
    await Promise.all([
      this.signal({ type: 'end', from: this.userId, fromName: this.userName }),
      this.globalChannel?.send({
        type: 'broadcast',
        event: 'call-dismissed',
        payload: { roomId: this.roomId },
      }),
    ])
    this.cleanupCall()
    callState.set({ status: 'idle' })
    this.onCallEnded?.()
  }

  async leaveCall() {
    const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0
    
    // Log call event before cleaning up
    await this.logCallMessage(this.isAnswered ? 'ended' : 'missed', duration)
    
    this.playSound('disconnect')
    await this.signal({ type: 'leave', from: this.userId, fromName: this.userName })
    this.cleanupCall()
    callState.set({ status: 'idle' })
    this.onCallEnded?.()
  }

  private async logCallMessage(status: 'missed' | 'ended' | 'declined', duration?: number) {
    if (!this.roomId || !this.userId) return

    let content = ''
    
    if (status === 'missed') {
      content = 'Panggilan tidak terjawab'
    } else if (status === 'declined') {
      content = 'Panggilan ditolak'
    } else if (status === 'ended' && duration !== undefined) {
      const mins = Math.floor(duration / 60)
      const secs = duration % 60
      const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
      content = `Panggilan berakhir (${durationStr})`
    }

    if (!content) return

    try {
      await supabase.from('chat_messages').insert({
        room_id: this.roomId,
        sender_id: this.userId,
        type: 'call',
        content,
        metadata: {
          call_status: status,
          duration,
          kind: this.voiceOnly ? 'voice' : 'video'
        }
      })
    } catch (e) {
      console.error('Failed to log call message:', e)
    }
  }

  declineCall() {
    this.stopSounds()
    callState.set({ status: 'idle' })
  }

  cancelPreJoin() {
    this.stopSounds()
    this.releaseLocalStream()
    callState.set({ status: 'idle' })
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => { t.enabled = enabled })
    this.playSound(enabled ? 'unmute' : 'mute')
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => { t.enabled = enabled })
  }

  hasLiveVideoTrack(): boolean {
    return !!this.localStream?.getVideoTracks().some(t => t.readyState === 'live')
  }

  /**
   * Pastikan local stream punya video track aktif. Kalau belum (voice call), acquire kamera,
   * tambahkan ke localStream + semua peer connection, lalu renegotiate.
   * Return true kalau sukses (video track sekarang tersedia & enabled).
   */
  async ensureLocalVideo(): Promise<boolean> {
    if (!this.localStream) return false

    const existing = this.localStream.getVideoTracks().find(t => t.readyState === 'live')
    if (existing) {
      existing.enabled = true
      return true
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true })
      const videoTrack = newStream.getVideoTracks()[0]
      if (!videoTrack) return false

      this.localStream.addTrack(videoTrack)

      // Tambah ke peer connections & renegotiate dengan offer baru
      for (const [peerId, pc] of this.peerConnections) {
        const nullSender = pc.getSenders().find(s => s.track === null)
        if (nullSender) {
          await nullSender.replaceTrack(videoTrack)
        } else {
          pc.addTrack(videoTrack, this.localStream)
        }
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        this.signal({ type: 'offer', from: this.userId, fromName: this.userName, to: peerId, offer: pc.localDescription! })
      }

      this.onLocalStreamChanged?.()
      return true
    } catch (e) {
      console.error('ensureLocalVideo failed:', e)
      return false
    }
  }

  raiseHand(raised: boolean) {
    raisedHands.update((s) => {
      const next = new Set(s)
      if (raised) next.add(this.userId)
      else next.delete(this.userId)
      return next
    })
    this.signal({ type: 'raise-hand', from: this.userId, fromName: this.userName, raised })
  }

  sendReaction(emoji: string) {
    this.spawnReaction(this.userId, this.userName, emoji)
    this.signal({ type: 'reaction', from: this.userId, fromName: this.userName, emoji })
  }

  get isSharingScreen() {
    return this.screenStream !== null
  }

  isScreenShareSupported(): boolean {
    return typeof navigator !== 'undefined'
      && !!navigator.mediaDevices
      && typeof navigator.mediaDevices.getDisplayMedia === 'function'
  }

  async startScreenShare(): Promise<void> {
    if (!this.isScreenShareSupported()) throw new Error('Browser tidak mendukung berbagi layar')
    if (this.screenStream) return

    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    const screenTrack = displayStream.getVideoTracks()[0]
    if (!screenTrack) {
      displayStream.getTracks().forEach(t => t.stop())
      throw new Error('Tidak ada track layar yang tersedia')
    }

    const oldCameraTrack = this.localStream?.getVideoTracks()[0] ?? null
    this.cameraTrackBackup = oldCameraTrack

    // Ganti track video di semua peer connections
    this.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
      if (sender) sender.replaceTrack(screenTrack)
    })

    // Update local stream: hapus camera track, masukkan screen track
    if (this.localStream && oldCameraTrack) this.localStream.removeTrack(oldCameraTrack)
    this.localStream?.addTrack(screenTrack)

    this.screenStream = displayStream

    // Browser menyediakan event 'ended' saat user klik 'Stop sharing' di overlay browser
    screenTrack.addEventListener('ended', () => {
      this.stopScreenShare().catch(() => {})
    })

    sharingPeers.update((s) => {
      const next = new Set(s)
      next.add(this.userId)
      return next
    })
    await this.signal({ type: 'screen-share', from: this.userId, fromName: this.userName, sharing: true })
    this.onLocalStreamChanged?.()
  }

  async stopScreenShare(): Promise<void> {
    if (!this.screenStream) return

    const screenTrack = this.screenStream.getVideoTracks()[0]
    this.screenStream.getTracks().forEach(t => t.stop())
    this.screenStream = null

    // Kembalikan camera track ke localStream + ke semua peer
    const cameraTrack = this.cameraTrackBackup
    this.cameraTrackBackup = null

    if (this.localStream && screenTrack) this.localStream.removeTrack(screenTrack)
    if (cameraTrack && cameraTrack.readyState === 'live') {
      this.localStream?.addTrack(cameraTrack)
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
        if (sender) sender.replaceTrack(cameraTrack)
      })
    } else {
      // Kamera mati / track sudah ended — null-kan track sender agar peer tahu video off
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
        if (sender) sender.replaceTrack(null)
      })
    }

    sharingPeers.update((s) => {
      if (!s.has(this.userId)) return s
      const next = new Set(s)
      next.delete(this.userId)
      return next
    })
    await this.signal({ type: 'screen-share', from: this.userId, fromName: this.userName, sharing: false })
    this.onLocalStreamChanged?.()
  }

  private spawnReaction(peerId: string, peerName: string, emoji: string) {
    const reaction: FloatingReaction = {
      id: `${peerId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      emoji,
      peerId,
      peerName,
    }
    floatingReactions.update((s) => [...s, reaction])
    setTimeout(() => {
      floatingReactions.update((s) => s.filter((r) => r.id !== reaction.id))
    }, 3000)
  }

  get currentUserId() {
    return this.userId
  }

  get currentUserName() {
    return this.userName
  }

  get isHost() {
    return this.isCaller
  }

  private cleanupCall() {
    this.localStream?.getTracks().forEach((t) => t.stop())
    this.localStream = null
    this.screenStream?.getTracks().forEach((t) => t.stop())
    this.screenStream = null
    this.cameraTrackBackup = null
    this.peerConnections.forEach((pc) => pc.close())
    this.peerConnections.clear()
    this.peerNames.clear()
    this.analysers.clear()
    if (this.speakerInterval) {
      clearInterval(this.speakerInterval)
      this.speakerInterval = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    activeSpeaker.set(null)
    this.participantIds = []
    this.roomName = ''
    this.kind = 'meeting'
    this.voiceOnly = false
    this.isCaller = false
    this.isAnswered = false
    this.startTime = null
    raisedHands.set(new Set())
    sharingPeers.set(new Set())
    floatingReactions.set([])
    if (this.signalChannel) {
      supabase.removeChannel(this.signalChannel)
      this.signalChannel = null
    }
  }
}

export const callService = new CallService()
