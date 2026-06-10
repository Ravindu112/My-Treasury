-- Run this entire script in your Supabase SQL Editor (https://supabase.com/dashboard/project/wdqgkswyngjtbbafsyop/sql/new)

-- 1. PROFILES TABLE (links to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  total_budget DOUBLE PRECISION NOT NULL DEFAULT 0,
  remaining_budget DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. PROJECT MEMBERS
CREATE TABLE IF NOT EXISTS public.project_members (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('treasurer', 'sub_treasurer', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 4. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  allocated_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  spent DOUBLE PRECISION NOT NULL DEFAULT 0,
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount DOUBLE PRECISION NOT NULL,
  bill_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 6. BUDGET LOGS
CREATE TABLE IF NOT EXISTS public.budget_logs (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  previous_total DOUBLE PRECISION NOT NULL,
  new_total DOUBLE PRECISION NOT NULL,
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.budget_logs ENABLE ROW LEVEL SECURITY;

-- ===== AUTO-CREATE PROFILE ON SIGNUP =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== ROW LEVEL SECURITY POLICIES =====

-- PROFILES
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- PROJECTS
CREATE POLICY "Members can view projects" ON public.projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = id AND user_id = auth.uid())
);
CREATE POLICY "Treasurers can insert projects" ON public.projects FOR INSERT WITH CHECK (
  auth.uid() = created_by
);
CREATE POLICY "Treasurers can update projects" ON public.projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = id AND user_id = auth.uid() AND role = 'treasurer')
);
CREATE POLICY "Treasurers can delete projects" ON public.projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = id AND user_id = auth.uid() AND role = 'treasurer')
);

-- PROJECT MEMBERS
CREATE POLICY "Members can view project members" ON public.project_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = project_id AND pm.user_id = auth.uid())
);
CREATE POLICY "Treasurers can insert members" ON public.project_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_id AND user_id = auth.uid() AND role = 'treasurer')
);
CREATE POLICY "Treasurers can update members" ON public.project_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_id AND user_id = auth.uid() AND role = 'treasurer')
);
CREATE POLICY "Treasurers can delete members" ON public.project_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_id AND user_id = auth.uid() AND role = 'treasurer')
);

-- TASKS
CREATE POLICY "Members can view tasks" ON public.tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);
CREATE POLICY "Managers can insert tasks" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role IN ('treasurer', 'sub_treasurer'))
);
CREATE POLICY "Managers can update tasks" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role IN ('treasurer', 'sub_treasurer'))
);
CREATE POLICY "Managers can delete tasks" ON public.tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role IN ('treasurer', 'sub_treasurer'))
);

-- EXPENSES
CREATE POLICY "Members can view expenses" ON public.expenses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_members pm JOIN public.tasks t ON t.project_id = pm.project_id WHERE t.id = expenses.task_id AND pm.user_id = auth.uid())
);
CREATE POLICY "Assignee can insert expenses" ON public.expenses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND assigned_to = auth.uid())
);
CREATE POLICY "Assignee or creator can delete expenses" ON public.expenses FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND assigned_to = auth.uid())
);

-- BUDGET LOGS
CREATE POLICY "Members can view budget logs" ON public.budget_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = budget_logs.project_id AND user_id = auth.uid())
);
CREATE POLICY "Treasurers can insert budget logs" ON public.budget_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = budget_logs.project_id AND user_id = auth.uid() AND role = 'treasurer')
);

-- ===== STORAGE BUCKETS =====
-- After running this SQL, also create storage buckets in the Supabase dashboard:
-- 1. Go to Storage → New Bucket → name: "avatars" → public
-- 2. Go to Storage → New Bucket → name: "bills" → public
