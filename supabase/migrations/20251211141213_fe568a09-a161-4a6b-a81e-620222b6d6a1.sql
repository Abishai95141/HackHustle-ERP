-- Create enum types
CREATE TYPE public.app_role AS ENUM ('super_admin', 'participant', 'volunteer', 'judge');
CREATE TYPE public.scan_type AS ENUM ('entry', 'exit');
CREATE TYPE public.query_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE public.query_category AS ENUM ('wifi', 'bug', 'mentor_help', 'logistics', 'other');

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  team_code TEXT UNIQUE NOT NULL,
  table_number TEXT,
  total_score DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'participant',
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  qr_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  is_inside_venue BOOLEAN DEFAULT false,
  last_scan_timestamp TIMESTAMP WITH TIME ZONE,
  tshirt_size TEXT,
  dietary_restrictions TEXT,
  checked_in_day1 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create attendance_logs table
CREATE TABLE public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  scan_type scan_type NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned_by_staff_id UUID REFERENCES public.profiles(id)
);

-- Create meal_sessions table
CREATE TABLE public.meal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_type TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create meal_transactions table
CREATE TABLE public.meal_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  meal_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned_by_staff_id UUID REFERENCES public.profiles(id),
  UNIQUE (user_id, meal_type)
);

-- Create judge_assignments table
CREATE TABLE public.judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  round_name TEXT NOT NULL DEFAULT 'Round 1',
  UNIQUE (judge_id, team_id, round_name)
);

-- Create judge_scores table
CREATE TABLE public.judge_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  round_name TEXT NOT NULL DEFAULT 'Round 1',
  score_innovation INTEGER CHECK (score_innovation >= 0 AND score_innovation <= 10),
  score_feasibility INTEGER CHECK (score_feasibility >= 0 AND score_feasibility <= 10),
  score_code_quality INTEGER CHECK (score_code_quality >= 0 AND score_code_quality <= 10),
  score_presentation INTEGER CHECK (score_presentation >= 0 AND score_presentation <= 10),
  total_score INTEGER GENERATED ALWAYS AS (COALESCE(score_innovation, 0) + COALESCE(score_feasibility, 0) + COALESCE(score_code_quality, 0) + COALESCE(score_presentation, 0)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (judge_id, team_id, round_name)
);

-- Create queries table
CREATE TABLE public.queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  category query_category NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  status query_status NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for teams
CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Admins can manage teams" ON public.teams FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins and volunteers can view all profiles" ON public.profiles FOR SELECT 
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'volunteer') OR public.has_role(auth.uid(), 'judge'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for attendance_logs
CREATE POLICY "Admins and volunteers can view attendance" ON public.attendance_logs FOR SELECT 
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'volunteer'));
CREATE POLICY "Volunteers can create attendance logs" ON public.attendance_logs FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'volunteer'));

-- RLS Policies for meal_sessions
CREATE POLICY "Anyone can view meal sessions" ON public.meal_sessions FOR SELECT USING (true);
CREATE POLICY "Admins can manage meal sessions" ON public.meal_sessions FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for meal_transactions
CREATE POLICY "Admins and volunteers can view meal transactions" ON public.meal_transactions FOR SELECT 
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'volunteer'));
CREATE POLICY "Volunteers can create meal transactions" ON public.meal_transactions FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'volunteer'));

-- RLS Policies for judge_assignments
CREATE POLICY "Judges can view their assignments" ON public.judge_assignments FOR SELECT USING (judge_id = auth.uid());
CREATE POLICY "Admins can manage judge assignments" ON public.judge_assignments FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for judge_scores
CREATE POLICY "Judges can view their scores" ON public.judge_scores FOR SELECT USING (judge_id = auth.uid());
CREATE POLICY "Judges can manage their scores" ON public.judge_scores FOR INSERT WITH CHECK (judge_id = auth.uid());
CREATE POLICY "Judges can update their scores" ON public.judge_scores FOR UPDATE USING (judge_id = auth.uid());
CREATE POLICY "Admins can view all scores" ON public.judge_scores FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage all scores" ON public.judge_scores FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for queries
CREATE POLICY "Users can view own queries" ON public.queries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create queries" ON public.queries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all queries" ON public.queries FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage all queries" ON public.queries FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, qr_token)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    gen_random_uuid()::text
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'participant');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update team total scores
CREATE OR REPLACE FUNCTION public.update_team_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.teams
  SET total_score = (
    SELECT COALESCE(AVG(total_score), 0)
    FROM public.judge_scores
    WHERE team_id = COALESCE(NEW.team_id, OLD.team_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.team_id, OLD.team_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for updating team scores
CREATE TRIGGER on_judge_score_change
  AFTER INSERT OR UPDATE OR DELETE ON public.judge_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_team_score();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.judge_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;