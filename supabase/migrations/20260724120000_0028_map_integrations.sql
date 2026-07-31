CREATE TABLE public.map_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'openstreetmap',
  api_key text,
  map_style text,
  default_lat numeric NOT NULL DEFAULT 28.6139,
  default_lng numeric NOT NULL DEFAULT 77.2090,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Restrict access so only admins can manage this
ALTER TABLE public.map_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage map settings" ON public.map_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create edge function to serve this securely, so we don't need a public select policy

INSERT INTO public.map_settings (provider, api_key, default_lat, default_lng, is_active)
VALUES ('openstreetmap', NULL, 17.3850, 78.4867, true);