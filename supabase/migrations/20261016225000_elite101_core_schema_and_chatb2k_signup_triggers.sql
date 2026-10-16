-- Additive Elite101 marketplace schema and ChatB2K onboarding enqueue triggers.
do $$ begin create type public.model_category as enum ('Platinum','Commercial','Influencer','Training'); exception when duplicate_object then null; end $$;
do $$ begin create type public.model_status as enum ('pending','approved','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.campaign_status as enum ('draft','open','closed','completed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.booking_status as enum ('pending','paid','accepted','completed','cancelled'); exception when duplicate_object then null; end $$;

create table if not exists public.models (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 full_name text not null, age integer check(age is null or age between 16 and 100), gender text, phone text, city text, state text,
 instagram text, tiktok text, bio text, category public.model_category, status public.model_status not null default 'pending',
 score numeric, ig_followers integer, ai_strengths text[], ai_improvements text[], ai_reasoning text, scored_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.brands (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 name text not null, industry text, city text, logo_path text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.model_photos (
 id uuid primary key default gen_random_uuid(), model_id uuid not null references public.models(id) on delete cascade,
 storage_path text not null, position integer not null default 0, created_at timestamptz not null default now(), unique(model_id,storage_path)
);
create table if not exists public.campaigns (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade,
 title text not null, brief text, budget_ngn numeric not null default 0 check(budget_ngn>=0), category public.model_category,
 city text, state text, shoot_date date, slots integer not null default 1 check(slots>=1),
 status public.campaign_status not null default 'draft', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bookings (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete restrict,
 model_id uuid not null references public.models(id) on delete restrict, campaign_id uuid not null references public.campaigns(id) on delete restrict,
 amount_ngn numeric not null check(amount_ngn>=0), commission_ngn numeric not null default 0 check(commission_ngn>=0),
 paystack_ref text unique, status public.booking_status not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.matches (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade,
 model_id uuid not null references public.models(id) on delete cascade, total_score numeric not null default 0 check(total_score between 0 and 100),
 breakdown jsonb, created_at timestamptz not null default now(), unique(campaign_id,model_id)
);
create or replace function public.elite101_touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists elite101_models_touch on public.models; create trigger elite101_models_touch before update on public.models for each row execute function public.elite101_touch_updated_at();
drop trigger if exists elite101_brands_touch on public.brands; create trigger elite101_brands_touch before update on public.brands for each row execute function public.elite101_touch_updated_at();
drop trigger if exists elite101_campaigns_touch on public.campaigns; create trigger elite101_campaigns_touch before update on public.campaigns for each row execute function public.elite101_touch_updated_at();
drop trigger if exists elite101_bookings_touch on public.bookings; create trigger elite101_bookings_touch before update on public.bookings for each row execute function public.elite101_touch_updated_at();

alter table public.models enable row level security; alter table public.brands enable row level security; alter table public.model_photos enable row level security;
alter table public.campaigns enable row level security; alter table public.bookings enable row level security; alter table public.matches enable row level security;
drop policy if exists models_select_approved_or_owner on public.models;
create policy models_select_approved_or_owner on public.models for select to anon,authenticated using(status='approved' or user_id=(select auth.uid()));
drop policy if exists models_insert_owner on public.models;
create policy models_insert_owner on public.models for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists models_update_owner on public.models;
create policy models_update_owner on public.models for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists brands_select_owner on public.brands;
create policy brands_select_owner on public.brands for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists brands_insert_owner on public.brands;
create policy brands_insert_owner on public.brands for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists brands_update_owner on public.brands;
create policy brands_update_owner on public.brands for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists model_photos_select_owner_or_approved on public.model_photos;
create policy model_photos_select_owner_or_approved on public.model_photos for select to anon,authenticated using(exists(select 1 from public.models m where m.id=model_id and (m.status='approved' or m.user_id=(select auth.uid()))));
drop policy if exists model_photos_insert_owner on public.model_photos;
create policy model_photos_insert_owner on public.model_photos for insert to authenticated with check(exists(select 1 from public.models m where m.id=model_id and m.user_id=(select auth.uid())));
drop policy if exists model_photos_delete_owner on public.model_photos;
create policy model_photos_delete_owner on public.model_photos for delete to authenticated using(exists(select 1 from public.models m where m.id=model_id and m.user_id=(select auth.uid())));
drop policy if exists campaigns_select_open_or_brand_owner on public.campaigns;
create policy campaigns_select_open_or_brand_owner on public.campaigns for select to anon,authenticated using(status='open' or exists(select 1 from public.brands b where b.id=brand_id and b.user_id=(select auth.uid())));
drop policy if exists campaigns_insert_brand_owner on public.campaigns;
create policy campaigns_insert_brand_owner on public.campaigns for insert to authenticated with check(exists(select 1 from public.brands b where b.id=brand_id and b.user_id=(select auth.uid())));
drop policy if exists campaigns_update_brand_owner on public.campaigns;
create policy campaigns_update_brand_owner on public.campaigns for update to authenticated using(exists(select 1 from public.brands b where b.id=brand_id and b.user_id=(select auth.uid()))) with check(exists(select 1 from public.brands b where b.id=brand_id and b.user_id=(select auth.uid())));
drop policy if exists bookings_select_participants on public.bookings;
create policy bookings_select_participants on public.bookings for select to authenticated using(exists(select 1 from public.brands b where b.id=brand_id and b.user_id=(select auth.uid())) or exists(select 1 from public.models m where m.id=model_id and m.user_id=(select auth.uid())));
drop policy if exists bookings_insert_brand_owner on public.bookings;
create policy bookings_insert_brand_owner on public.bookings for insert to authenticated with check(exists(select 1 from public.brands b where b.id=brand_id and b.user_id=(select auth.uid())));
drop policy if exists matches_select_participants on public.matches;
create policy matches_select_participants on public.matches for select to authenticated using(exists(select 1 from public.models m where m.id=model_id and m.user_id=(select auth.uid())) or exists(select 1 from public.campaigns c join public.brands b on b.id=c.brand_id where c.id=campaign_id and b.user_id=(select auth.uid())));
create or replace view public.models_public with (security_invoker=true) as select id,user_id,full_name,age,gender,city,state,instagram,tiktok,bio,category,status,score,ig_followers,created_at,updated_at from public.models where status='approved';

insert into storage.buckets(id,name,public) values('model-photos','model-photos',false) on conflict(id) do nothing;
drop policy if exists model_photos_storage_insert_owner on storage.objects;
create policy model_photos_storage_insert_owner on storage.objects for insert to authenticated with check(bucket_id='model-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists model_photos_storage_select_owner on storage.objects;
create policy model_photos_storage_select_owner on storage.objects for select to authenticated using(bucket_id='model-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists model_photos_storage_delete_owner on storage.objects;
create policy model_photos_storage_delete_owner on storage.objects for delete to authenticated using(bucket_id='model-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.chatb2k_enqueue_talent_on_signup()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_row jsonb:=to_jsonb(new); v_type text:=lower(tg_argv[0]); v_name text; v_email text; v_profile_id uuid; v_social jsonb;
begin
 if v_type not in ('model','brand') then return new; end if;
 v_name:=coalesce(nullif(v_row->>'full_name',''),nullif(v_row->>'name',''),nullif(v_row->>'display_name',''),'New talent');
 select u.email into v_email from auth.users u where u.id=new.user_id;
 select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('platform',s.platform,'handle',nullif(s.handle,''),'url',nullif(s.url,''),'verification_status','unverified'))),'[]'::jsonb)
 into v_social from (values
 ('Instagram',coalesce(v_row->>'instagram',''),coalesce(v_row->>'instagram_url','')),('TikTok',coalesce(v_row->>'tiktok',''),coalesce(v_row->>'tiktok_url','')),
 ('YouTube',coalesce(v_row->>'youtube',''),coalesce(v_row->>'youtube_url','')),('Facebook',coalesce(v_row->>'facebook',''),coalesce(v_row->>'facebook_url','')),
 ('Pinterest',coalesce(v_row->>'pinterest',''),coalesce(v_row->>'pinterest_url','')),('X',coalesce(v_row->>'x',''),coalesce(v_row->>'x_url','')),
 ('LinkedIn',coalesce(v_row->>'linkedin',''),coalesce(v_row->>'linkedin_url','')),('Google',coalesce(v_row->>'google',''),coalesce(v_row->>'google_url','')),
 ('Portfolio','',coalesce(v_row->>'portfolio_url',''))) s(platform,handle,url) where nullif(s.handle,'') is not null or nullif(s.url,'') is not null;
 insert into public.chatb2k_talent_profiles(user_id,profile_type,source_table,source_id,display_name,email,phone,preferences,career_choices,goals,portfolio,social_profiles,consent,onboarding_status)
 values(new.user_id,v_type,tg_table_name,new.id,v_name,v_email,nullif(v_row->>'phone',''),
 jsonb_strip_nulls(jsonb_build_object('city',v_row->>'city','state',v_row->>'state','country',v_row->>'country','industry',v_row->>'industry','timezone',v_row->>'timezone','preferred_language',v_row->>'preferred_language')),
 case when jsonb_typeof(v_row->'career_choices')='array' then v_row->'career_choices' else '[]'::jsonb end,
 case when jsonb_typeof(v_row->'goals')='array' then v_row->'goals' else '[]'::jsonb end,
 jsonb_strip_nulls(jsonb_build_object('bio',v_row->>'bio','industry',v_row->>'industry','portfolio_url',v_row->>'portfolio_url','city',v_row->>'city','state',v_row->>'state')),
 v_social,jsonb_build_object('whatsapp',false,'whatsapp_opt_in',false,'social_review',false),'received')
 on conflict(profile_type,source_id) do nothing;
 select p.id into v_profile_id from public.chatb2k_talent_profiles p where p.profile_type=v_type and p.source_id=new.id;
 if v_profile_id is not null then
  insert into public.chatb2k_talent_events(profile_id,event_type,dedupe_key,status,channel,payload)
  values(v_profile_id,'TALENT_ONBOARDING_RECEIVED','talent-welcome:'||v_type||':'||new.id::text,'queued','whatsapp_or_telegram',
  jsonb_build_object('engine','ChatB2K Autonomous Multi-Agent Core','routing_agent','ChatB2K101','target_channel','WhatsApp / Telegram Dispatch','recipient',v_name,
  'message_body','Welcome to ResoFit / ResoFlex Elite, '||v_name||'! Your onboarding profile has been received. ChatB2K is preparing a preference-led career, goal and portfolio plan. Social profile links remain unverified until independently confirmed.',
  'automated_actions',jsonb_build_array('UPSERT_SUPABASE_PROFILE','ENRICH_TALENT_PROFILE','QUEUE_PROFILE_FOLLOWUP','DISPATCH_WELCOME_MESSAGE'))) on conflict(dedupe_key) do nothing;
  insert into public.chatb2k_talent_followups(profile_id,followup_type,due_at,status,dedupe_key,payload)
  values(v_profile_id,'complete_portfolio',now()+interval '24 hours','queued','talent-followup-24h:'||v_type||':'||new.id::text,jsonb_build_object('profile_type',v_type,'source_id',new.id,'recipient',v_name)) on conflict(dedupe_key) do nothing;
 end if;
 return new;
end; $$;
drop trigger if exists chatb2k_model_signup_enqueue on public.models;
create trigger chatb2k_model_signup_enqueue after insert on public.models for each row execute function public.chatb2k_enqueue_talent_on_signup('model');
drop trigger if exists chatb2k_brand_signup_enqueue on public.brands;
create trigger chatb2k_brand_signup_enqueue after insert on public.brands for each row execute function public.chatb2k_enqueue_talent_on_signup('brand');
