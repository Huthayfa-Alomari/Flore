'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, Video, Square, Trash2, AlertCircle } from 'lucide-react'

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
        <div className="rounded-2xl border border-flore-border/70 bg-flore-bg p-4">
            {!previewUrl && (
                <>
                    {/* مبدّل الوضع — مقطعية أنيقة */}
                    <div className="mb-4 flex gap-1 rounded-full bg-flore-subtle p-1">
                        <button
                            type="button"
                            onClick={() => setMode('audio')}
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-all duration-200 ease-flore ${mode === 'audio'
                                ? 'bg-flore-card text-flore-primary shadow-luxury-soft'
                                : 'text-flore-text-secondary hover:text-flore-text-primary'
                                }`}
                        >
                            <Mic className="h-4 w-4" /> صوت
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('video')}
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-all duration-200 ease-flore ${mode === 'video'
                                ? 'bg-flore-card text-flore-primary shadow-luxury-soft'
                                : 'text-flore-text-secondary hover:text-flore-text-primary'
                                }`}
                        >
                            <Video className="h-4 w-4" /> فيديو
                        </button>
                    </div>

                    {mode === 'video' && (
                        <video ref={videoPreviewRef} autoPlay muted playsInline className="mb-4 aspect-video w-full rounded-2xl border border-flore-border/70 bg-black" />
                    )}

                    {error && (
                        <p className="mb-3 flex items-center gap-2 rounded-xl border border-flore-error/20 bg-flore-error/5 px-3 py-2 text-xs text-flore-error">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {error}
                        </p>
                    )}

                    {!isRecording ? (
                        <button
                            type="button"
                            onClick={startRecording}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-flore-primary py-3 text-sm font-bold text-white transition-all duration-200 ease-flore hover:bg-flore-primary-dark hover:shadow-luxury-soft active:scale-[0.98]"
                        >
                            {mode === 'audio' ? <Mic className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                            ابدأ التسجيل (حتى <span className="flore-price">{MAX_SECONDS}</span> ثانية)
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-flore-error py-3 text-sm font-bold text-white transition-all duration-200 ease-flore hover:shadow-luxury-soft active:scale-[0.98]"
                        >
                            <Square className="h-4 w-4" />
                            إيقاف (<span className="flore-price">{MAX_SECONDS - seconds}</span>ث متبقية)
                        </button>
                    )}
                </>
            )}

            {previewUrl && (
                <div className="space-y-3">
                    {mode === 'video' ? (
                        <video src={previewUrl} controls className="w-full rounded-2xl border border-flore-border/70" />
                    ) : (
                        <audio src={previewUrl} controls className="w-full" />
                    )}
                    <button
                        type="button"
                        onClick={reset}
                        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-flore-error/20 bg-flore-error/5 py-2.5 text-sm font-medium text-flore-error transition-all duration-200 ease-flore hover:bg-flore-error/10 active:scale-[0.98]"
                    >
                        <Trash2 className="h-4 w-4" /> حذف وإعادة التسجيل
                    </button>
                </div>
            )}
        </div>
    )
}
