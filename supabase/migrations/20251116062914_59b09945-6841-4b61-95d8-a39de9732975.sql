-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');

-- Create user_roles table (CRITICAL: roles must be separate from user profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Update employees table to link to auth.users
ALTER TABLE public.employees ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employees ADD CONSTRAINT employees_user_id_unique UNIQUE (user_id);

-- Drop the old is_staff column (roles now in user_roles table)
ALTER TABLE public.employees DROP COLUMN is_staff;

-- RLS Policies for user_roles (only admins can modify roles)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Staff can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Update employees RLS policies (secure with auth)
DROP POLICY IF EXISTS "Anyone can view employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can update employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can insert employees" ON public.employees;

CREATE POLICY "Authenticated users can view employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own employee record"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Update login_requests RLS policies
DROP POLICY IF EXISTS "Anyone can view login requests" ON public.login_requests;
DROP POLICY IF EXISTS "Anyone can insert login requests" ON public.login_requests;
DROP POLICY IF EXISTS "Anyone can update login requests" ON public.login_requests;
DROP POLICY IF EXISTS "Anyone can delete login requests" ON public.login_requests;

CREATE POLICY "Staff can view all login requests"
  ON public.login_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create login requests"
  ON public.login_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update login requests"
  ON public.login_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can delete login requests"
  ON public.login_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Update coffee_queue RLS policies
DROP POLICY IF EXISTS "Anyone can view coffee queue" ON public.coffee_queue;
DROP POLICY IF EXISTS "Anyone can insert coffee queue" ON public.coffee_queue;
DROP POLICY IF EXISTS "Anyone can update coffee queue" ON public.coffee_queue;
DROP POLICY IF EXISTS "Anyone can delete coffee queue" ON public.coffee_queue;

CREATE POLICY "Authenticated users can view coffee queue"
  ON public.coffee_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can join queue"
  ON public.coffee_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can remove themselves from queue"
  ON public.coffee_queue FOR DELETE
  TO authenticated
  USING (employee_id = (SELECT employee_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage coffee queue"
  ON public.coffee_queue FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Update inventory_items RLS policies
DROP POLICY IF EXISTS "Anyone can view inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can update inventory items" ON public.inventory_items;

CREATE POLICY "Authenticated users can view inventory"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can update inventory"
  ON public.inventory_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Update missing_item_reports RLS policies
DROP POLICY IF EXISTS "Anyone can view missing item reports" ON public.missing_item_reports;
DROP POLICY IF EXISTS "Anyone can insert missing item reports" ON public.missing_item_reports;
DROP POLICY IF EXISTS "Anyone can update missing item reports" ON public.missing_item_reports;

CREATE POLICY "Authenticated users can view missing reports"
  ON public.missing_item_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can report missing items"
  ON public.missing_item_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update missing reports"
  ON public.missing_item_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Create trigger function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_employee_id TEXT;
BEGIN
  -- Generate employee ID from email or use metadata
  default_employee_id := COALESCE(
    NEW.raw_user_meta_data->>'employee_id',
    'EMP' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 6)
  );
  
  -- Insert profile
  INSERT INTO public.profiles (id, employee_id, full_name)
  VALUES (
    NEW.id,
    default_employee_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User')
  );
  
  -- Insert employee record
  INSERT INTO public.employees (user_id, employee_id, name)
  VALUES (
    NEW.id,
    default_employee_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User')
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();