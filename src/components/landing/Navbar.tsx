import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/Logo";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="font-medium">
            <Link to="/login">Entrar</Link>
          </Button>
          <Button asChild className="gradient-primary font-medium shadow-md hover:opacity-90 transition-opacity">
            <Link to="/cadastro">Criar conta</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
