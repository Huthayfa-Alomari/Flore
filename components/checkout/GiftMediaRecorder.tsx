'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, Video, Square, Trash2 } from 'lucide-react'

const MAX_SECONDS = 30

export function GiftMediaRecorder({
    onRecorded,
}: {
    onRecorded: (blob: Blob, mimeType: 'audio' | 'video') => void
}) {
    const [mode, setMode] = useState<'audio' | 'video'>('audio')
    const [isRecording, setIsRecording] = useState(false)
    const [seconds, setSeconds] = useState(0)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const streamRef = useRef<MediaStream | null>(null)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const videoPreviewRef = useRef<HTMLVideoElement>(null)

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        if (timerRef.current) clearInterval(timerRef.current)
    }, [])

    const startRecording = useCallback(async () => {
        setError(null)
        try {
            const constraints = mode === 'video' ? { audio: true, video: { facingMode: 'user' } } : { audio: true }
            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.current = stream

            if (mode === 'video' && videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream
            }

            const recorder = new MediaRecorder(stream)
            recorderRef.current = recorder
            chunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mode === 'video' ? 'video/webm' : 'audio/webm' })
                setPreviewUrl(URL.createObjectURL(blob))
                onRecorded(blob, mode)
                stopStream()
            }

            recorder.start()
            setIsRecording(true)
            setSeconds(0)

            timerRef.current = setInterval(() => {
                setSeconds((s) => {
                    if (s + 1 >= MAX_SECONDS) {
                        recorder.stop()
                        setIsRecording(false)
                        return MAX_SECONDS
                    }
                    return s + 1
                })
            }, 1000)
        } catch {
            setError('تعذر الوصول للميكروفون/الكاميرا — تأكد من إعطاء الصلاحية')
        }
    }, [mode, onRecorded, stopStream])

    const stopRecording = useCallback(() => {
        recorderRef.current?.stop()
        setIsRecording(false)
    }, [])

    const reset = useCallback(() => {
        setPreviewUrl(null)
        setSeconds(0)
        setError(null)
    }, [])

    return (
        <div className="bg-flore-bg rounded-xl border border-flore-border p-4">
            {!previewUrl && (
                <>
                    <div className="flex gap-2 mb-3">
                        <button
                            type="button"
                            onClick={() => setMode('audio')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition ${mode === 'audio' ? 'bg-flore-primary text-white' : 'bg-flore-card border border-flore-border text-flore-text-secondary'}`}
                        >
                            <Mic className="h-4 w-4" /> صوت
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('video')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition ${mode === 'video' ? 'bg-flore-primary text-white' : 'bg-flore-card border border-flore-border text-flore-text-secondary'}`}
                        >
                            <Video className="h-4 w-4" /> فيديو
                        </button>
                    </div>

                    {mode === 'video' && (
                        <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full rounded-lg mb-3 bg-black aspect-video" />
                    )}

                    {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

                    {!isRecording ? (
                        <button
                            type="button"
                            onClick={startRecording}
                            className="w-full bg-flore-primary text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                        >
                            {mode === 'audio' ? <Mic className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                            ابدأ التسجيل (حتى {MAX_SECONDS} ثانية)
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="w-full bg-red-500 text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                        >
                            <Square className="h-4 w-4" /> إيقاف ({MAX_SECONDS - seconds}ث متبقية)
                        </button>
                    )}
                </>
            )}

            {previewUrl && (
                <div className="space-y-3">
                    {mode === 'video' ? (
                        <video src={previewUrl} controls className="w-full rounded-lg" />
                    ) : (
                        <audio src={previewUrl} controls className="w-full" />
                    )}
                    <button
                        type="button"
                        onClick={reset}
                        className="w-full flex items-center justify-center gap-1.5 text-red-500 text-sm font-bold py-2"
                    >
                        <Trash2 className="h-4 w-4" /> حذف وإعادة التسجيل
                    </button>
                </div>
            )}
        </div>
    )
}