import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface NewAppointmentDialogProps {
  selectedDate?: Date;
}

const NewAppointmentDialog = ({ selectedDate }: NewAppointmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientWhatsapp, setPatientWhatsapp] = useState("");
  const [date, setDate] = useState(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
  const [time, setTime] = useState("");
  
  const createAppointment = useCreateAppointment();

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createAppointment.mutateAsync({
      patient_name: patientName,
      patient_whatsapp: patientWhatsapp,
      appointment_date: date,
      appointment_time: time,
    });

    // Reset form
    setPatientName("");
    setPatientWhatsapp("");
    setDate(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
    setTime("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary font-medium shadow-md hover:opacity-90 transition-opacity">
          <Plus className="mr-2 h-4 w-4" />
          Nova Consulta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Nova Consulta</DialogTitle>
          <DialogDescription>
            Preencha os dados do paciente para agendar a consulta
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientName">Nome do Paciente</Label>
            <Input
              id="patientName"
              placeholder="João Silva"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patientWhatsapp">WhatsApp do Paciente</Label>
            <Input
              id="patientWhatsapp"
              type="tel"
              placeholder="(11) 99999-9999"
              value={patientWhatsapp}
              onChange={(e) => setPatientWhatsapp(formatWhatsapp(e.target.value))}
              required
              maxLength={16}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full gradient-primary font-medium shadow-md hover:opacity-90 transition-opacity"
            disabled={createAppointment.isPending}
          >
            {createAppointment.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Agendando...
              </>
            ) : (
              "Agendar Consulta"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewAppointmentDialog;
