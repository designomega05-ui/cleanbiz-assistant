import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Send, X, Sparkles, ChevronDown, Calendar } from 'lucide-react';

// This component renders both the preview of the embeddable widget
// and the embed code the owner can copy

export default function ChatWidget() {
  const [business, setBusiness] = useState(null);
  const [embedCode, setEmbedCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadBusiness();
  }, []);

  async function loadBusiness() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single();
    if (data) {
      setBusiness(data);
      generateEmbedCode(data);
    }
  }

  function generateEmbedCode(biz) {
    const baseUrl = window.location.origin;
    const code = `<!-- CleanBiz Assistant Widget -->
<script>
(function() {
  var w = window;
  var d = document;
  var s = d.createElement('script');
  s.src = '${baseUrl}/widget.js';
  s.async = true;
  s.dataset.businessId = '${biz.id}';
  s.dataset.primaryColor = '${biz.chat_widget_config?.primary_color || "#6366f1"}';
  s.dataset.welcomeMessage = '${biz.chat_widget_config?.welcome_message || "Hi! Need a cleaning quote?"}';
  s.dataset.position = '${biz.chat_widget_config?.position || "bottom-right"}';
  var firstScript = d.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(s, firstScript);
})();
</script>
<!-- End CleanBiz Assistant Widget -->`;
    setEmbedCode(code);
  }

  async function copyCode() {
    await navigator.clipboard.writeText(embedCode);
    alert('Widget code copied! Paste it just before the </body> tag on your website.');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Chat Widget</h1>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-2">Embed Code</h2>
        <p className="text-sm text-gray-500 mb-4">
          Copy and paste this code just before the <code className="bg-gray-100 px-1 rounded">{`</body>`}</code> tag on your website.
        </p>
        <textarea
          value={embedCode}
          readOnly
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 focus:outline-none"
          rows={8}
        />
        <button
          onClick={copyCode}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Copy to Clipboard
        </button>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative min-h-[400px]">
          <h2 className="font-semibold text-gray-900 mb-4">Widget Preview</h2>
          <div className="bg-gray-100 rounded-lg p-4 h-[350px] relative overflow-hidden">
            <WidgetPreview business={business} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-2">How It Works</h2>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>Copy the embed code above</li>
          <li>Paste it on your website (or ask your web person to add it)</li>
          <li>A chat bubble appears on your site — visitors can ask about cleaning services</li>
          <li>Leads are captured automatically in your CleanBiz dashboard</li>
          <li>You get notified and can follow up from your phone</li>
        </ol>
      </div>
    </div>
  );
}

function WidgetPreview({ business }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: business?.chat_widget_config?.welcome_message || "Hi! Need a cleaning quote?" }
  ]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', email: '', service: '' });
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

  const handleSend = (value) => {
    if (!value?.trim()) return;
    
    const newMessages = [...messages, { role: 'user', text: value }];
    setMessages(newMessages);
    
    setForm(prev => ({ ...prev, [steps[step].field]: value }));
    
    if (step < steps.length - 1) {
      setStep(step + 1);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: steps[step + 1].question }]);
      }, 500);
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: "Thanks! We'll reach out with a quote shortly. You can also book online:" }]);
        setMessages(prev => [...prev, { role: 'bot', text: "📅 [Book a Cleaning →]" }]);
      }, 500);
    }
  };

  const primaryColor = business?.chat_widget_config?.primary_color || '#6366f1';

  return (
    <div className="h-full flex flex-col">
      {/* Chat bubble (closed state) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute bottom-4 right-4 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="absolute bottom-4 right-4 w-72u-sm-w-80 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col" style={{ maxHeight: '320px' }}>
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
                  msg.role === 'user' 
                    ? 'text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`} style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {step < steps.length && (
              <div className="flex gap-1.5 flex-wrap mt-1">
                {steps[step].options?.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSend(opt.label)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
                {!steps[step].options && (
                  <div className="flex gap-1 mt-1 w-full">
                    <input
                      ref={inputRef}
                      onKeyDown={e => { if(e.key === 'Enter') handleSend(e.target.value); }}
                      placeholder="Type your answer..."
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <button onClick={() => handleSend(inputRef.current?.value)} className="p-1.5 rounded-lg" style={{ backgroundColor: primaryColor }}>
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