/*
# CampusLink: Revoke EXECUTE on trigger functions from anon/authenticated

The SECURITY DEFINER functions (handle_new_user, protect_profile_fields,
update_last_message) are trigger functions and should not be callable
directly via the REST API by anon or authenticated roles. Only the
supabase_admin and the trigger invocation need access.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_last_message() FROM anon, authenticated;
