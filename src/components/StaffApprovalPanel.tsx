import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface LoginRequest {
  id: string;
  employee_id: string;
  status: string;
  requested_at: string;
}

const StaffApprovalPanel = () => {
  const [requests, setRequests] = useState<LoginRequest[]>([]);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel("staff-login-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "login_requests",
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("login_requests")
      .select("*")
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    if (error) {
      console.error("Error fetching requests:", error);
      return;
    }

    setRequests(data || []);
  };

  const handleApprove = async (id: string, employeeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("employee_id")
      .eq("id", user.id)
      .single();

    const { error } = await supabase
      .from("login_requests")
      .update({
        status: "approved",
        responded_at: new Date().toISOString(),
        responded_by: profile?.employee_id || "",
      })
      .eq("id", id);

    if (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
      return;
    }

    toast.success(`Approved login for ${employeeId}`);
  };

  const handleReject = async (id: string, employeeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("employee_id")
      .eq("id", user.id)
      .single();

    const { error } = await supabase
      .from("login_requests")
      .update({
        status: "rejected",
        responded_at: new Date().toISOString(),
        responded_by: profile?.employee_id || "",
      })
      .eq("id", id);

    if (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
      return;
    }

    toast.info(`Rejected login for ${employeeId}`);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Login Approvals</CardTitle>
            <CardDescription>Pending employee login requests</CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {requests.length} Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pending requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border hover:border-primary transition-colors"
              >
                <div>
                  <p className="font-semibold text-foreground">{request.employee_id}</p>
                  <p className="text-sm text-muted-foreground">
                    Requested: {new Date(request.requested_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleApprove(request.id, request.employee_id)}
                    className="bg-success hover:bg-success/90"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(request.id, request.employee_id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffApprovalPanel;
