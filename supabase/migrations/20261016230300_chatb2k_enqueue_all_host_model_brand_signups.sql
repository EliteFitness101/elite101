-- Extend signup enqueue to all host, model, and brand records.
create or replace function public.chatb2k_enqueue_talent_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(new);
  v_type text := lower(tg_argv[0]);
  v_name text;
  v_email text;
  v_user_id uuid;
  v_profile_id uuid;
  v_social jsonb;
  v_goals jsonb;
  v_careers jsonb;
  v_consent jsonb;
begin
  if v_type not in ('model','brand','host') then return new; end if;
  v_user_id := nullif(v_row->>'user_id','')::uuid;
  v_name := coalesce(nullif(v_row->>'full_name',''),nullif(v_row->>'name',''),nullif(v_row->>'display_name',''),'New talent');
  v_email := nullif(v_row->>'email','');
  if v_user_id is not null then
    select coalesce(v_email,u.email) into v_email from auth.users u where u.id=v_user_id;
  end if;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('platform',s.platform,'handle',nullif(s.handle,''),'url',nullif(s.url,''),'verification_status','unverified'))),'[]'::jsonb)
  into v_social from (values
    ('Instagram',coalesce(v_row->>'instagram',''),coalesce(v_row->>'instagram_url','')),
    ('TikTok',coalesce(v_row->>'tiktok',''),coalesce(v_row->>'tiktok_url','')),
    ('YouTube',coalesce(v_row->>'youtube',''),coalesce(v_row->>'youtube_url','')),
    ('Facebook',coalesce(v_row->>'facebook',''),coalesce(v_row->>'facebook_url','')),
    ('Pinterest',coalesce(v_row->>'pinterest',''),coalesce(v_row->>'pinterest_url','')),
    ('X',coalesce(v_row->>'x',''),coalesce(v_row->>'x_url','')),
    ('LinkedIn',coalesce(v_row->>'linkedin',''),coalesce(v_row->>'linkedin_url','')),
    ('Google',coalesce(v_row->>'google',''),coalesce(v_row->>'google_url','')),
    ('BIGO Live',coalesce(v_row->>'bigo_username',''),coalesce(v_row->>'bigo_profile_url','')),
    ('Portfolio','',coalesce(v_row->>'portfolio_url',''))
  ) s(platform,handle,url) where nullif(s.handle,'') is not null or nullif(s.url,'') is not null;
  v_careers := case when jsonb_typeof(v_row->'career_choices')='array' then v_row->'career_choices'
    when nullif(v_row->>'content_category','') is not null then jsonb_build_array(v_row->>'content_category')
    when nullif(v_row->>'industry','') is not null then jsonb_build_array(v_row->>'industry') else '[]'::jsonb end;
  v_goals := case when jsonb_typeof(v_row->'goals')='array' then v_row->'goals'
    else to_jsonb(array_remove(array[nullif(v_row->>'personal_goal',''),nullif(v_row->>'dream_goal','')],null)) end;
  v_consent := jsonb_build_object(
    'whatsapp',coalesce((v_row->>'whatsapp_opt_in')::boolean,false),
    'whatsapp_opt_in',coalesce((v_row->>'whatsapp_opt_in')::boolean,false),
    'telegram_opt_in',coalesce((v_row->>'telegram_opt_in')::boolean,false),
    'social_review',coalesce((v_row->>'social_review_consent')::boolean,false),
    'telegram_chat_id',nullif(v_row->>'telegram_chat_id','')
  );
  insert into public.chatb2k_talent_profiles(user_id,profile_type,source_table,source_id,display_name,email,phone,preferences,career_choices,goals,portfolio,social_profiles,consent,onboarding_status)
  values(v_user_id,v_type,tg_table_name,new.id,v_name,v_email,nullif(v_row->>'phone',''),
    jsonb_strip_nulls(jsonb_build_object('city',v_row->>'city','state',v_row->>'state','country',v_row->>'country','industry',v_row->>'industry','timezone',v_row->>'timezone','preferred_language',v_row->>'preferred_language','preferred_channels',v_row->'preferred_channels')),
    v_careers,v_goals,jsonb_strip_nulls(jsonb_build_object('bio',coalesce(v_row->>'bio',v_row->>'experience'),'industry',v_row->>'industry','portfolio_url',v_row->>'portfolio_url','city',v_row->>'city','state',v_row->>'state')),
    v_social,v_consent,'received') on conflict(profile_type,source_id) do nothing;
  select p.id into v_profile_id from public.chatb2k_talent_profiles p where p.profile_type=v_type and p.source_id=new.id;
  if v_profile_id is not null then
    insert into public.chatb2k_talent_events(profile_id,event_type,dedupe_key,status,channel,payload)
    values(v_profile_id,'TALENT_ONBOARDING_RECEIVED','talent-welcome:'||v_type||':'||new.id::text,'queued','whatsapp_or_telegram',
      jsonb_build_object('engine','ChatB2K Autonomous Multi-Agent Core','routing_agent','ChatB2K101','target_channel','WhatsApp / Telegram Dispatch','recipient',v_name,
      'message_body','Welcome to ResoFit / ResoFlex Elite, '||v_name||'! Your onboarding profile has been received. ChatB2K is preparing a preference-led career, goal and portfolio plan. Social profile links remain unverified until independently confirmed.',
      'automated_actions',jsonb_build_array('UPSERT_SUPABASE_PROFILE','ENRICH_TALENT_PROFILE','QUEUE_PROFILE_FOLLOWUP','DISPATCH_WELCOME_MESSAGE'))) on conflict(dedupe_key) do nothing;
    insert into public.chatb2k_talent_followups(profile_id,followup_type,due_at,status,dedupe_key,payload)
    values(v_profile_id,case when v_type='host' then 'request_bigo_id' else 'complete_portfolio' end,now()+interval '24 hours','queued',
      'talent-followup-24h:'||v_type||':'||new.id::text,jsonb_build_object('profile_type',v_type,'source_id',new.id,'recipient',v_name)) on conflict(dedupe_key) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists chatb2k_model_signup_enqueue on public.models;
create trigger chatb2k_model_signup_enqueue after insert on public.models for each row execute function public.chatb2k_enqueue_talent_on_signup('model');
drop trigger if exists chatb2k_brand_signup_enqueue on public.brands;
create trigger chatb2k_brand_signup_enqueue after insert on public.brands for each row execute function public.chatb2k_enqueue_talent_on_signup('brand');
drop trigger if exists chatb2k_host_signup_enqueue on public.elite_host_applications;
create trigger chatb2k_host_signup_enqueue after insert on public.elite_host_applications for each row execute function public.chatb2k_enqueue_talent_on_signup('host');
