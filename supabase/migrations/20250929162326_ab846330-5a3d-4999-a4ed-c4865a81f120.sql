-- Fix user_roles RLS infinite recursion by creating security definer functions
-- and updating policies to use them

-- 1. Create security definer function to check user roles safely
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
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

-- 2. Create function to check if user is admin/owner for an account
CREATE OR REPLACE FUNCTION public.is_account_admin(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND account_id = _account_id
      AND role IN ('owner', 'admin')
  )
$$;

-- 3. Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Account owners/admins can create user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Account owners/admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Account owners/admins can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles for their accounts" ON public.user_roles;

-- 4. Create new safe policies using security definer functions
CREATE POLICY "Account owners/admins can create user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account owners/admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (public.is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account owners/admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (public.is_account_admin(auth.uid(), account_id));

CREATE POLICY "Users can view roles for their accounts"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id OR 
  public.is_account_admin(auth.uid(), account_id)
);

-- 5. Add missing UPDATE/DELETE policies for backup_logs
CREATE POLICY "Users can update their own backup logs"
ON public.backup_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backup logs"
ON public.backup_logs
FOR DELETE
USING (auth.uid() = user_id);

-- 6. Add missing UPDATE/DELETE policies for liability_payments
CREATE POLICY "Users can update their own liability payments"
ON public.liability_payments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liability payments"
ON public.liability_payments
FOR DELETE
USING (auth.uid() = user_id);

-- 7. Secure existing database functions by adding proper search_path
-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update copy_default_categories_for_user function
CREATE OR REPLACE FUNCTION public.copy_default_categories_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color, icon, is_default)
  SELECT NEW.id, name, type, color, icon, is_default
  FROM public.categories
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND is_default = true;
  RETURN NEW;
END;
$function$;

-- Update copy_default_business_categories_for_user function
CREATE OR REPLACE FUNCTION public.copy_default_business_categories_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.business_categories (user_id, name, type, account_code, is_system, color, icon)
  SELECT NEW.id, name, type, account_code, is_system, color, icon
  FROM public.business_categories
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND is_system = true;
  RETURN NEW;
END;
$function$;