import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useClinic } from "@/hooks/useClinic";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, CreditCard, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Settings = () => {
  const { data: clinic, isLoading } = useClinic();
  const { data: subscription, isActive, isPastDue, isCancelled, isTrialing, trialDaysRemaining, refreshSubscription } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    if (clinic) {
      setName(clinic.name);
      setWhatsapp(formatWhatsapp(clinic.whatsapp));
      setOpeningTime(clinic.opening_time.slice(0, 5));
      setClosingTime(clinic.closing_time.slice(0, 5));
      setDeadlineHours(clinic.confirmation_deadline_hours.toString());
    }
  }, [clinic]);

  // Check for checkout success/cancel in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast({
        title: "Assinatura ativada!",
        description: "Bem-vindo ao Confirmed Profissional.",
      });
      refreshSubscription();
      window.history.replaceState({}, "", "/configuracoes");
    } else if (params.get("checkout") === "cancelled") {
      toast({
        variant: "destructive",
        title: "Checkout cancelado",
        description: "Você pode tentar novamente quando quiser.",
      });
      window.history.replaceState({}, "", "/configuracoes");
    }
  }, []);

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("clinics")
        .update({
          name,
          whatsapp: whatsapp.replace(/\D/g, ""),
          opening_time: openingTime,
          closing_time: closingTime,
          confirmation_deadline_hours: parseInt(deadlineHours),
        })
        .eq("id", clinic.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["clinic"] });

      toast({
        title: "Configurações salvas!",
        description: "Suas alterações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async () => {
    setLoadingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao iniciar checkout",
        description: "Não foi possível iniciar o processo de pagamento.",
      });
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao abrir portal",
        description: "Não foi possível abrir o portal de gerenciamento.",
      });
    } finally {
      setLoadingPortal(false);
    }
  };

  const getSubscriptionStatusDisplay = () => {
    if (!subscription) return null;

    if (subscription.status === "active") {
      return (
        <div className="rounded-lg bg-success/10 border border-success/20 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <div>
              <p className="font-medium text-foreground">Assinatura Ativa</p>
              {subscription.subscription_end && (
                <p className="text-sm text-muted-foreground">
                  Próxima renovação: {format(new Date(subscription.subscription_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (subscription.status === "trialing") {
      const daysText = trialDaysRemaining === 1 ? "1 dia restante" : `${trialDaysRemaining} dias restantes`;
      return (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-warning animate-pulse" />
            <div>
              <p className="font-medium text-foreground">Período de Teste Gratuito</p>
              <p className="text-sm text-muted-foreground">
                {daysText} do seu teste gratuito. Assine agora para continuar usando após o período de teste.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (subscription.status === "past_due") {
      return (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="font-medium text-foreground">Pagamento Pendente</p>
              <p className="text-sm text-muted-foreground">
                Há um problema com seu pagamento. Atualize seus dados para continuar.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Cancelled
    return (
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-foreground">Assinatura Cancelada</p>
            <p className="text-sm text-muted-foreground">
              Sua assinatura foi cancelada. Os envios de WhatsApp estão bloqueados.
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as informações da sua clínica
          </p>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Clinic Info */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Informações da Clínica</CardTitle>
              <CardDescription>
                Dados básicos da sua clínica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Clínica</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp da Clínica</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
                    required
                    maxLength={16}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openingTime">Horário de Abertura</Label>
                    <Input
                      id="openingTime"
                      type="time"
                      value={openingTime}
                      onChange={(e) => setOpeningTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closingTime">Horário de Fechamento</Label>
                    <Input
                      id="closingTime"
                      type="time"
                      value={closingTime}
                      onChange={(e) => setClosingTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadlineHours">
                    Prazo para Confirmação (horas antes)
                  </Label>
                  <Input
                    id="deadlineHours"
                    type="number"
                    min="1"
                    max="48"
                    value={deadlineHours}
                    onChange={(e) => setDeadlineHours(e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Consultas não confirmadas serão canceladas automaticamente X horas antes do horário.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="gradient-primary font-medium shadow-md hover:opacity-90 transition-opacity"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Subscription Info */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Assinatura
              </CardTitle>
              <CardDescription>
                Gerencie seu plano e pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSubscriptionStatusDisplay()}
              
              {(!subscription || subscription.status === "trialing" || subscription.status === "cancelled") && (
                <Button 
                  onClick={handleCheckout}
                  disabled={loadingCheckout}
                  className="w-full gradient-primary font-medium shadow-md hover:opacity-90 transition-opacity"
                >
                  {loadingCheckout ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Assinar Plano Profissional - R$ 47/mês
                    </>
                  )}
                </Button>
              )}

              {subscription?.stripe_customer_id && (
                <Button 
                  onClick={handleManageSubscription}
                  disabled={loadingPortal}
                  variant="outline"
                  className="w-full"
                >
                  {loadingPortal ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Abrindo portal...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Gerenciar Assinatura
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
