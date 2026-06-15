-- Recreate the projects INSERT policy (may have been skipped during migration)
DROP POLICY IF EXISTS "Treasurers can insert projects" ON public.projects;
CREATE POLICY "Treasurers can insert projects" ON public.projects FOR INSERT WITH CHECK (
  auth.uid() = created_by
);

-- Fix projects SELECT policy to also let the creator see their own project
-- (before they are added as a project_member)
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
CREATE POLICY "Members can view projects" ON public.projects FOR SELECT USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid())
);
