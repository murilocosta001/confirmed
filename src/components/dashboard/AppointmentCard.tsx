import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Appointment } from "@/hooks/useAppointments";
import StatusBadge from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, CheckCircle, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppointmentCardProps {
  appointment: Appointment;
  onUpdateStatus: (id: string, status: "confirmed" | "cancelled_auto") => void;
  onDelete: (id: string) => void;
}

const AppointmentCard = ({ appointment, onUpdateStatus, onDelete }: AppointmentCardProps) => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  const formatWhatsapp = (number: string) => {
    if (number.length === 11) {
      return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
    }
    return number;
  };

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-card animate-fade-up">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold">
          {formatTime(appointment.appointment_time)}
        </div>
        <div>
          <p className="font-medium text-foreground">{appointment.patient_name}</p>
          <p className="text-sm text-muted-foreground">
            {formatWhatsapp(appointment.patient_whatsapp)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge status={appointment.status} />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {appointment.status === "pending" && (
              <>
                <DropdownMenuItem
                  onClick={() => onUpdateStatus(appointment.id, "confirmed")}
                  className="text-success"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Marcar como confirmada
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUpdateStatus(appointment.id, "cancelled_auto")}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar consulta
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(appointment.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default AppointmentCard;
