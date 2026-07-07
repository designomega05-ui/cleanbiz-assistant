import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Send, X, Sparkles } from 'lucide-react';

export default function ChatWidget() {
  const [business, setBusiness] = useState(null);
  const [embedCode, setEmbedCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusiness();
  }, []);

  async function loadBusiness() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single();
    if (data) {
      setBusiness(data);
      generateEmbedCode(data);
    }
    setLoading(false);
  }

  function generateEmbedCode(biz) {
    const baseUrl = window.location.origin;
    const code = `<!-- CleanBiz Assistant Widget -->
<script>
(function() {
  var d = document;
  var s = d.createElement('script');
  s.src = '${baseUrl}/widget.js';
  s.async = true;
  s.dataset.businessId = '${biz.id}';
  s.dataset.primaryColor = '${biz.chat_widget_config?.primary_color || "#6366f1"}';
  s.dataset.welcomeMessage = '${(biz.chat_widget_config?.welcome_message || "Hi! Need a cleaning quote?").replace(/'/g, "\\'")}';
  s.dataset.position = '${biz.chat_widget_config?.position || "bottom-right"}';
  var firstScript = d.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(s, firstScript);
})();
</script>
<!-- End CleanBiz Assistant Widget -->`;
    setEmbedCode(code);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(embedCode);
      alert('Widget code copied! Paste it just before the </body> tag on your website.');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      alert('Could not copy automatically. Please select the code and copy manually (Ctrl+C / Cmd+C).');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Chat Widget</h1>
        <button onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100">
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-2">Embed Code</h2>
        <p className="text-sm text-gray-500 mb-4">
          Copy and paste this code just before the <code className="bg-gray-100 px-1 rounded">{`</body>`}</code> tag on your website.
        </p>
        {loading ? (
          <div className="w-full px-4 py-8 bg-gray-50 border border-gray-200 rounded-xl text-center text-sm text-gray-400">Loading...</div>
        ) : !embedCode ? (
          <div className="w-full px-4 py-8 bg-yellow-50 border border-yellow-200 rounded-xl text-center text-sm text-yellow-800">
            Complete the <strong>Setup Wizard</strong> first to create your business profile. Then the embed code will appear here.
          </div>
        ) : (
          <>
            <textarea value={embedCode} readOnly
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700"
              rows={8} />
            <button onClick={copyCode}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
              Copy to Clipboard
            </button>
          </>
        )}
      </div>

      {showPreview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative min-h-[400px]">
          <h2 className="font-semibold text-gray-900 mb-4">Widget Preview</h2>
          <p className="text-xs text-gray-400 mb-3">Test the lead capture flow below. When you complete a conversation, the lead will be saved to your Supabase "leads" table.</p>
          <div className="bg-gray-100 rounded-lg p-4 h-[380px] relative overflow-hidden">
            <WidgetPreview business={business} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-2">How It Works</h2>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>Copy the embed code above</li>
          <li>Paste it on your website just before the closing <code className="bg-gray-100 px-1 rounded">{`</body>`}</code> tag</li>
          <li>A chat bubble appears on your site — visitors can ask about cleaning services</li>
          <li>Leads are captured automatically in your CleanBiz dashboard</li>
          <li>You get notified and can follow up from your phone</li>
        </ol>
        <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
          <strong>Note:</strong> The embed script (<code className="bg-blue-100 px-1 rounded">widget.js</code>) needs to be built and deployed separately.
          For now, you can use the preview button above to test lead capture directly.
        </div>
      </div>
    </div>
  );
}

