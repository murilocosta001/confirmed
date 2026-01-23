import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/hooks/useClinic";
import Logo from "@/components/ui/Logo";
import { Loader2 } from "lucide-react";

const clinicTypes = [
  { value: "odontologica", label: "Odontológica" },
  { value: "medica", label: "Médica" },
  { value: "estetica", label: "Estética" },
  { value: "fisioterapia", label: "Fisioterapia" },
  { value: "psicologia", label: "Psicologia" },
  { value: "outra", label: "Outra" },
];

const professionalsCounts = [
  { value: "1", label: "1" },
  { value: "2-5", label: "2 a 5" },
  { value: "6-10", label: "6 a 10" },
  { value: "10+", label: "Mais de 10" },
];

const monthlyAppointmentsRanges = [
  { value: "ate-100", label: "Até 100" },
  { value: "101-300", label: "101 a 300" },
  { value: "301-600", label: "301 a 600" },
  { value: "600+", label: "Mais de 600" },
];

const Onboarding = () => {
  const [clinicType, setClinicType] = useState("");
  const [clinicTypeOther, setClinicTypeOther] = useState("");
  const [professionalsCount, setProfessionalsCount] = useState("");
  const [monthlyAppointments, setMonthlyAppointments] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: clinic, isLoading: clinicLoading } = useClinic();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clinicType || !professionalsCount || !monthlyAppointments) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todas as perguntas.",
      });
      return;
    }

    if (clinicType === "outra" && !clinicTypeOther.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, especifique o tipo da sua clínica.",
      });
      return;
    }

    if (!clinic) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Clínica não encontrada.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("clinics")
        .update({
          clinic_type: clinicType,
          clinic_type_other: clinicType === "outra" ? clinicTypeOther.trim() : null,
          professionals_count: professionalsCount,
          monthly_appointments: monthlyAppointments,
        })
        .eq("id", clinic.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar",
          description: error.message,
        });
        return;
      }

      toast({
        title: "Pesquisa concluída!",
        description: "Obrigado por compartilhar essas informações.",
      });

      navigate("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao salvar. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  if (clinicLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <Logo size="lg" />
      </div>

      <Card className="w-full max-w-lg shadow-xl animate-scale-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Conte-nos sobre sua clínica</CardTitle>
          <CardDescription>
            Essas informações nos ajudam a melhorar o Confirmed para você
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Clinic Type */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Qual é o tipo da sua clínica?
              </Label>
              <RadioGroup
                value={clinicType}
                onValueChange={setClinicType}
                className="space-y-2"
              >
                {clinicTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={type.value} id={`type-${type.value}`} />
                    <Label
                      htmlFor={`type-${type.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {type.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {clinicType === "outra" && (
                <Input
                  placeholder="Especifique o tipo da clínica"
                  value={clinicTypeOther}
                  onChange={(e) => setClinicTypeOther(e.target.value)}
                  className="mt-2"
                  disabled={loading}
                />
              )}
            </div>

            {/* Professionals Count */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Quantos profissionais atendem na clínica atualmente?
              </Label>
              <RadioGroup
                value={professionalsCount}
                onValueChange={setProfessionalsCount}
                className="space-y-2"
              >
                {professionalsCounts.map((count) => (
                  <div key={count.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={count.value} id={`prof-${count.value}`} />
                    <Label
                      htmlFor={`prof-${count.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {count.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Monthly Appointments */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Quantos atendimentos, em média, sua clínica realiza por mês?
              </Label>
              <RadioGroup
                value={monthlyAppointments}
                onValueChange={setMonthlyAppointments}
                className="space-y-2"
              >
                {monthlyAppointmentsRanges.map((range) => (
                  <div key={range.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={range.value} id={`appt-${range.value}`} />
                    <Label
                      htmlFor={`appt-${range.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {range.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                className="w-full gradient-primary h-11 font-semibold shadow-md hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                disabled={loading}
                className="text-muted-foreground"
              >
                Pular por enquanto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
