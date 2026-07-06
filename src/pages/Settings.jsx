import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Clock, MessageSquare, Star, Phone, Zap, Smartphone } from 'lucide-react';

export default function Settings() {
  const [business, setBusiness] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadBusiness();
  }, []);

  async function loadBusiness() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single();
    if (data) setBusiness(data);
  }

  async function saveSettings() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('businesses').upsert({
      owner_id: user.id,
      ...business,
      updated_at: new Date().toISOString()
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!business) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const updateConfig = (key, val) => setBusiness({
    ...business,
    chat_widget_config: { ...business.chat_widget_config, [key]: val }
  });

  const updateReviewLinks = (key, val) => setBusiness({
    ...business,
    review_links: { ...business.review_links, [key]: val }
  });

  const updateHours = (day, open, close) => setBusiness({
    ...business,
    available_hours: {
      ...business.available_hours,
      [day]: { open, close }
    }
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Business Info */}
      <Section title="Business Info" icon={Phone}>
        <Input label="Business Name" value={business.name} onChange={v => setBusiness({...business, name: v})} />
        <Input label="Phone" value={business.phone} onChange={v => setBusiness({...business, phone: v})} />
        <Input label="Email" value={business.email} onChange={v => setBusiness({...business, email: v})} />
        <Input label="Service Area" value={business.service_area} onChange={v => setBusiness({...business, service_area: v})} />
      </Section>

      {/* Available Hours */}
      <Section title="Available Hours" icon={Clock}>
        <p className="text-sm text-gray-500 mb-3">Set your weekly availability for booking appointments.</p>
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
          const hours = business.available_hours?.[day] || {};
          return (
            <div key={day} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="w-24 text-sm font-medium text-gray-700">{day.substring(0, 3)}</span>
              <input
                type="time"
                value={hours.open || '09:00'}
                onChange={e => updateHours(day, e.target.value, hours.close || '17:00')}
                className="px-2 py-1 border border-gray-200 rounded-lg text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="time"
                value={hours.close || '17:00'}
                onChange={e => updateHours(day, hours.open || '09:00', e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          );
        })}
      </Section>

      {/* Chat Widget */}
      <Section title="Chat Widget" icon={MessageSquare}>
        <Input label="Welcome Message" value={business.chat_widget_config?.welcome_message} onChange={v => updateConfig('welcome_message', v)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
          <input type="color" value={business.chat_widget_config?.primary_color || '#6366f1'} onChange={e => updateConfig('primary_color', e.target.value)} className="h-10 w-20 rounded-lg border border-gray-200 cursor-pointer" />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Widget Active</label>
          <input type="checkbox" checked={business.chat_widget_config?.is_active} onChange={e => updateConfig('is_active', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
        </div>
      </Section>

      {/* Twilio Integration */}
      <Section title="Missed Call Text-Back (Twilio)" icon={Smartphone}>
        <p className="text-sm text-gray-500 mb-3">Set up Twilio to auto-text back missed calls.</p>
        <Input label="Twilio Phone Number" value={business.twilio_phone} onChange={v => setBusiness({...business, twilio_phone: v})} placeholder="+15551234567" />
        <Input label="Account SID" value={business.twilio_account_sid} onChange={v => setBusiness({...business, twilio_account_sid: v})} />
        <Input label="Auth Token" value={business.twilio_auth_token} onChange={v => setBusiness({...business, twilio_auth_token: v})} type="password" />
      </Section>

      {/* Follow-up Templates */}
      <Section title="Follow-up Messages" icon={Zap}>
        <p className="text-sm text-gray-500 mb-3">Auto-messages sent after a lead comes in.</p>
        {[
          { key: 'initial_no_response', label: '1 Hour (No Response)', default: "Hi! Thanks for reaching out. I'm out on a job right now but can help you book a cleaning online: {{booking_link}}" },
          { key: 'day1_nudge', label: '1 Day Later (Nudge)', default: "Just checking in! Ready to book your cleaning? We have availability this week. Reply or book here: {{booking_link}}" },
          { key: 'day3_incentive', label: '3 Days Later (Incentive)', default: "Still thinking about it? Here's 10% off your first clean! Book now: {{booking_link}}. Use code: FIRST10" },
        ].map(t => (
          <div key={t.key} className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.label}</label>
            <textarea
              value={business[`template_${t.key}`] || t.default}
              onChange={e => setBusiness({...business, [`template_${t.key}`]: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              rows={2}
            />
          </div>
        ))}
      </Section>

      {/* Review Links */}
      <Section title="Review Requests" icon={Star}>
        <Input label="Google Reviews URL" value={business.review_links?.google} onChange={v => updateReviewLinks('google', v)} />
        <Input label="Yelp Page URL" value={business.review_links?.yelp} onChange={v => updateReviewLinks('yelp', v)} />
      </Section>

      <div className="pb-8" />
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
        <Icon className="h-5 w-5 text-indigo-600" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} />
      ) : (
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
      )}
    </div>
  );
}