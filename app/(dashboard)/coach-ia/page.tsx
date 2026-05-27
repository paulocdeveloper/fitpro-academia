"use client"

import { Navbar } from "@/components/layout/navbar"
import { FitnessCoachChat } from "@/components/fitness-ai/fitness-coach-chat"

export default function CoachIaPage() {
  return (
    <div>
      <Navbar
        title="Coach IA"
        subtitle="Seu personal trainer virtual — treino, nutrição e evolução"
      />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <FitnessCoachChat />
      </div>
    </div>
  )
}
