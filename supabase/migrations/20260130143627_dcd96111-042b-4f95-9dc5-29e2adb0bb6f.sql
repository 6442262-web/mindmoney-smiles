-- Create invite_codes table for developer registration
CREATE TABLE public.invite_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    role app_role NOT NULL DEFAULT 'developer',
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invite codes
CREATE POLICY "Admins can view all invite codes"
ON public.invite_codes
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create invite codes"
ON public.invite_codes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invite codes"
ON public.invite_codes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invite codes"
ON public.invite_codes
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create a security definer function to redeem invite code
-- This bypasses RLS so normal users can redeem codes
CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite_code RECORD;
    v_user_id UUID;
    v_existing_role RECORD;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'ไม่ได้เข้าสู่ระบบ');
    END IF;
    
    -- Find the invite code
    SELECT * INTO v_invite_code
    FROM public.invite_codes
    WHERE code = p_code
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR current_uses < max_uses);
    
    IF v_invite_code IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'รหัสไม่ถูกต้องหรือหมดอายุ');
    END IF;
    
    -- Check if user already has this role
    SELECT * INTO v_existing_role
    FROM public.user_roles
    WHERE user_id = v_user_id AND role = v_invite_code.role;
    
    IF v_existing_role IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'คุณมี role นี้อยู่แล้ว');
    END IF;
    
    -- Insert the user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, v_invite_code.role);
    
    -- Update usage count
    UPDATE public.invite_codes
    SET current_uses = current_uses + 1,
        updated_at = now()
    WHERE id = v_invite_code.id;
    
    RETURN json_build_object('success', true, 'role', v_invite_code.role::text);
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_invite_codes_updated_at
BEFORE UPDATE ON public.invite_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default developer invite code (can be changed later)
INSERT INTO public.invite_codes (code, role, max_uses, is_active)
VALUES ('DEV-2024-MONEYMIND', 'developer', 100, true);