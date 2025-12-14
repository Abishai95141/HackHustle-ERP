-- Allow volunteers to update profiles (for check-in system)
CREATE POLICY "Volunteers can update profiles" ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'volunteer'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));