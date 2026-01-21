import { cn } from "@/lib/utils";
import { AppointmentStatus } from "@/hooks/useAppointments";
import { CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

const statusConfig = {
  pending: {
    label: "Aguardando",
    icon: Clock,
    className: "status-pending",
  },
  confirmed: {
    label: "Confirmada",
    icon: CheckCircle,
    className: "status-confirmed",
  },
  cancelled_auto: {
    label: "Cancelada",
    icon: XCircle,
    className: "status-cancelled",
  },
  reschedule_requested: {
    label: "Remarcar",
    icon: RefreshCw,
    className: "status-reschedule",
  },
};

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

export default StatusBadge;
