import { Navbar } from "@/components/layout/navbar"
import { PremiumUpsell } from "@/components/premium/premium-upsell"

export default function PremiumPage() {
  return (
    <>
      <Navbar title="FitPro Premium" subtitle="Nutrição inteligente com IA" />
      <PremiumUpsell />
    </>
  )
}
