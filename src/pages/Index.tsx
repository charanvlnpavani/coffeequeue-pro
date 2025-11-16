import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coffee } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Coffee className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="mx-auto w-24 h-24 bg-primary rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Coffee className="w-12 h-12 text-primary-foreground" />
        </div>
        <h1 className="text-5xl font-bold text-foreground mb-4">
          Welcome to Pantry Manager
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Manage your coffee queue and pantry inventory with ease
        </p>
        <Button
          onClick={() => navigate("/auth")}
          size="lg"
          className="text-lg px-8 py-6"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
