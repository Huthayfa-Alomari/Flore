'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MapPin, Thermometer, Droplets, Clock, Truck, Package, CheckCircle, ChevronLeft, Loader2 } from 'lucide-react'
import { useRealtimeOrder } from '@/hooks/useRealtimeOrder'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { orderStatuses } from '@/lib/utils'

export default function TrackingPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const { order, loading } = useRealtimeOrder(orderId)
  const [mapUrl, setMapUrl] = useState('')

  useEffect(() => {
    if (order?.driver_lat && order?.driver_lng) {
      const url = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1000!2d${order.driver_lng}!3d${order.driver_lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDU3JzIwLjAiTiAzNcKwNTcnMjAuMCJF!5e0!3m2!1sen!2sjo!4v1`
      setMapUrl(url)
    }
  }, [order?.driver_lat, order?.driver_lng])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-flore-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Package className="h-16 w-16 text-flore-text-secondary mx-auto mb-4" />
        <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-4">
          الطلب غير موجود
        </h1>
        <Link href="/profile">
          <Button>العودة للحساب</Button>
        </Link>
      </div>
    )
  }

  const currentStatusIndex = orderStatuses.findIndex(s => s.value === order.status)
  const statusInfo = orderStatuses.find(s => s.value === order.status)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/profile" className="inline-flex items-center gap-2 text-flore-text-secondary hover:text-flore-primary mb-8 transition-colors">
        <ChevronLeft className="h-4 w-4" />
        <span className="font-noto text-sm">العودة للحساب</span>
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-amiri text-3xl font-bold text-flore-text-primary">
              تتبع الطلب
            </h1>
            <p className="text-flore-text-secondary mt-1">
              طلب #{order.id.slice(0, 8)}
            </p>
          </div>
          <Badge className={statusInfo?.color || ''}>
            {statusInfo?.label || order.status}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Status Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-amiri text-xl">حالة الطلب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {orderStatuses.slice(0, -1).map((status, i) => {
                  const isCompleted = i <= currentStatusIndex
                  const isCurrent = i === currentStatusIndex

                  return (
                    <motion.div
                      key={status.value}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-4 pb-8 last:pb-0"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            isCompleted
                              ? 'bg-flore-primary text-white'
                              : 'bg-flore-subtle text-flore-text-secondary'
                          } ${isCurrent ? 'ring-4 ring-flore-primary/20' : ''}`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        {i < orderStatuses.length - 2 && (
                          <div
                            className={`w-0.5 flex-1 mt-2 ${
                              isCompleted && i < currentStatusIndex
                                ? 'bg-flore-primary'
                                : 'bg-flore-border'
                            }`}
                          />
                        )}
                      </div>
                      <div className="pt-1">
                        <p
                          className={`font-medium ${
                            isCurrent ? 'text-flore-primary' : 'text-flore-text-primary'
                          }`}
                        >
                          {status.label}
                        </p>
                        {isCurrent && order.estimated_arrival && (
                          <p className="text-sm text-flore-text-secondary mt-1">
                            الوصول المتوقع: {new Date(order.estimated_arrival).toLocaleTimeString('ar-JO')}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="font-amiri text-xl">تفاصيل الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-flore-text-secondary">العنوان</span>
                <span className="font-medium">{order.delivery_address}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-flore-text-secondary">المنطقة</span>
                <span className="font-medium">{order.delivery_region}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-flore-text-secondary">الهاتف</span>
                <span className="font-medium" dir="ltr">{order.customer_phone}</span>
              </div>
              {order.gift_message && (
                <div className="bg-flore-subtle rounded-xl p-4">
                  <p className="text-sm text-flore-text-secondary mb-1">رسالة الهدية:</p>
                  <p className="font-medium italic">{order.gift_message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sensor Data */}
          {(order.temperature || order.humidity) && (
            <Card>
              <CardHeader>
                <CardTitle className="font-amiri text-xl">جودة التوصيل</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {order.temperature && (
                  <div className="bg-flore-subtle rounded-xl p-4 text-center">
                    <Thermometer className="h-6 w-6 mx-auto mb-2 text-flore-primary" />
                    <p className="text-2xl font-bold">{order.temperature}°C</p>
                    <p className="text-xs text-flore-text-secondary">درجة الحرارة</p>
                  </div>
                )}
                {order.humidity && (
                  <div className="bg-flore-subtle rounded-xl p-4 text-center">
                    <Droplets className="h-6 w-6 mx-auto mb-2 text-flore-primary" />
                    <p className="text-2xl font-bold">{order.humidity}%</p>
                    <p className="text-xs text-flore-text-secondary">الرطوبة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="font-amiri text-xl flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                موقع السائق
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {mapUrl ? (
                <div className="aspect-square bg-flore-subtle">
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-flore-subtle flex items-center justify-center">
                  <div className="text-center p-8">
                    <Truck className="h-12 w-12 text-flore-text-secondary mx-auto mb-4" />
                    <p className="text-flore-text-secondary">
                      السائق لم يبدأ التوصيل بعد
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="font-amiri text-xl">المنتجات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-flore-subtle overflow-hidden relative">
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-flore-text-secondary">{item.qty}x</p>
                  </div>
                  <span className="font-bold">{item.price * item.qty} د.أ</span>
                </div>
              ))}
              <div className="border-t border-flore-border pt-3 flex justify-between font-bold">
                <span>الإجمالي</span>
                <span className="text-flore-primary">{order.total} د.أ</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}