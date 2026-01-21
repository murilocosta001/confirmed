import Logo from "@/components/ui/Logo";

const Footer = () => {
  return (
    <footer className="border-t bg-card py-12">
      <div className="container">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Confirmed. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
