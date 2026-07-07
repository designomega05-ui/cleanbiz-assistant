import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, X, Sparkles } from 'lucide-react';

export default function WidgetChat() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('businessId');

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', email: '', service: '' });
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (businessId) loadConfig();
    else setLoading(false);
  }, [businessId]);

  async function loadConfig() {
    const { data, error } = await supabase
      .from('businesses')
      .select('name, chat_widget_config, service_types(id, name, label)')
      .eq('id', businessId)
      .single();
    if (error) {
      console.error('WidgetChat: Failed to load business config:', error);
      setError('Could not load widget configuration.');
    } else if (data) {
      setConfig(data);
      setMessages([{ role: 'bot', text: data.chat_widget_config?.welcome_message || "Hi! Need a cleaning quote? I can help you book in minutes!" }]);
    }
    setLoading(false);
  }

  const primaryColor = config?.chat_widget_config?.primary_color || '#6366f1';

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
      setTimeout(() => setMessages(prev => [...prev, { role: 'bot', text: steps[step + 1].question }]), 500);
    } else {
      setSaving(true);
      try {
        let serviceTypeId = null;
        if (updatedForm.service) {
          const serviceName = steps[3].options.find(o => o.label === updatedForm.service)?.value;
          if (serviceName) {
            const { data: st } = await supabase.from('service_types').select('id').eq('name', serviceName).maybeSingle();
            if (st) serviceTypeId = st.id;
          }
        }
        const { error: insertError } = await supabase.from('leads').insert({
          business_id: businessId,
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
          console.error('WidgetChat: Insert failed:', insertError);
          setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, something went wrong. Please try again later.' }]);
        } else {
          setSaved(true);
          setTimeout(() => setMessages(prev => [...prev, { role: 'bot', text: "✅ Thanks! We'll reach out with a quote shortly." }]), 500);
        }
      } catch (err) {
        console.error('WidgetChat: Error:', err);
        setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, something went wrong.' }]);
      } finally {
        setSaving(false);
      }
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', color: '#6b7280', fontSize: '14px' }}>Loading...</div>;
  }
  if (error) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', color: '#ef4444', fontSize: '14px', padding: '20px', textAlign: 'center' }}>{error}</div>;
  }
  if (!businessId) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', color: '#6b7280', fontSize: '14px' }}>Missing business configuration.</div>;
  }

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999999, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {!open ? (
        <button onClick={() => setOpen(true)}
          style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: primaryColor, color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={e => e.target.style.transform = 'scale(1)'}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
      ) : (
        <div style={{ width: '300px', maxHeight: '400px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ backgroundColor: primaryColor, color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>CleanBiz</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px', maxHeight: '260px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.4, backgroundColor: msg.role === 'user' ? primaryColor : '#f3f4f6', color: msg.role === 'user' ? 'white' : '#1f2937' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {saving && <div style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>Saving...</div>}
            {saved && <div style={{ textAlign: 'center', fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>✓ Lead saved!</div>}
            {step < steps.length && !saved && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {steps[step].options?.map(opt => (
                  <button key={opt.value} onClick={() => handleSend(opt.label)}
                    style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', background: 'white', color: '#374151', cursor: 'pointer' }}>
                    {opt.label}
                  </button>
                ))}
                {!steps[step].options && (
                  <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '4px' }}>
                    <input ref={inputRef}
                      onKeyDown={e => { if (e.key === 'Enter') { handleSend(e.target.value); e.target.value = ''; } }}
                      placeholder="Type your answer..."
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', outline: 'none' }} />
                    <button onClick={() => { const el = inputRef.current; if (el) { handleSend(el.value); el.value = ''; } }}
                      style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: primaryColor, color: 'white', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
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
