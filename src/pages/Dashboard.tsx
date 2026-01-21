import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import AppointmentCard from "@/components/dashboard/AppointmentCard";
import NewAppointmentDialog from "@/components/dashboard/NewAppointmentDialog";
import { useAppointments, useUpdateAppointmentStatus, useDeleteAppointment } from "@/hooks/useAppointments";
import { useClinic } from "@/hooks/useClinic";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: appointments, isLoading } = useAppointments(today);
  const { data: allAppointments } = useAppointments();
  const { data: clinic } = useClinic();
  const updateStatus = useUpdateAppointmentStatus();
  const deleteAppointment = useDeleteAppointment();

  const todayAppointments = appointments || [];
  const pending = todayAppointments.filter((a) => a.status === "pending");
  const confirmed = todayAppointments.filter((a) => a.status === "confirmed");
  const cancelled = todayAppointments.filter((a) => a.status === "cancelled_auto");

  // Calculate monthly stats
  const currentMonth = format(new Date(), "yyyy-MM");
  const monthlyAppointments = (allAppointments || []).filter(
    (a) => a.appointment_date.startsWith(currentMonth)
  );
  const monthlyCancelled = monthlyAppointments.filter(
    (a) => a.status === "cancelled_auto"
  );

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
            <h1 className="text-2xl font-bold text-foreground">
              Bom dia, {clinic?.name || "Clínica"}! 👋
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <NewAppointmentDialog selectedDate={new Date()} />
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Consultas Hoje"
            value={todayAppointments.length}
            icon={Calendar}
            variant="primary"
          />
          <StatCard
            title="Aguardando"
            value={pending.length}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Confirmadas"
            value={confirmed.length}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Canceladas"
            value={cancelled.length}
            icon={XCircle}
            variant="destructive"
          />
        </div>

        {/* Highlight Card */}
        <div className="mb-8 rounded-2xl gradient-primary p-6 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 p-3">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold">
                Neste mês, você evitou {monthlyCancelled.length} faltas!
              </p>
              <p className="text-sm opacity-90">
                Pacientes foram notificados e horários foram liberados automaticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Consultas de Hoje
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-medium text-foreground">
                Nenhuma consulta hoje
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Clique em "Nova Consulta" para agendar um paciente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
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
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
