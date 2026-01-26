import { Navigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2, AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

/**
 * FAIL-CLOSED Subscription Guard
 * 
 * Bloqueia acesso a funcionalidades premium quando:
 * - A verificação de assinatura está em andamento (loading)
 * - A verificação falhou ou retornou erro
 * - A assinatura não está ativa ou em trial
 * 
 * Só permite acesso quando a assinatura for EXPLICITAMENTE válida.
 */
const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { 
    isLoading, 
    hasValidSubscription, 
    isError, 
    isPastDue,
    data: subscription,
    refreshSubscription 
  } = useSubscription();
  const location = useLocation();

  // Estado de carregamento - bloquear até confirmar
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando assinatura...</p>
        </div>
      </div>
    );
  }

  // Erro na verificação - FAIL-CLOSED: negar acesso
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Erro na Verificação</CardTitle>
            <CardDescription>
              Não foi possível verificar o status da sua assinatura. 
              Por segurança, o acesso está temporariamente bloqueado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => refreshSubscription()} 
              className="w-full"
            >
              Tentar Novamente
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = "/"}
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pagamento pendente - permitir acesso limitado com aviso
  if (isPastDue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-warning" />
            </div>
            <CardTitle>Pagamento Pendente</CardTitle>
            <CardDescription>
              Sua assinatura está com pagamento pendente. 
              Regularize para continuar usando o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => window.location.href = "/configuracoes"}
              className="w-full"
            >
              Gerenciar Assinatura
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Assinatura não válida - negar acesso
  if (!hasValidSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Assinatura Necessária</CardTitle>
            <CardDescription>
              {subscription?.status === "cancelled" 
                ? "Sua assinatura foi cancelada. Assine novamente para continuar."
                : "Você precisa de uma assinatura ativa para acessar esta funcionalidade."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => window.location.href = "/configuracoes"}
              className="w-full"
            >
              Ver Planos
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = "/"}
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Assinatura EXPLICITAMENTE válida - permitir acesso
  return <>{children}</>;
};

export default SubscriptionGuard;
