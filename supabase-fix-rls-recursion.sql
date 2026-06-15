-- Fix infinite recursion in project_members RLS policies
-- The policies self-referenced project_members in subqueries,
-- causing infinite recursion. Solution: SECURITY DEFINER function
-- bypasses RLS for the membership check.

-- Helper function: check if the current user is a project member
CREATE OR REPLACE FUNCTION public.is_project_member(check_project_id BIGINT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = check_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: check if the current user is a project treasurer
CREATE OR REPLACE FUNCTION public.is_project_treasurer(check_project_id BIGINT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = check_project_id AND user_id = auth.uid() AND role = 'treasurer'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Fix project_members SELECT policy
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
CREATE POLICY "Members can view project members" ON public.project_members FOR SELECT USING (
  public.is_project_member(project_id)
);

-- Fix project_members INSERT policy
DROP POLICY IF EXISTS "Treasurers can insert members" ON public.project_members;
CREATE POLICY "Treasurers can insert members" ON public.project_members FOR INSERT WITH CHECK (
  -- Allow the project creator to add themselves as the first treasurer
  (user_id = auth.uid() AND role = 'treasurer' AND EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()
  ))
  OR
  -- Allow existing treasurers to add other members
  public.is_project_treasurer(project_id)
);

-- Fix project_members UPDATE policy
DROP POLICY IF EXISTS "Treasurers can update members" ON public.project_members;
CREATE POLICY "Treasurers can update members" ON public.project_members FOR UPDATE USING (
  public.is_project_treasurer(project_id)
);

-- Fix project_members DELETE policy
DROP POLICY IF EXISTS "Treasurers can delete members" ON public.project_members;
CREATE POLICY "Treasurers can delete members" ON public.project_members FOR DELETE USING (
  public.is_project_treasurer(project_id)
);
