import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Phone, Mail, Send, MessageSquare, Calendar, Clock, Star } from 'lucide-react';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLead();
  }, [id]);

  async function loadLead() {
    const { data } = await supabase.from('leads').select('*').eq('id', id).single();
    if (data) setLead(data);

    const { data: msgs } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: true });
    if (msgs) setConversations(msgs);

    setLoading(false);
  }

  async function updateStatus(newStatus) {
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    setLead(prev => ({ ...prev, status: newStatus }));
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await supabase.from('conversations').insert({
      lead_id: id,
      role: 'system',
      message: `📝 Note: ${newNote}`
    });
    setNewNote('');
    loadLead();
  }

  if (loading) return <div className="py-12 text-center text-gray-500">Loading...</div>;
  if (!lead) return <div className="py-12 text-center text-gray-500">Lead not found</div>;

  const statusColors = {
    new: 'bg-blue-100 text-blue-700', qualified: 'bg-yellow-100 text-yellow-700',
    booked: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-700', lost: 'bg-red-100 text-red-700'
  };
  const scoreBadges = { hot: 'bg-red-100 text-red-700', warm: 'bg-yellow-100 text-yellow-700', cold: 'bg-gray-100 text-gray-500' };

  return (
    <div>
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead info card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{lead.name || 'Unknown'}</h2>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${scoreBadges[lead.lead_score] || 'bg-gray-100 text-gray-600'}`}>
                {lead.lead_score}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              {lead.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="h-3.5 w-3.5" /> {lead.phone}</div>}
              {lead.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="h-3.5 w-3.5" /> {lead.email}</div>}
              {lead.property_address && <div className="text-gray-600 text-xs">{lead.property_address}</div>}
              <div className="flex items-center gap-2 text-gray-500 text-xs"><Clock className="h-3 w-3" /> {new Date(lead.created_at).toLocaleString()}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['new', 'qualified', 'booked', 'completed', 'lost'].map(status => (
                <button
                  key={status}
                  onClick={() => updateStatus(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    lead.status === status 
                      ? statusColors[status]
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {lead.qualification_answers && Object.keys(lead.qualification_answers).length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Qualification Answers</h3>
                <div className="space-y-1">
                  {Object.entries(lead.qualification_answers).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-gray-800 font-medium">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversation & Notes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Conversation & Notes
              </h3>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {conversations.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No conversation history yet</p>
              )}
              {conversations.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white' 
                      : msg.role === 'system'
                        ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-60 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addNote()}
                  placeholder="Add a note..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
                <button onClick={addNote} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}