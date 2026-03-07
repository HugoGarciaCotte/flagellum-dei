-- Allow owners and admins to insert scenarios
CREATE POLICY "Admins can insert scenarios"
ON public.scenarios
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow owners and admins to update scenarios
CREATE POLICY "Admins can update scenarios"
ON public.scenarios
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow owners and admins to delete scenarios
CREATE POLICY "Admins can delete scenarios"
ON public.scenarios
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);