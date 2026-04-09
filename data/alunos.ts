export type Aluno = {
  id: number
  nome: string
  email: string
  telefone: string
  objetivo: string
  plano: string
  status: "ativo" | "inativo" | "pendente"
  peso: number
  altura: number
}

export const alunos: Aluno[] = [
  {
    id: 1,
    nome: "Carlos Silva",
    email: "carlos@email.com",
    telefone: "(11) 99234-5678",
    objetivo: "Hipertrofia",
    plano: "Premium",
    status: "ativo",
    peso: 82,
    altura: 178,
  },
  {
    id: 2,
    nome: "Ana Lima",
    email: "ana@email.com",
    telefone: "(11) 98765-4321",
    objetivo: "Emagrecimento",
    plano: "Básico",
    status: "ativo",
    peso: 65,
    altura: 165,
  },
  {
    id: 3,
    nome: "Pedro Rocha",
    email: "pedro@email.com",
    telefone: "(11) 91234-5678",
    objetivo: "Condicionamento",
    plano: "Premium",
    status: "ativo",
    peso: 75,
    altura: 180,
  },
  {
    id: 4,
    nome: "Maria Costa",
    email: "maria@email.com",
    telefone: "(11) 97654-3210",
    objetivo: "Flexibilidade",
    plano: "Básico",
    status: "inativo",
    peso: 58,
    altura: 162,
  },
  {
    id: 5,
    nome: "João Oliveira",
    email: "joao@email.com",
    telefone: "(11) 96543-2109",
    objetivo: "Força",
    plano: "VIP",
    status: "ativo",
    peso: 90,
    altura: 185,
  },
  {
    id: 6,
    nome: "Larissa Melo",
    email: "larissa@email.com",
    telefone: "(11) 95432-1098",
    objetivo: "Emagrecimento",
    plano: "Premium",
    status: "ativo",
    peso: 70,
    altura: 170,
  },
  {
    id: 7,
    nome: "Fernanda Dias",
    email: "fernanda@email.com",
    telefone: "(11) 94321-0987",
    objetivo: "Hipertrofia",
    plano: "VIP",
    status: "ativo",
    peso: 60,
    altura: 163,
  },
  {
    id: 8,
    nome: "Rafael Torres",
    email: "rafael@email.com",
    telefone: "(11) 93210-9876",
    objetivo: "Condicionamento",
    plano: "Básico",
    status: "pendente",
    peso: 78,
    altura: 177,
  },
  {
    id: 9,
    nome: "Camila Nunes",
    email: "camila@email.com",
    telefone: "(11) 92109-8765",
    objetivo: "Emagrecimento",
    plano: "Premium",
    status: "ativo",
    peso: 68,
    altura: 168,
  },
  {
    id: 10,
    nome: "Bruno Santos",
    email: "bruno@email.com",
    telefone: "(11) 91098-7654",
    objetivo: "Força",
    plano: "VIP",
    status: "ativo",
    peso: 95,
    altura: 190,
  },
]

