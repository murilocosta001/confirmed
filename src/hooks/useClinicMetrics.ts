import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "./useClinic";
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ClinicMetrics {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  pendingAppointments: number;
  attendanceRate: number;
  cancellationRate: number;
  totalPatients: number;
  newPatientsThisMonth: number;
  appointmentsByDay: { day: string; count: number }[];
  appointmentsByStatus: { status: string; count: number; color: string }[];
  monthlyTrend: { month: string; confirmed: number; cancelled: number }[];
}

export const useClinicMetrics = () => {
  const { data: clinic } = useClinic();

  return useQuery({
    queryKey: ["clinic-metrics", clinic?.id],
    queryFn: async (): Promise<ClinicMetrics> => {
      if (!clinic?.id) throw new Error("Clinic not found");

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Fetch all appointments for the clinic
      const { data: allAppointments, error: apptError } = await supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinic.id);

      if (apptError) throw apptError;

      // Fetch patients
      const { data: patients, error: patientError } = await supabase
        .from("patients")
        .select("id, created_at")
        .eq("clinic_id", clinic.id);

      if (patientError) throw patientError;

      // Current month appointments
      const monthAppointments = allAppointments?.filter((a) => {
        const date = parseISO(a.appointment_date);
        return date >= monthStart && date <= monthEnd;
      }) || [];

      // Calculate metrics
      const totalAppointments = monthAppointments.length;
      const confirmedAppointments = monthAppointments.filter((a) => a.status === "confirmed").length;
      const cancelledAppointments = monthAppointments.filter((a) => a.status === "cancelled_auto").length;
      const pendingAppointments = monthAppointments.filter((a) => a.status === "pending").length;
      const rescheduleRequested = monthAppointments.filter((a) => a.status === "reschedule_requested").length;

      const attendanceRate = totalAppointments > 0 
        ? Math.round((confirmedAppointments / totalAppointments) * 100) 
        : 0;
      const cancellationRate = totalAppointments > 0 
        ? Math.round((cancelledAppointments / totalAppointments) * 100) 
        : 0;

      // Patients metrics
      const totalPatients = patients?.length || 0;
      const newPatientsThisMonth = patients?.filter((p) => {
        const created = parseISO(p.created_at);
        return created >= monthStart && created <= monthEnd;
      }).length || 0;

      // Appointments by day of week (current week)
      const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const appointmentsByDay = daysOfWeek.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const count = allAppointments?.filter((a) => a.appointment_date === dayStr).length || 0;
        return {
          day: format(day, "EEE", { locale: ptBR }),
          count,
        };
      });

      // Appointments by status
      const appointmentsByStatus = [
        { status: "Confirmadas", count: confirmedAppointments, color: "hsl(var(--success))" },
        { status: "Pendentes", count: pendingAppointments, color: "hsl(var(--warning))" },
        { status: "Canceladas", count: cancelledAppointments, color: "hsl(var(--destructive))" },
        { status: "Remarcação", count: rescheduleRequested, color: "hsl(var(--primary))" },
      ];

      // Monthly trend (last 6 months)
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const mStart = startOfMonth(monthDate);
        const mEnd = endOfMonth(monthDate);
        
        const monthAppts = allAppointments?.filter((a) => {
          const date = parseISO(a.appointment_date);
          return date >= mStart && date <= mEnd;
        }) || [];

        monthlyTrend.push({
          month: format(monthDate, "MMM", { locale: ptBR }),
          confirmed: monthAppts.filter((a) => a.status === "confirmed").length,
          cancelled: monthAppts.filter((a) => a.status === "cancelled_auto").length,
        });
      }

      return {
        totalAppointments,
        confirmedAppointments,
        cancelledAppointments,
        pendingAppointments,
        attendanceRate,
        cancellationRate,
        totalPatients,
        newPatientsThisMonth,
        appointmentsByDay,
        appointmentsByStatus,
        monthlyTrend,
      };
    },
    enabled: !!clinic?.id,
  });
};
