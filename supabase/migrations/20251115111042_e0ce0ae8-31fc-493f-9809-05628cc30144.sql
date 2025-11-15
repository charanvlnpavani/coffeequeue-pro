-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create login requests table
CREATE TABLE IF NOT EXISTS public.login_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by TEXT
);

-- Create coffee queue table
CREATE TABLE IF NOT EXISTS public.coffee_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  position INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  estimated_completion TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'brewing', 'completed'))
);

-- Create inventory items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT UNIQUE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  quantity INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create missing item reports table
CREATE TABLE IF NOT EXISTS public.missing_item_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Insert default inventory items
INSERT INTO public.inventory_items (item_name, is_available, quantity) VALUES
  ('Cups', true, 50),
  ('Spoons', true, 30),
  ('Sugar', true, 100),
  ('Green Tea', true, 40),
  ('Coffee Beans', true, 200)
ON CONFLICT (item_name) DO NOTHING;

-- Insert a default staff member for testing
INSERT INTO public.employees (employee_id, name, is_staff) VALUES
  ('STAFF001', 'Pantry Staff', true)
ON CONFLICT (employee_id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coffee_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missing_item_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we're using employee_id auth, not Supabase auth)
CREATE POLICY "Anyone can view employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Anyone can insert employees" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update employees" ON public.employees FOR UPDATE USING (true);

CREATE POLICY "Anyone can view login requests" ON public.login_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert login requests" ON public.login_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update login requests" ON public.login_requests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete login requests" ON public.login_requests FOR DELETE USING (true);

CREATE POLICY "Anyone can view coffee queue" ON public.coffee_queue FOR SELECT USING (true);
CREATE POLICY "Anyone can insert coffee queue" ON public.coffee_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update coffee queue" ON public.coffee_queue FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete coffee queue" ON public.coffee_queue FOR DELETE USING (true);

CREATE POLICY "Anyone can view inventory items" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Anyone can update inventory items" ON public.inventory_items FOR UPDATE USING (true);

CREATE POLICY "Anyone can view missing item reports" ON public.missing_item_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert missing item reports" ON public.missing_item_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update missing item reports" ON public.missing_item_reports FOR UPDATE USING (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coffee_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.missing_item_reports;