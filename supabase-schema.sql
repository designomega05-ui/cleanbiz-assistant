-- CleanBiz Assistant Database Schema

-- Service types (configurable for industry customization)
CREATE TABLE IF NOT EXISTS service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'Sparkles',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Qualification questions (configurable per service type)
CREATE TABLE IF NOT EXISTS qualification_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID REFERENCES service_types(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT DEFAULT 'text', -- text, select, number, date, boolean
  options JSONB DEFAULT NULL, -- for select type
  required BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  service_type_id UUID REFERENCES service_types(id),
  property_address TEXT,
  property_details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'new' CHECK (status IN ('new','qualified','booked','completed','lost')),
  lead_score TEXT DEFAULT 'warm' CHECK (lead_score IN ('hot','warm','cold')),
  source TEXT DEFAULT 'chat', -- chat, form, missed_call, sms
  notes TEXT,
  qualification_answers JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations / Chat Messages
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('bot','user','system')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  google_event_id TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Follow-up templates
CREATE TABLE IF NOT EXISTS follow_up_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('initial_no_response','day1_nudge','day3_incentive','review_request')),
  delay_minutes INT NOT NULL,
  subject TEXT,
  message_template TEXT NOT NULL,
  channel TEXT DEFAULT 'sms' CHECK (channel IN ('sms','email','both')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Automated follow-ups log
CREATE TABLE IF NOT EXISTS follow_up_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  template_id UUID REFERENCES follow_up_templates(id),
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered BOOLEAN DEFAULT false
);

-- Business / Owner settings
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_area TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  available_hours JSONB DEFAULT '{}',
  twilio_phone TEXT,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  google_calendar_connected BOOLEAN DEFAULT false,
  google_refresh_token TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  chat_widget_config JSONB DEFAULT '{
    "primary_color": "#6366f1",
    "welcome_message": "Hi! Need a cleaning quote? I can help you book in minutes!",
    "position": "bottom-right",
    "is_active": true
  }'::jsonb,
  review_links JSONB DEFAULT '{"google": "", "yelp": ""}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Missed calls log
CREATE TABLE IF NOT EXISTS missed_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  caller_number TEXT NOT NULL,
  call_time TIMESTAMPTZ DEFAULT now(),
  lead_id UUID REFERENCES leads(id),
  sms_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead_id ON bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_follow_up_logs_lead_id ON follow_up_logs(lead_id);

-- Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can only access their own business" ON businesses
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can only access their own leads" ON leads
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Users can access conversations from their leads" ON conversations
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));

CREATE POLICY "Users can access their own bookings" ON bookings
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));

-- Seed default service types
INSERT INTO service_types (name, label, icon) VALUES
  ('regular_cleaning', 'Regular Cleaning', 'RefreshCw'),
  ('deep_clean', 'Deep Clean', 'SprayCan'),
  ('move_in_out', 'Move-In / Move-Out', 'Truck'),
  ('office_cleaning', 'Office / Commercial', 'Building2')
ON CONFLICT (name) DO NOTHING;

-- Seed qualification questions
INSERT INTO qualification_questions (service_type_id, question, field_key, field_type, options, required, display_order)
SELECT st.id, q.question, q.field_key, q.field_type, q.options::jsonb, q.required, q.display_order
FROM (VALUES
  ('regular_cleaning', 'How often would you like cleaning?', 'frequency', 'select', '["Weekly","Biweekly","Monthly","One-time"]', true, 1),
  ('regular_cleaning', 'How many bedrooms?', 'bedrooms', 'number', NULL, true, 2),
  ('regular_cleaning', 'Approximate square footage?', 'sq_ft', 'number', NULL, false, 3),
  ('deep_clean', 'When was the last time you had a deep clean?', 'last_cleaned', 'select', '["Within 3 months","3-6 months ago","6-12 months ago","Over a year ago","Never"]', true, 1),
  ('deep_clean', 'Any specific areas of concern?', 'concern_areas', 'text', NULL, false, 2),
  ('move_in_out', 'What date do you need cleaning?', 'move_date', 'date', NULL, true, 1),
  ('move_in_out', 'Is the property empty or furnished?', 'property_state', 'select', '["Empty","Furnished","Partially furnished"]', true, 2),
  ('office_cleaning', 'Approximate office square footage?', 'sq_ft', 'number', NULL, true, 1),
  ('office_cleaning', 'Do you need after-hours access?', 'after_hours', 'boolean', NULL, true, 2)
) AS q(service_name, question, field_key, field_type, options, required, display_order)
JOIN service_types st ON st.name = q.service_name
WHERE NOT EXISTS (SELECT 1 FROM qualification_questions);