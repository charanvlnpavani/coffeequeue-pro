import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Coffee } from "lucide-react";
import StaffApprovalPanel from "@/components/StaffApprovalPanel";
import CoffeeQueueDisplay from "@/components/CoffeeQueueDisplay";
import InventoryManagement from "@/components/InventoryManagement";

const Dashboard = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [isStaff, setIsStaff] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedEmployeeId = localStorage.getItem("employeeId");
    const storedEmployeeName = localStorage.getItem("employeeName");
    const storedIsStaff = localStorage.getItem("isStaff") === "true";

    if (!storedEmployeeId) {
      navigate("/");
      return;
    }

    setEmployeeId(storedEmployeeId);
    setEmployeeName(storedEmployeeName || "");
    setIsStaff(storedIsStaff);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("employeeId");
    localStorage.removeItem("employeeName");
    localStorage.removeItem("isStaff");
    toast.info("Logged out successfully");
    navigate("/");
  };

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
                {employeeName} ({employeeId}) {isStaff && "• Staff"}
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

          {/* Coffee Queue Display */}
          <CoffeeQueueDisplay employeeId={employeeId} employeeName={employeeName} />

          {/* Inventory Management */}
          <InventoryManagement employeeId={employeeId} isStaff={isStaff} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
