
-- Roles enum + table (separate, RLS-safe pattern)
CREATE TYPE public.app_role AS ENUM ('model', 'brand', 'admin');
CREATE TYPE public.model_category AS ENUM ('Platinum', 'Commercial', 'Influencer', 'Training');
CREATE TYPE public.model_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.campaign_status AS ENUM ('draft', 'open', 'closed', 'completed');
CREATE TYPE public.booking_status AS ENUM ('pending', 'paid', 'accepted', 'completed', 'cancelled');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own role on signup"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role IN ('model', 'brand'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by self or admin"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Models
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INT,
  gender TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  instagram TEXT,
  tiktok TEXT,
  bio TEXT,
  score INT,
  category public.model_category,
  scored_at TIMESTAMPTZ,
  ai_reasoning TEXT,
  ai_strengths TEXT[],
  ai_improvements TEXT[],
  ig_followers INT,
  status public.model_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER models_updated_at BEFORE UPDATE ON public.models
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Approved models viewable by authenticated users"
ON public.models FOR SELECT
TO authenticated
USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Models manage own row"
ON public.models FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'model'));

CREATE POLICY "Models update own row"
ON public.models FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can update any model"
ON public.models FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Model photos
CREATE TABLE public.model_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.model_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos viewable by authenticated"
ON public.model_photos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can manage own photos"
ON public.model_photos FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.models m WHERE m.id = model_id AND m.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.models m WHERE m.id = model_id AND m.user_id = auth.uid()));

-- Brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  city TEXT,
  logo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER brands_updated_at BEFORE UPDATE ON public.brands
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Brands viewable by authenticated"
ON public.brands FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Brands insert own"
ON public.brands FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'brand'));

CREATE POLICY "Brands update own"
ON public.brands FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  brief TEXT,
  category public.model_category,
  city TEXT,
  state TEXT,
  budget_ngn INT NOT NULL DEFAULT 0,
  shoot_date DATE,
  slots INT NOT NULL DEFAULT 1,
  status public.campaign_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Campaigns viewable by brand owner or admin"
ON public.campaigns FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Brand owner manages campaigns"
ON public.campaigns FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid()));

-- Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  total_score NUMERIC NOT NULL DEFAULT 0,
  breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, model_id)
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches visible to brand owner or matched model or admin"
ON public.matches FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c JOIN public.brands b ON b.id = c.brand_id
    WHERE c.id = campaign_id AND b.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.models m WHERE m.id = model_id AND m.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  amount_ngn INT NOT NULL,
  commission_ngn INT NOT NULL DEFAULT 0,
  status public.booking_status NOT NULL DEFAULT 'pending',
  paystack_ref TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Bookings visible to brand owner, model, or admin"
ON public.bookings FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.models m WHERE m.id = model_id AND m.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Brand owner creates bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('model-photos', 'model-photos', false);

CREATE POLICY "Auth users read model photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'model-photos');

CREATE POLICY "Owners upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'model-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'model-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
