-- Fix infinite recursion in family_members RLS policies
-- Drop all existing policies on family_members
DROP POLICY IF EXISTS "Family owners and admins can manage members" ON public.family_members;
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can join families" ON public.family_members;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.can_manage_family_members(_family_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_id = _family_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_family_member_of(_family_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_id = _family_id 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create new policies using security definer functions to avoid recursion
CREATE POLICY "Users can view family members" 
ON public.family_members 
FOR SELECT 
USING (public.is_family_member_of(family_id));

CREATE POLICY "Users can join families" 
ON public.family_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family owners and admins can manage members" 
ON public.family_members 
FOR ALL 
USING (public.can_manage_family_members(family_id));