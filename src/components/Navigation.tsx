import { Button } from "@/components/ui/button";
import { Package2 } from "lucide-react";
import { Link } from "react-router-dom";
const Navigation = () => {
  return <nav className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Package2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl bg-gradient-hero bg-clip-text text-transparent">AayuTrace</span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#solution" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#solution" className="text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="#cta" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>;
};
export { Navigation };