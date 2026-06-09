import { Navbar } from "@/components/layout/navbar"
import { WorkoutPlanBlocked } from "@/components/premium/workout-plan-blocked"

export default function UpgradeTreinosPage() {
  return (
    <div>
      <Navbar title="Treinos e Exercícios" subtitle="Disponível em planos com módulo fitness" />
      <WorkoutPlanBlocked />
    </div>
  )
}
