import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/ui/Logo";
import { Loader2 } from "lucide-react";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatWhatsapp = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    
    // Format as (XX) XXXXX-XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) {
        toast({
          variant: "destructive",
          title: "Erro ao criar conta",
          description: authError.message,
        });
        return;
      }

      if (!authData.user) {
        toast({
          variant: "destructive",
          title: "Erro ao criar conta",
          description: "Não foi possível criar o usuário",
        });
        return;
      }

      // 2. Create the clinic
      const { error: clinicError } = await supabase.from("clinics").insert({
        user_id: authData.user.id,
        name: clinicName,
        whatsapp: whatsapp.replace(/\D/g, ""),
      });

      if (clinicError) {
        toast({
          variant: "destructive",
          title: "Erro ao criar clínica",
          description: clinicError.message,
        });
        return;
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao Confirmed.",
      });

      navigate("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao criar conta. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center p-4">
      <Link to="/" className="mb-8">
        <Logo size="lg" />
      </Link>

      <Card className="w-full max-w-md shadow-xl animate-scale-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Crie sua conta</CardTitle>
          <CardDescription>
            Teste grátis por 7 dias, depois R$ 47/mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Nome da Clínica</Label>
              <Input
                id="clinicName"
                type="text"
                placeholder="Clínica Exemplo"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp da Clínica</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
                required
                disabled={loading}
                maxLength={16}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gradient-primary h-11 font-semibold shadow-md hover:opacity-90 transition-opacity" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar conta grátis"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
