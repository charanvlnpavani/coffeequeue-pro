import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coffee } from "lucide-react";

const Login = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim() || !name.trim()) {
      toast.error("Please enter both Employee ID and Name");
      return;
    }

    setLoading(true);

    try {
      // Check if employee exists
      const { data: existingEmployee } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_id", employeeId.toUpperCase())
        .maybeSingle();

      let isStaff = false;

      if (!existingEmployee) {
        // Create new employee
        const { error: insertError } = await supabase
          .from("employees")
          .insert([{ employee_id: employeeId.toUpperCase(), name, is_staff: false }]);

        if (insertError) throw insertError;
      } else {
        isStaff = existingEmployee.is_staff;
      }

      // If staff, log in directly
      if (isStaff) {
        localStorage.setItem("employeeId", employeeId.toUpperCase());
        localStorage.setItem("employeeName", name);
        localStorage.setItem("isStaff", "true");
        toast.success("Welcome, Pantry Staff!");
        navigate("/dashboard");
        return;
      }

      // Create login request for regular employees
      const { error: requestError } = await supabase
        .from("login_requests")
        .insert([{ employee_id: employeeId.toUpperCase() }]);

      if (requestError) throw requestError;

      localStorage.setItem("pendingEmployeeId", employeeId.toUpperCase());
      localStorage.setItem("pendingEmployeeName", name);
      toast.info("Login request sent to pantry staff. Please wait...");
      navigate("/waiting");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-2">
            <Coffee className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">Pantry Manager</CardTitle>
          <CardDescription>Enter your Employee ID to access the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                placeholder="e.g., EMP001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Staff: Use STAFF001</p>
            <p>Employees: Use any ID (will be created automatically)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