function WidgetPreview({ business }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: business?.chat_widget_config?.welcome_message || "Hi! Need a cleaning quote? I can help you book in minutes!" }
  ]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', email: '', service: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);

  const steps = [
    { question: "Great! Let's get started. What's your name?", field: 'name' },
    { question: "And your phone number?", field: 'phone' },
    { question: "Email?", field: 'email' },
    { question: "What service do you need?", field: 'service', options: [
      { label: '🧹 Regular Cleaning', value: 'regular_cleaning' },
      { label: '🧼 Deep Clean', value: 'deep_clean' },
      { label: '📦 Move-In/Out', value: 'move_in_out' },
      { label: '🏢 Office Cleaning', value: 'office_cleaning' },
    ]},
  ];

  async function handleSend(value) {
    if (!value?.trim()) return;

    const newMessages = [...messages, { role: 'user', text: value }];
    setMessages(newMessages);
    const updatedForm = { ...form, [steps[step].field]: value };
    setForm(updatedForm);

    if (step < steps.length - 1) {
      setStep(step + 1);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: steps[step + 1].question }]);
      }, 500);
    } else {
      setSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('ChatWidget: No authenticated user found');
          setMessages(prev => [...prev, { role: 'bot', text: "⚠️ Error: You must be logged in to save leads." }]);
          setSaving(false);
          return;
        }

        let bizId = business?.id;
        if (!bizId) {
          const { data: biz, error: bizErr } = await supabase
            .from('businesses').select('id').eq('owner_id', user.id).single();
          if (bizErr || !biz) {
            console.error('ChatWidget: No business found:', bizErr);
            setMessages(prev => [...prev, { role: 'bot', text: "⚠️ Error: Complete the Setup Wizard first." }]);
            setSaving(false);
            return;
          }
          bizId = biz.id;
        }

        let serviceTypeId = null;
        if (updatedForm.service) {
          const serviceName = steps[3].options.find(o => o.label === updatedForm.service)?.value;
          if (serviceName) {
            const { data: st } = await supabase
              .from('service_types').select('id').eq('name', serviceName).single();
            if (st) serviceTypeId = st.id;
          }
        }

        const { error: insertError } = await supabase.from('leads').insert({
          business_id: bizId,
          name: updatedForm.name,
          phone: updatedForm.phone,
          email: updatedForm.email,
          service_type_id: serviceTypeId,
          source: 'chat',
          status: 'new',
          lead_score: 'warm',
          qualification_answers: { service: updatedForm.service }
        });

        if (insertError) {
          console.error('ChatWidget: Lead insert failed:', insertError);
          setMessages(prev => [...prev, { role: 'bot', text: `⚠️ Error: ${insertError.message}` }]);
        } else {
          console.log('ChatWidget: Lead saved successfully:', updatedForm.name);
          setSaved(true);
          setTimeout(() => {
            setMessages(prev => [...prev, { role: 'bot', text: "✅ Thanks! We'll reach out with a quote shortly." }]);
          }, 500);
        }
      } catch (err) {
        console.error('ChatWidget: Unexpected error:', err);
        setMessages(prev => [...prev, { role: 'bot', text: "⚠️ An unexpected error occurred." }]);
      } finally {
        setSaving(false);
      }
    }
  }

  const primaryColor = business?.chat_widget_config?.primary_color || '#6366f1';

  return (
    <div className="h-full flex flex-col">
      {!open && (
        <button onClick={() => setOpen(true)}
          className="absolute bottom-4 right-4 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105"
          style={{ backgroundColor: primaryColor }}>
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="absolute bottom-4 right-4 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col" style={{ maxHeight: '340px' }}>
          <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl text-white" style={{ backgroundColor: primaryColor }}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">CleanBiz</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[180px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-sm ${
                  msg.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-800'
                }`} style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}>
                  {msg.text}
                </div>
              </div>
            ))}
            {saving && <div className="flex justify-center"><div className="text-xs text-gray-400 animate-pulse">Saving lead...</div></div>}
            {saved && <div className="flex justify-center"><div className="text-xs text-green-600 font-medium">✓ Lead saved!</div></div>}
            
            {step < steps.length && !saved && (
              <div className="flex gap-1.5 flex-wrap mt-1">
                {steps[step].options?.map(opt => (
                  <button key={opt.value} onClick={() => handleSend(opt.label)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">
                    {opt.label}
                  </button>
                ))}
                {!steps[step].options && (
                  <div className="flex gap-1 mt-1 w-full">
                    <input ref={inputRef}
                      onKeyDown={e => { if(e.key === 'Enter') handleSend(e.target.value); }}
                      placeholder="Type your answer..."
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-400" />
                    <button onClick={() => handleSend(inputRef.current?.value)}
                      className="p-1.5 rounded-lg" style={{ backgroundColor: primaryColor }}>
                      <Send className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
