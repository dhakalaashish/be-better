-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goals TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  importance INTEGER NOT NULL CHECK (importance >= 1 AND importance <= 5),
  type TEXT NOT NULL CHECK (type IN ('good', 'neutral', 'bad')),
  goal TEXT DEFAULT 'N/A',
  add_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS policies for events
CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id);

-- Create logs table
CREATE TABLE public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration INTEGER,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5),
  sub_category TEXT,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for logs
CREATE POLICY "Users can view own logs"
  ON public.logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = logs.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own logs"
  ON public.logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = logs.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own logs"
  ON public.logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = logs.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own logs"
  ON public.logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = logs.event_id 
      AND events.user_id = auth.uid()
    )
  );

-- Create trigger function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User')
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better query performance
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_type ON public.events(type);
CREATE INDEX idx_logs_event_id ON public.logs(event_id);
CREATE INDEX idx_logs_start_date ON public.logs(start_date DESC);