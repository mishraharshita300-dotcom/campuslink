/*
# CampusLink: Re-revoke EXECUTE on trigger functions from anon/authenticated

The previous revoke migration may not have fully taken effect because
the function definitions include default GRANTs to PUBLIC. Re-revoke
to ensure these trigger functions are not callable via the REST API.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_last_message() FROM PUBLIC, anon, authenticated;
