'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// أيقونة افتراضية مخصصة (Leaflet بحاجة هذا التعديل مع Next.js)
const driverIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

export function LiveMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    // غلاف أنيق حول الخريطة — الإطار الرفيع والزوايا الناعمة فقط
    <div className="h-full w-full overflow-hidden rounded-3xl border border-flore-border/70 shadow-luxury-soft">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={driverIcon}>
          <Popup>
            <span className="font-medium">موقع السائق الحالي</span>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
