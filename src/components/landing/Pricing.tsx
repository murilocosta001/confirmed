import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Pricing = () => {
  const features = [
    "Confirmações automáticas via WhatsApp",
    "Lembretes 24h e 2h antes",
    "Cancelamento automático sem resposta",
    "Dashboard com métricas",
    "Cadastro ilimitado de consultas",
    "Suporte por WhatsApp",
  ];

  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Um preço simples, sem surpresas
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tudo o que você precisa para reduzir faltas e aumentar a eficiência da sua clínica
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-lg">
          <div className="relative rounded-3xl border-2 border-primary bg-card p-8 shadow-xl">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="gradient-primary rounded-full px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-lg">
                Mais Popular
              </span>
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-foreground">Plano Profissional</h3>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">R$ 47</span>
                <span className="text-lg text-muted-foreground">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Cobrança mensal recorrente. Cancele quando quiser.
              </p>
            </div>

            <ul className="mt-8 space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="mt-8 w-full gradient-primary h-12 text-base font-semibold shadow-lg hover:opacity-90 transition-opacity">
              <Link to="/cadastro">
                Começar gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              7 dias grátis para testar. Sem cartão de crédito.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
