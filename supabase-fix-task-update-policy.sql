-- Fix tasks UPDATE policy to also allow task assignees to update spent
DROP POLICY IF EXISTS "Managers can update tasks" ON public.tasks;
CREATE POLICY "Managers can update tasks" ON public.tasks FOR UPDATE USING (
  assigned_to = auth.uid()
  OR
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role IN ('treasurer', 'sub_treasurer'))
);
