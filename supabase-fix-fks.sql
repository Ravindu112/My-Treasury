-- =========================================================
-- FIX 1: Change FK references from auth.users(id) to public.profiles(id)
-- This allows Supabase FK-based joins (profiles:user_id) to work
-- =========================================================

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE public.projects ADD CONSTRAINT projects_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
ALTER TABLE public.project_members ADD CONSTRAINT project_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.budget_logs DROP CONSTRAINT IF EXISTS budget_logs_changed_by_fkey;
ALTER TABLE public.budget_logs ADD CONSTRAINT budget_logs_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES public.profiles(id);

-- =========================================================
-- FIX 2: Fix RLS policies with incorrect column references
-- Unqualified column names in subqueries resolve to the
-- subquery's table first, causing project_id = project_id
-- to always be true and project_id = id to compare the wrong columns.
-- =========================================================

-- Fix projects policies (unqualified 'id' inside subquery resolves to project_members.id)
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
CREATE POLICY "Members can view projects" ON public.projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Treasurers can update projects" ON public.projects;
CREATE POLICY "Treasurers can update projects" ON public.projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'treasurer')
);

DROP POLICY IF EXISTS "Treasurers can delete projects" ON public.projects;
CREATE POLICY "Treasurers can delete projects" ON public.projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'treasurer')
);

-- Fix project_members policies (unqualified 'project_id' inside subquery resolves to project_members.project_id)
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
CREATE POLICY "Members can view project members" ON public.project_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "Treasurers can insert members" ON public.project_members;
CREATE POLICY "Treasurers can insert members" ON public.project_members FOR INSERT WITH CHECK (
  -- Allow the project creator to add themselves as the first treasurer
  (user_id = auth.uid() AND role = 'treasurer' AND EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()
  ))
  OR
  -- Allow existing treasurers to add other members
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'treasurer'
      )
  )
);

DROP POLICY IF EXISTS "Treasurers can update members" ON public.project_members;
CREATE POLICY "Treasurers can update members" ON public.project_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'treasurer'
      )
  )
);

DROP POLICY IF EXISTS "Treasurers can delete members" ON public.project_members;
CREATE POLICY "Treasurers can delete members" ON public.project_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'treasurer'
      )
  )
);
