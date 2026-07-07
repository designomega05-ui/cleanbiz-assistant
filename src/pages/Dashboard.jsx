import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Users, Phone, Calendar, TrendingUp,
  ChevronRight, MessageSquare, Sparkles, Plus, X
} from 'lucide-react';

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [business, setBusiness] = useState(null);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, new: 0, qualified: 0, booked: 0 });
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', user.id).maybeSingle();
    if (biz) setBusiness(biz);
    const { data: leadsData } = await supabase
      .from('leads').select('*, service_types:service_type_id(name, label)')
      .eq('business_id', biz?.id)
      .order('created_at', { ascending: false });
    if (leadsData) {
      setLeads(leadsData);
      setStats({
        total: leadsData.length,
        new: leadsData.filter(l => l.status === 'new').length,
        qualified: leadsData.filter(l => l.status === 'qualified').length,
        booked: leadsData.filter(l => l.status === 'booked').length,
      });
    }
  }

  async function createLead(e) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const biz = business || (await supabase.from('businesses').select('id').eq('owner_id', user.id).single()).data;
    if (!biz?.id) return;
    await supabase.from('leads').insert({
      business_id: biz.id,
      name: newLead.name,
      phone: newLead.phone,
      email: newLead.email,
      notes: newLead.notes,
      source: 'manual',
      status: 'new'
    });
    setNewLead({ name: '', phone: '', email: '', notes: '' });
    setShowNewLead(false);
    loadData();
  }

  const filteredLeads = filter === 'all' ? leads : leads.filter(l => l.status === filter);
  const statusColors = {
    new: 'bg-blue-100 text-blue-700', qualified: 'bg-yellow-100 text-yellow-700',
    booked: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-700', lost: 'bg-red-100 text-red-700'
  };
  const scoreBadges = { hot: 'bg-red-100 text-red-700', warm: 'bg-yellow-100 text-yellow-700', cold: 'bg-gray-100 text-gray-500' };

  if (!business) {
    return (
      <div className="text-center py-20">
        <Sparkles className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to CleanBiz Assistant!</h2>
        <p className="text-gray-500 mb-6">Let's get your business set up in just a few steps.</p>
        <Link to="/setup" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">
          Start Setup <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 mt-1">Your cleaning business command center</p>
        </div>
        <button onClick={() => setShowNewLead(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New Lead
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Leads" value={stats.total} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={MessageSquare} label="New" value={stats.new} color="text-yellow-600" bg="bg-yellow-50" />
        <StatCard icon={TrendingUp} label="Qualified" value={stats.qualified} color="text-indigo-600" bg="bg-indigo-50" />
        <StatCard icon={Calendar} label="Booked" value={stats.booked} color="text-green-600" bg="bg-green-50" />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['all', 'new', 'qualified', 'booked', 'completed', 'lost'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Service</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No leads yet. Click "New Lead" to add one!</p>
                </td></tr>
              ) : filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{lead.phone || lead.email}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-gray-600">{lead.service_types?.label || lead.service_type_id?.substring(0, 8) || '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || statusColors.new}`}>{lead.status}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${scoreBadges[lead.lead_score] || scoreBadges.warm}`}>{lead.lead_score}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm text-gray-500">{new Date(lead.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/leads/${lead.id}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      View <ChevronRight className="h-3 w-3 ml-1" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Lead Modal */}
      {showNewLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">New Lead</h3>
              <button onClick={() => setShowNewLead(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={createLead} className="space-y-3">
              <input value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} placeholder="Full name *" required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <input value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} placeholder="Phone number"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <input value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} placeholder="Email"
                type="email" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <textarea value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} placeholder="Notes or service requested"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" rows={2} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewLead(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}><Icon className={`h-5 w-5 ${color}`} /></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
