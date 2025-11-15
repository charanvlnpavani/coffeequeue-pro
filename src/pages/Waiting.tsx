import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Clock, CheckCircle2 } from "lucide-react";

const Waiting = () => {
  const [timeLeft, setTimeLeft] = useState(30);
  const navigate = useNavigate();

  useEffect(() => {
    const pendingEmployeeId = localStorage.getItem("pendingEmployeeId");
    const pendingEmployeeName = localStorage.getItem("pendingEmployeeName");

    if (!pendingEmployeeId) {
      navigate("/");
      return;
    }

    // Auto-approve timeout
    const autoApproveTimer = setTimeout(async () => {
      try {
        const { data: request } = await supabase
          .from("login_requests")
          .select("*")
          .eq("employee_id", pendingEmployeeId)
          .eq("status", "pending")
          .maybeSingle();

        if (request) {
          await supabase
            .from("login_requests")
            .update({ status: "auto_approved", responded_at: new Date().toISOString() })
            .eq("id", request.id);

          localStorage.setItem("employeeId", pendingEmployeeId);
          localStorage.setItem("employeeName", pendingEmployeeName || "");
          localStorage.setItem("isStaff", "false");
          localStorage.removeItem("pendingEmployeeId");
          localStorage.removeItem("pendingEmployeeName");
          
          toast.success("Auto-approved! Redirecting to dashboard...");
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Auto-approve error:", error);
      }
    }, 30000);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Listen for approval/rejection
    const channel = supabase
      .channel("login-requests")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "login_requests",
          filter: `employee_id=eq.${pendingEmployeeId}`,
        },
        (payload) => {
          const status = payload.new.status;
          if (status === "approved") {
            clearTimeout(autoApproveTimer);
            clearInterval(countdownInterval);
            localStorage.setItem("employeeId", pendingEmployeeId);
            localStorage.setItem("employeeName", pendingEmployeeName || "");
            localStorage.setItem("isStaff", "false");
            localStorage.removeItem("pendingEmployeeId");
            localStorage.removeItem("pendingEmployeeName");
            toast.success("Login approved! Redirecting...");
            navigate("/dashboard");
          } else if (status === "rejected") {
            clearTimeout(autoApproveTimer);
            clearInterval(countdownInterval);
            localStorage.removeItem("pendingEmployeeId");
            localStorage.removeItem("pendingEmployeeName");
            toast.error("Login rejected by staff");
            navigate("/");
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(autoApproveTimer);
      clearInterval(countdownInterval);
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
            {timeLeft > 0 ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-success" />
            )}
          </div>
          <CardTitle className="text-2xl">Waiting for Approval</CardTitle>
          <CardDescription>
            Your login request has been sent to the pantry staff
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-6 text-center">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{timeLeft}s</p>
            <p className="text-sm text-muted-foreground mt-2">
              {timeLeft > 0 
                ? "Auto-approve in" 
                : "Processing auto-approval..."}
            </p>
          </div>
          <div className="text-sm text-center text-muted-foreground">
            <p>If staff doesn't respond within 30 seconds,</p>
            <p>your login will be automatically approved.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Waiting;
