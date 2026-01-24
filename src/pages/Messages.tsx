import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useMessageTemplates, TemplateType } from "@/hooks/useMessageTemplates";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, MessageSquare, Clock, RotateCcw, Info } from "lucide-react";

const VARIABLE_INFO = [
  { variable: "{nome_paciente}", description: "Nome do paciente" },
  { variable: "{nome_clinica}", description: "Nome da clínica" },
  { variable: "{data_consulta}", description: "Data da consulta (ex: 25/01/2026)" },
  { variable: "{hora_consulta}", description: "Horário da consulta (ex: 14:30)" },
];

const Messages = () => {
  const { toast } = useToast();
  const { 
    getTemplate, 
    defaultTemplates, 
    upsertTemplate, 
    isUpsertPending,
    isLoading 
  } = useMessageTemplates();

  const [reminder24h, setReminder24h] = useState("");
  const [reminder2h, setReminder2h] = useState("");
  const [activeTab, setActiveTab] = useState<TemplateType>("reminder_24h");

  useEffect(() => {
    setReminder24h(getTemplate("reminder_24h"));
    setReminder2h(getTemplate("reminder_2h"));
  }, [getTemplate]);

  const handleSave = async (type: TemplateType) => {
    const content = type === "reminder_24h" ? reminder24h : reminder2h;
    
    try {
      await upsertTemplate({ templateType: type, messageContent: content });
      toast({
        title: "Mensagem salva!",
        description: "O template foi atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar o template.",
      });
    }
  };

  const handleReset = (type: TemplateType) => {
    if (type === "reminder_24h") {
      setReminder24h(defaultTemplates.reminder_24h);
    } else {
      setReminder2h(defaultTemplates.reminder_2h);
    }
    toast({
      title: "Template restaurado",
      description: "A mensagem padrão foi restaurada. Clique em salvar para confirmar.",
    });
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
          <h1 className="text-2xl font-bold text-foreground">Mensagens</h1>
          <p className="text-muted-foreground">
            Personalize as mensagens enviadas automaticamente aos pacientes
          </p>
        </div>

        <div className="max-w-3xl space-y-6">
          {/* Variables Info Card */}
          <Card className="shadow-card border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Variáveis Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {VARIABLE_INFO.map((v) => (
                  <div key={v.variable} className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {v.variable}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{v.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Message Templates */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Templates de Mensagem
              </CardTitle>
              <CardDescription>
                Edite os textos que serão enviados via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="reminder_24h" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Lembrete 24h
                  </TabsTrigger>
                  <TabsTrigger value="reminder_2h" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Lembrete 2h
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reminder_24h" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminder24h">
                      Mensagem enviada 24 horas antes da consulta
                    </Label>
                    <Textarea
                      id="reminder24h"
                      value={reminder24h}
                      onChange={(e) => setReminder24h(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                      placeholder="Digite a mensagem..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Esta mensagem solicita a confirmação do paciente.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleSave("reminder_24h")}
                      disabled={isUpsertPending}
                      className="gradient-primary font-medium shadow-md hover:opacity-90 transition-opacity"
                    >
                      {isUpsertPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReset("reminder_24h")}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restaurar Padrão
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="reminder_2h" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminder2h">
                      Mensagem enviada 2 horas antes da consulta
                    </Label>
                    <Textarea
                      id="reminder2h"
                      value={reminder2h}
                      onChange={(e) => setReminder2h(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                      placeholder="Digite a mensagem..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Esta mensagem é enviada apenas para consultas já confirmadas.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleSave("reminder_2h")}
                      disabled={isUpsertPending}
                      className="gradient-primary font-medium shadow-md hover:opacity-90 transition-opacity"
                    >
                      {isUpsertPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReset("reminder_2h")}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restaurar Padrão
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
