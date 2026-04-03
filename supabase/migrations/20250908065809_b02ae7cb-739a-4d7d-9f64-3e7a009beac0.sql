-- Create families table
CREATE TABLE public.families (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family members table
CREATE TABLE public.family_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(family_id, user_id)
);

-- Create family invitations table
CREATE TABLE public.family_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is family member
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE user_id = _user_id AND family_id = _family_id
  )
$$;

-- Create function to get user's family id
CREATE OR REPLACE FUNCTION public.get_user_family_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id
  FROM public.family_members
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for families table
CREATE POLICY "Users can view their own family" 
ON public.families 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT family_id 
    FROM public.family_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create families" 
ON public.families 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family owners and admins can update family" 
ON public.families 
FOR UPDATE 
TO authenticated
USING (
  id IN (
    SELECT family_id 
    FROM public.family_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- RLS policies for family_members table
CREATE POLICY "Users can view family members" 
ON public.family_members 
FOR SELECT 
TO authenticated
USING (
  family_id IN (
    SELECT family_id 
    FROM public.family_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can join families" 
ON public.family_members 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family owners and admins can manage members" 
ON public.family_members 
FOR ALL 
TO authenticated
USING (
  family_id IN (
    SELECT family_id 
    FROM public.family_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- RLS policies for family_invitations table
CREATE POLICY "Users can view family invitations" 
ON public.family_invitations 
FOR SELECT 
TO authenticated
USING (
  family_id IN (
    SELECT family_id 
    FROM public.family_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
  OR email = (
    SELECT email 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Family owners and admins can create invitations" 
ON public.family_invitations 
FOR INSERT 
TO authenticated
WITH CHECK (
  family_id IN (
    SELECT family_id 
    FROM public.family_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Family owners and admins can update invitations" 
ON public.family_invitations 
FOR UPDATE 
TO authenticated
USING (
  family_id IN (
    SELECT family_id 
    FROM public.family_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Update products table RLS policies to include family access
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
CREATE POLICY "Users can view their own and family products" 
ON public.products 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR user_id IN (
    SELECT fm.user_id 
    FROM public.family_members fm
    JOIN public.family_members my_family ON fm.family_id = my_family.family_id
    WHERE my_family.user_id = auth.uid()
  )
);

-- Update other product policies for family sharing
DROP POLICY IF EXISTS "Users can create their own products" ON public.products;
CREATE POLICY "Users can create products" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update family products" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (
  user_id = auth.uid() 
  OR user_id IN (
    SELECT fm.user_id 
    FROM public.family_members fm
    JOIN public.family_members my_family ON fm.family_id = my_family.family_id
    WHERE my_family.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete family products" 
ON public.products 
FOR DELETE 
TO authenticated
USING (
  user_id = auth.uid() 
  OR user_id IN (
    SELECT fm.user_id 
    FROM public.family_members fm
    JOIN public.family_members my_family ON fm.family_id = my_family.family_id
    WHERE my_family.user_id = auth.uid()
  )
);

-- Create trigger for updated_at on families table
CREATE TRIGGER update_families_updated_at
    BEFORE UPDATE ON public.families
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT encode(gen_random_bytes(32), 'base64url')
$$;