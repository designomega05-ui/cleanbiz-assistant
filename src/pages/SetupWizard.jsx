import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Save, ChevronRight, Building2, MapPin, Phone, Clock, MessageSquare, Star } from 'lucide-react';

export default function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [business, setBusiness] = useState({
    name: '',
    phone: '',
    email: '',
    service_area: '',
    website: '',
    timezone: 'America/New_York',
    chat_widget_config: {
      primary_color: '#6366f1',
      welcome_message: "Hi! Need a cleaning quote? I can help you book in minutes!",
      position: 'bottom-right',
      is_active: true
    },
    review_links: { google: '', yelp: '' }
  });

  useEffect(() => {
    loadBusiness();
  }, []);

  async function loadBusiness() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single();
    if (data) {
      setBusiness(data);
      setStep(5); // Skip to done if already set up
    }
  }

  async function saveAndNext() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('businesses').upsert({
      owner_id: user.id,
      ...business,
      updated_at: new Date().toISOString()
    });

    if (!error && step < 5) {
      setStep(step + 1);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{s}</div>
              {s < 5 && <div className={`h-1 w-12 sm:w-20 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Business Info</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">Tell us about your cleaning business.</p>
              <Input label="Business Name" value={business.name} onChange={v => setBusiness({...business, name: v})} placeholder="e.g. Sparkle Clean Co." />
              <Input label="Phone Number" value={business.phone} onChange={v => setBusiness({...business, phone: v})} placeholder="+1 (555) 000-0000" type="tel" />
              <Input label="Email" value={business.email} onChange={v => setBusiness({...business, email: v})} placeholder="hello@sparkleclean.com" type="email" />
              <Input label="Website" value={business.website} onChange={v => setBusiness({...business, website: v})} placeholder="https://sparkleclean.com" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Service Area</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">Where do you offer cleaning services?</p>
              <Input label="Service Area" value={business.service_area} onChange={v => setBusiness({...business, service_area: v})} placeholder="e.g. Austin, TX and surrounding areas" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select value={business.timezone} onChange={e => setBusiness({...business, timezone: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="America/New_York">Eastern Time (US)</option>
                  <option value="America/Chicago">Central Time (US)</option>
                  <option value="America/Denver">Mountain Time (US)</option>
                  <option value="America/Los_Angeles">Pacific Time (US)</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Chat Widget</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">Customize how the chat widget looks and sounds.</p>
              <Input label="Welcome Message" value={business.chat_widget_config.welcome_message} onChange={v => setBusiness({...business, chat_widget_config: {...business.chat_widget_config, welcome_message: v}})} placeholder="Hi! Need a cleaning quote?" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={business.chat_widget_config.primary_color} onChange={e => setBusiness({...business, chat_widget_config: {...business.chat_widget_config, primary_color: e.target.value}})} className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer" />
                  <span className="text-sm text-gray-500">{business.chat_widget_config.primary_color}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <select value={business.chat_widget_config.position} onChange={e => setBusiness({...business, chat_widget_config: {...business.chat_widget_config, position: e.target.value}})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Star className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Review Links</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">We'll ask happy customers for reviews. Add your profiles.</p>
              <Input label="Google Reviews URL" value={business.review_links.google} onChange={v => setBusiness({...business, review_links: {...business.review_links, google: v}})} placeholder="https://g.page/r/..." />
              <Input label="Yelp Page URL" value={business.review_links.yelp} onChange={v => setBusiness({...business, review_links: {...business.review_links, yelp: v}})} placeholder="https://yelp.com/biz/..." />
            </div>
          )}

          {step === 5 && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-green-100 mx-auto">
                <Building2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">You're All Set!</h2>
              <p className="text-gray-500">Your CleanBiz Assistant is ready. Start capturing leads and growing your business.</p>
              <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                Go to Dashboard <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step < 5 && (
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                  Back
                </button>
              )}
              <button onClick={saveAndNext} disabled={loading} className="ml-auto inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {loading ? 'Saving...' : step === 4 ? 'Finish' : 'Continue'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
      />
    </div>
  );
}