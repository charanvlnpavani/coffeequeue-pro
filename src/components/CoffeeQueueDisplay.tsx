import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coffee, Clock, Users, Plus } from "lucide-react";

interface QueueItem {
  id: string;
  employee_id: string;
  employee_name: string;
  position: number;
  joined_at: string;
  status: string;
}

interface CoffeeQueueDisplayProps {
  employeeId: string;
  employeeName: string;
}

const CoffeeQueueDisplay = ({ employeeId, employeeName }: CoffeeQueueDisplayProps) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [inQueue, setInQueue] = useState(false);
  const [estimatedWait, setEstimatedWait] = useState(0);

  const BREW_TIME_MINUTES = 3; // Average time per coffee

  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel("coffee-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "coffee_queue",
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const userInQueue = queue.some((item) => item.employee_id === employeeId);
    setInQueue(userInQueue);

    const userPosition = queue.findIndex((item) => item.employee_id === employeeId);
    if (userPosition !== -1) {
      setEstimatedWait(userPosition * BREW_TIME_MINUTES);
    }
  }, [queue, employeeId]);

  const fetchQueue = async () => {
    const { data, error } = await supabase
      .from("coffee_queue")
      .select("*")
      .eq("status", "waiting")
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching queue:", error);
      return;
    }

    setQueue(data || []);
  };

  const handleJoinQueue = async () => {
    const { error } = await supabase.from("coffee_queue").insert([
      {
        employee_id: employeeId,
        employee_name: employeeName,
        position: queue.length + 1,
      },
    ]);

    if (error) {
      console.error("Error joining queue:", error);
      toast.error("Failed to join queue");
      return;
    }

    toast.success("You've joined the coffee queue!");
  };

  const handleLeaveQueue = async () => {
    const { error } = await supabase
      .from("coffee_queue")
      .delete()
      .eq("employee_id", employeeId)
      .eq("status", "waiting");

    if (error) {
      console.error("Error leaving queue:", error);
      toast.error("Failed to leave queue");
      return;
    }

    toast.info("You've left the coffee queue");
  };

  const getQueueStatus = () => {
    if (queue.length === 0) return { color: "success", text: "Machine is Free" };
    if (queue.length <= 2) return { color: "warning", text: "Short Wait" };
    return { color: "destructive", text: "Long Wait" };
  };

  const status = getQueueStatus();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Coffee Queue</CardTitle>
            <CardDescription>Real-time queue status</CardDescription>
          </div>
          <Badge variant={status.color === "success" ? "default" : "secondary"} className={`text-sm px-3 py-1 ${
            status.color === "success" ? "bg-success" : status.color === "warning" ? "bg-warning text-warning-foreground" : "bg-destructive"
          }`}>
            {status.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{queue.length}</p>
            <p className="text-sm text-muted-foreground">In Queue</p>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">
              {queue.length === 0 ? "0" : `~${queue.length * BREW_TIME_MINUTES}`}
            </p>
            <p className="text-sm text-muted-foreground">Minutes Wait</p>
          </div>
        </div>

        {/* Join/Leave Button */}
        {!inQueue ? (
          <Button onClick={handleJoinQueue} className="w-full" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Join Coffee Queue
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="bg-primary/10 border border-primary rounded-lg p-4 text-center">
              <Coffee className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold text-foreground">You're in the queue!</p>
              <p className="text-sm text-muted-foreground">
                Estimated wait: ~{estimatedWait} minutes
              </p>
            </div>
            <Button onClick={handleLeaveQueue} variant="outline" className="w-full">
              Leave Queue
            </Button>
          </div>
        )}

        {/* Queue List */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground">Current Queue:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {queue.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.employee_id === employeeId
                      ? "bg-primary/10 border-primary"
                      : "bg-muted border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{item.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{item.employee_id}</p>
                    </div>
                  </div>
                  {item.employee_id === employeeId && (
                    <Badge variant="default">You</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CoffeeQueueDisplay;
