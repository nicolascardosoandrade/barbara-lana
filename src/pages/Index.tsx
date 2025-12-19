import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  Handshake,
  Filter,
  Users,
  Calendar,
  CalendarCheck,
  Cake,
  FileText,
  DollarSign,
} from "lucide-react";

const modules = [
  {
    icon: Handshake,
    title: "Convênios",
    description: "Gerenciar convênios médicos",
    path: "/convenios",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Filter,
    title: "Filtrar Idades",
    description: "Filtrar pacientes por idade",
    path: "/filtrar-idades",
    color: "from-purple-400 to-purple-500",
  },
  {
    icon: Users,
    title: "Pacientes",
    description: "Cadastro e consulta de pacientes",
    path: "/pacientes",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Calendar,
    title: "Agenda",
    description: "Visualizar agenda de atendimentos",
    path: "/agenda",
    color: "from-purple-400 to-purple-500",
  },
  {
    icon: CalendarCheck,
    title: "Agendamentos",
    description: "Gerenciar agendamentos",
    path: "/agendamentos",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Cake,
    title: "Aniversariantes",
    description: "Ver aniversariantes da semana",
    path: "/aniversariantes",
    color: "from-purple-400 to-purple-500",
  },
  {
    icon: FileText,
    title: "Anotações",
    description: "Gerenciar anotações e tarefas",
    path: "/anotacoes",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: DollarSign,
    title: "Financeiro",
    description: "Relatórios e gráficos financeiros",
    path: "/financeiro",
    color: "from-purple-400 to-purple-500",
  },
];

const Index = () => {
  return (
    <Layout title="Sistema AeR - Barbara Lana">
      <div className="max-w-6xl mx-auto px-2 sm:px-0">
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 md:mb-3">
            Bem-vindo ao Sistema AeR
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg">
            Selecione uma opção para começar
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.path}
                to={module.path}
                className="module-card group"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="module-icon">
                  <Icon size={20} className="md:w-7 md:h-7" />
                </div>
                <h3 className="font-semibold text-sm md:text-lg text-foreground mb-0.5 md:mb-1">
                  {module.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                  {module.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Index;
