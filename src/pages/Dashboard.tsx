import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StaffApprovalPanel from "@/components/StaffApprovalPanel";
import CoffeeQueueDisplay from "@/components/CoffeeQueueDisplay";
import InventoryManagement from "@/components/InventoryManagement";
import { LogOut, Coffee } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isStaff, loading: roleLoading } = useUserRole();
  const [profile, setProfile] = useState<{ employee_id: string; full_name: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("employee_id, full_name")
          .eq("id", user.id)
          .single();
        
        if (data) {
          setProfile(data);
        }
      };
      
      fetchProfile();
    }
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
  };

  if (authLoading || roleLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Coffee className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Coffee className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pantry Manager</h1>
              <p className="text-sm text-muted-foreground">
                {profile.full_name} ({profile.employee_id}) {isStaff && "• Staff"}
              </p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staff Approval Panel - Only for staff */}
          {isStaff && (
            <div className="lg:col-span-2">
              <StaffApprovalPanel />
            </div>
          )}

          <CoffeeQueueDisplay employeeId={profile.employee_id} employeeName={profile.full_name} />
          <InventoryManagement employeeId={profile.employee_id} isStaff={isStaff} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
