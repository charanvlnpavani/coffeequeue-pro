import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, AlertTriangle, Plus, Minus, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { z } from "zod";

const reportSchema = z.object({
  item_name: z.string().trim().min(1, "Item name is required").max(100, "Item name too long"),
  reported_by: z.string().trim().min(1).max(50),
});

interface InventoryItem {
  id: string;
  item_name: string;
  is_available: boolean;
  quantity: number;
}

interface MissingReport {
  id: string;
  item_name: string;
  reported_by: string;
  reported_at: string;
  status: string;
}

interface InventoryManagementProps {
  employeeId: string;
  isStaff: boolean;
}

const InventoryManagement = ({ employeeId, isStaff }: InventoryManagementProps) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [reports, setReports] = useState<MissingReport[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchReports();

    const inventoryChannel = supabase
      .channel("inventory-items")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_items",
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    const reportsChannel = supabase
      .channel("missing-reports")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "missing_item_reports",
        },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(reportsChannel);
    };
  }, []);

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("item_name");

    if (error) {
      toast.error("Failed to load inventory");
      return;
    }

    setItems(data || []);
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("missing_item_reports")
      .select("*")
      .eq("status", "pending")
      .order("reported_at", { ascending: false });

    if (error) {
      toast.error("Failed to load reports");
      return;
    }

    setReports(data || []);
  };

  const handleReportMissing = async () => {
    const validation = reportSchema.safeParse({
      item_name: selectedItem,
      reported_by: employeeId,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const { error } = await supabase.from("missing_item_reports").insert([
      {
        item_name: validation.data.item_name,
        reported_by: validation.data.reported_by,
      },
    ]);

    if (error) {
      toast.error("Failed to report missing item");
      return;
    }

    toast.success("Missing item reported to staff");
    setReportDialogOpen(false);
    setSelectedItem("");
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    const { error } = await supabase
      .from("inventory_items")
      .update({
        quantity: newQuantity,
        is_available: newQuantity > 0,
        last_updated: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to update quantity");
      return;
    }

    toast.success("Quantity updated");
  };

  const handleResolveReport = async (reportId: string) => {
    const { error } = await supabase
      .from("missing_item_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      toast.error("Failed to resolve report");
      return;
    }

    toast.success("Report marked as resolved");
  };

  const unavailableItems = items.filter((item) => !item.is_available || item.quantity === 0);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Pantry Inventory</CardTitle>
            <CardDescription>Current stock levels</CardDescription>
          </div>
          <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                Report Missing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report Missing Item</DialogTitle>
                <DialogDescription>
                  Select an item that is missing or needs restocking
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Item</Label>
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                  >
                    <option value="">Choose an item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.item_name}>
                        {item.item_name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleReportMissing} className="w-full">
                  Submit Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unavailable Items Alert */}
        {unavailableItems.length > 0 && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h4 className="font-semibold text-destructive">Out of Stock Items</h4>
            </div>
            <div className="space-y-2">
              {unavailableItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-destructive font-medium">{item.item_name}</span>
                  <Badge variant="destructive">Unavailable</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory List */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                item.is_available && item.quantity > 0
                  ? "bg-muted border-border"
                  : "bg-destructive/5 border-destructive/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className={`w-5 h-5 ${item.is_available ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium text-foreground">{item.item_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {item.quantity}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isStaff && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity === 0}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </>
                )}
                <Badge variant={item.is_available && item.quantity > 0 ? "default" : "secondary"}>
                  {item.is_available && item.quantity > 0 ? "Available" : "Out of Stock"}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Staff: Missing Reports */}
        {isStaff && reports.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="font-semibold text-sm text-muted-foreground">
              Pending Reports ({reports.length})
            </h4>
            <div className="space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 bg-warning/10 border border-warning rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{report.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Reported by {report.reported_by}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveReport(report.id)}
                  >
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryManagement;
