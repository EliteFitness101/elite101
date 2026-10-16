-- Keep provider credentials in Supabase Vault; expose only an allow-listed read to service-role Edge Functions.
create or replace function public.chatb2k_get_runtime_secret(p_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_secret text;
begin
  if p_name not in (
    'GEMINI_API_KEY','GEMINI_AUTOMATION_API_KEY','FIRECRAWL_API_KEY','OPENAI_API_KEY','OPENAI_MODEL','GEMINI_MODEL',
    'WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_WELCOME_TEMPLATE_NAME','WHATSAPP_TEMPLATE_LANGUAGE',
    'telegram_bot_01_token','telegram_bot_02_mealplan_token','telegram_bot_03_resonancefitness_token',
    'telegram_bot_04_resoflex_body_token','telegram_bot_05_resoflex_personalized_token','telegram_bot_06_resoFlex_Command_token',
    'telegram_bot_07_martial_redzone_recruittoken','buffer_cron_secret'
  ) then return null; end if;
  select s.decrypted_secret into v_secret from vault.decrypted_secrets s where s.name=p_name limit 1;
  return v_secret;
end; $$;
revoke all on function public.chatb2k_get_runtime_secret(text) from public,anon,authenticated;
grant execute on function public.chatb2k_get_runtime_secret(text) to service_role;
