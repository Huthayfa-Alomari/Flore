'use client'

interface LiveMapProps {
  lat: number
  lng: number
  className?: string
}

export function LiveMap({ lat, lng, className = '' }: LiveMapProps) {
  const mapUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzFCsDU3JzIwLjAiTiAzNcKwNTcnMjAuMCJF!5e0!3m2!1sen!2sjo!4v1`

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <iframe
        src={mapUrl}
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: '400px' }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0"
      />
    </div>
  )
}