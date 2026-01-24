import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useClinicMetrics } from "@/hooks/useClinicMetrics";
import { Loader2, TrendingUp, TrendingDown, Users, Calendar, CheckCircle, XCircle, Clock, UserPlus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const Reports = () => {
  const { data: metrics, isLoading } = useClinicMetrics();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!metrics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Não foi possível carregar as métricas.</p>
        </div>
      </DashboardLayout>
    );
  }

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    trend,
    trendPositive,
  }: {
    title: string;
    value: string | number;
    description?: string;
    icon: React.ElementType;
    trend?: string;
    trendPositive?: boolean;
  }) => (
    <Card className="shadow-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${trendPositive ? "text-success" : "text-destructive"}`}>
                {trendPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{trend}</span>
              </div>
            )}
          </div>
          <div className="rounded-xl bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Métricas e insights da sua clínica neste mês
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Total de Consultas"
            value={metrics.totalAppointments}
            description="Este mês"
            icon={Calendar}
          />
          <StatCard
            title="Taxa de Comparecimento"
            value={`${metrics.attendanceRate}%`}
            description="Consultas confirmadas"
            icon={CheckCircle}
            trend={metrics.attendanceRate >= 70 ? "Meta atingida" : "Abaixo da meta"}
            trendPositive={metrics.attendanceRate >= 70}
          />
          <StatCard
            title="Taxa de Cancelamento"
            value={`${metrics.cancellationRate}%`}
            description="Cancelamentos automáticos"
            icon={XCircle}
            trend={metrics.cancellationRate <= 30 ? "Dentro do esperado" : "Acima do esperado"}
            trendPositive={metrics.cancellationRate <= 30}
          />
          <StatCard
            title="Total de Pacientes"
            value={metrics.totalPatients}
            description={`+${metrics.newPatientsThisMonth} este mês`}
            icon={Users}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Appointments by Day */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Consultas da Semana
              </CardTitle>
              <CardDescription>Distribuição por dia da semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.appointmentsByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Consultas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Appointments by Status */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Status das Consultas
              </CardTitle>
              <CardDescription>Distribuição por status no mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.appointmentsByStatus.filter((s) => s.count > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="count"
                      label={({ status, count }) => `${status}: ${count}`}
                      labelLine={false}
                    >
                      {metrics.appointmentsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {metrics.appointmentsByStatus.map((s) => (
                  <div key={s.status} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Mensal
            </CardTitle>
            <CardDescription>Comparação de confirmações e cancelamentos nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="confirmed"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--success))" }}
                    name="Confirmadas"
                  />
                  <Line
                    type="monotone"
                    dataKey="cancelled"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--destructive))" }}
                    name="Canceladas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mt-6">
          <Card className="shadow-card bg-success/5 border-success/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-xl bg-success/10 p-3">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{metrics.confirmedAppointments}</p>
                <p className="text-sm text-muted-foreground">Consultas confirmadas</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card bg-warning/5 border-warning/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-xl bg-warning/10 p-3">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{metrics.pendingAppointments}</p>
                <p className="text-sm text-muted-foreground">Aguardando confirmação</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{metrics.newPatientsThisMonth}</p>
                <p className="text-sm text-muted-foreground">Novos pacientes este mês</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
