import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PatientCard from "@/components/management/PatientCard";
import PatientFormDialog from "@/components/management/PatientFormDialog";
import { usePatients, Patient, CreatePatientData } from "@/hooks/usePatients";
import { useAppointments } from "@/hooks/useAppointments";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Users } from "lucide-react";

const Patients = () => {
  const { toast } = useToast();
  const { patients, isLoading, createPatient, updatePatient, deletePatient, isCreating, isUpdating, isDeleting } = usePatients();
  const appointmentsQuery = useAppointments();
  const appointments = appointmentsQuery.data || [];

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients;
    const searchLower = search.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.whatsapp.includes(search.replace(/\D/g, "")) ||
        p.email?.toLowerCase().includes(searchLower)
    );
  }, [patients, search]);

  const getAppointmentCount = (patientWhatsapp: string) => {
    return appointments.filter((a) => a.patient_whatsapp === patientWhatsapp).length;
  };

  const handleCreate = async (data: CreatePatientData) => {
    try {
      await createPatient(data);
      toast({
        title: "Paciente cadastrado!",
        description: `${data.name} foi adicionado à sua base.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: "Não foi possível cadastrar o paciente.",
      });
      throw error;
    }
  };

  const handleUpdate = async (data: CreatePatientData) => {
    if (!editingPatient) return;
    try {
      await updatePatient({ id: editingPatient.id, ...data });
      setEditingPatient(null);
      toast({
        title: "Paciente atualizado!",
        description: "As informações foram salvas.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o paciente.",
      });
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingPatient) return;
    try {
      await deletePatient(deletingPatient.id);
      toast({
        title: "Paciente excluído",
        description: `${deletingPatient.name} foi removido.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Não foi possível excluir o paciente.",
      });
    } finally {
      setDeletingPatient(null);
    }
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground">
              {patients.length} pacientes cadastrados
            </p>
          </div>
          <Button
            onClick={() => setFormOpen(true)}
            className="gradient-primary font-medium shadow-md hover:opacity-90 transition-opacity"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Paciente
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Patients Grid */}
        {filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              {search ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search
                ? "Tente buscar por outro termo"
                : "Cadastre seu primeiro paciente para começar"}
            </p>
            {!search && (
              <Button onClick={() => setFormOpen(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Paciente
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                appointmentCount={getAppointmentCount(patient.whatsapp)}
                onEdit={(p) => setEditingPatient(p)}
                onDelete={(p) => setDeletingPatient(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
      />

      {/* Edit Dialog */}
      <PatientFormDialog
        open={!!editingPatient}
        onOpenChange={(open) => !open && setEditingPatient(null)}
        patient={editingPatient}
        onSubmit={handleUpdate}
        isSubmitting={isUpdating}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPatient} onOpenChange={(open) => !open && setDeletingPatient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingPatient?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Patients;
