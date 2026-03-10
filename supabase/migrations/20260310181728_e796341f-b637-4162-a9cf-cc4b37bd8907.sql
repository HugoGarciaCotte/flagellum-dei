CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.is_anonymous THEN 'Guest'
      ELSE COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    END
  );
  RETURN NEW;
END;
$$;