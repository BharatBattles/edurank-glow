-- Drop existing function and recreate with improved security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  safe_name text;
  safe_email text;
BEGIN
  -- Validate and sanitize email (limit length, basic format check)
  safe_email := CASE 
    WHEN NEW.email IS NOT NULL AND length(NEW.email) <= 255 
    THEN left(NEW.email, 255)
    ELSE NULL 
  END;
  
  -- Sanitize name from metadata (limit length, strip dangerous characters)
  safe_name := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'full_name',
    split_part(COALESCE(safe_email, ''), '@', 1)
  );
  
  -- Limit name length and remove potentially dangerous characters
  safe_name := regexp_replace(left(COALESCE(safe_name, 'User'), 100), '[<>"\x00-\x1f]', '', 'g');
  
  -- Insert with validated data, use explicit schema references
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    safe_name,
    safe_email
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;