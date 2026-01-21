import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AppointmentCard from "@/components/dashboard/AppointmentCard";
import NewAppointmentDialog from "@/components/dashboard/NewAppointmentDialog";
import { useAppointments, useUpdateAppointmentStatus, useDeleteAppointment } from "@/hooks/useAppointments";
import { cn } from "@/lib/utils";

const Appointments = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const formattedDate = format(selectedDate, "yyyy-MM-dd");
  const { data: appointments, isLoading } = useAppointments(formattedDate);
  const updateStatus = useUpdateAppointmentStatus();
  const deleteAppointment = useDeleteAppointment();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const handleUpdateStatus = (id: string, status: "confirmed" | "cancelled_auto") => {
    updateStatus.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    deleteAppointment.mutate(id);
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Consultas</h1>
            <p className="text-muted-foreground">
              Gerencie todas as consultas da sua clínica
            </p>
          </div>
          <NewAppointmentDialog selectedDate={selectedDate} />
        </div>

        {/* Week Selector */}
        <div className="mb-6 rounded-xl border bg-card p-4 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-foreground">
              {format(weekStart, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center rounded-lg p-3 transition-all",
                    isSelected
                      ? "gradient-primary text-primary-foreground shadow-md"
                      : isToday
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium uppercase",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                  <span className={cn(
                    "mt-1 text-lg font-bold",
                    isSelected ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Label */}
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h2>

        {/* Appointments List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !appointments || appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-medium text-foreground">
              Nenhuma consulta neste dia
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Clique em "Nova Consulta" para agendar um paciente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Appointments;
