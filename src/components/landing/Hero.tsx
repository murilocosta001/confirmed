import { ArrowRight, Bell, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative overflow-hidden gradient-hero py-20 lg:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23002e76' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Bell className="h-4 w-4" />
              Reduza até 70% das faltas em sua clínica
            </div>
          </div>

          <h1 className="animate-fade-up text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl" style={{ animationDelay: "0.1s" }}>
            Confirmação de consultas{" "}
            <span className="gradient-primary bg-clip-text text-transparent">
              automatizada
            </span>{" "}
            via WhatsApp
          </h1>

          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl" style={{ animationDelay: "0.2s" }}>
            Envie lembretes automáticos 24h e 2h antes das consultas. 
            Pacientes confirmam com um clique. Sem confirmação? Cancelamento automático.
          </p>

          <div className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row" style={{ animationDelay: "0.3s" }}>
            <Button asChild size="lg" className="gradient-primary h-12 px-8 text-base font-semibold shadow-lg hover:opacity-90 transition-opacity">
              <Link to="/cadastro">
                Começar agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold">
              <Link to="/login">
                Já tenho conta
              </Link>
            </Button>
          </div>

          <div className="animate-fade-up mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>Setup em 5 minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>Sem taxas de adesão</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>R$ 47/mês</span>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="animate-fade-up mx-auto mt-20 grid max-w-5xl gap-6 md:grid-cols-3" style={{ animationDelay: "0.5s" }}>
          <div className="group rounded-2xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover">
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">Agenda Simples</h3>
            <p className="text-sm text-muted-foreground">
              Cadastre consultas manualmente. Sem complicação, sem integrações complexas.
            </p>
          </div>

          <div className="group rounded-2xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover">
            <div className="mb-4 inline-flex rounded-xl bg-success/10 p-3">
              <Bell className="h-6 w-6 text-success" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">Lembretes Automáticos</h3>
            <p className="text-sm text-muted-foreground">
              WhatsApp 24h antes com botões de confirmar/remarcar. Lembrete 2h antes para confirmados.
            </p>
          </div>

          <div className="group rounded-2xl border bg-card p-6 shadow-card transition-all hover:shadow-card-hover">
            <div className="mb-4 inline-flex rounded-xl bg-warning/10 p-3">
              <CheckCircle className="h-6 w-6 text-warning" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">Cancelamento Inteligente</h3>
            <p className="text-sm text-muted-foreground">
              Não confirmou até o prazo? Cancelado automaticamente. Libere horários para outros pacientes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
