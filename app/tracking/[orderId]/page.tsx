import { OrderTrackingExperience } from '@/components/tracking/OrderTrackingExperience'

export const metadata = {
  title: 'تتبع الطلب | FLORÉ',
  description: 'تابع رحلة هديتك من الأتيليه حتى التسليم.',
}

export default function TrackingPage({ params }: { params: { orderId: string } }) {
  return <OrderTrackingExperience orderId={params.orderId} />
}
