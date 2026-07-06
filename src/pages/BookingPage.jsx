import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const [business, setBusiness] = useState(null);
  const [lead, setLead] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [step, setStep] = useState('calendar'); // calendar, confirm, done
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bizId = searchParams.get('biz');
    const leadId = searchParams.get('lead');
    loadData(bizId, leadId);
  }, []);

  async function loadData(bizId, leadId) {
    if (bizId) {
      const { data } = await supabase.from('businesses').select('*').eq('id', bizId).single();
      setBusiness(data);
    }
    if (leadId) {
      const { data } = await supabase.from('leads').select('*').eq('id', leadId).single();
      setLead(data);
    }
    setLoading(false);
  }

  function getDaysInMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  }

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  }

  function getAvailableSlots() {
    const slots = [];
    const hours = business?.available_hours || {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[selectedDate?.getDay()];
    const dayHours = hours[dayName];
    if (!dayHours?.open) return slots;

    let start = parseInt(dayHours.open.split(':')[0]);
    let end = parseInt(dayHours.close.split(':')[0]);
    
    for (let h = start; h < end; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < end - 0.5) slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }

  async function confirmBooking() {
    if (!selectedDate || !selectedTime || !lead) return;
    
    const startTime = new Date(selectedDate);
    const [hours, mins] = selectedTime.split(':');
    startTime.setHours(parseInt(hours), parseInt(mins), 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 2);

    await supabase.from('bookings').insert({
      lead_id: lead.id,
      title: `Cleaning - ${lead.name}`,
      description: lead.notes || 'Cleaning appointment',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'confirmed'
    });

    await supabase.from('leads').update({ status: 'booked' }).eq('id', lead.id);
    setStep('done');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>;

  const { days, firstDay } = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-lg">
        {business && (
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900">Book {business.name}</h1>
            <p className="text-sm text-gray-500">Schedule your cleaning appointment</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {step === 'calendar' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="font-semibold text-gray-900">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 mb-6">
                {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                  const isPast = date < today;
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                  return (
                    <button
                      key={i}
                      disabled={isPast}
                      onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                      className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                        isSelected ? 'bg-indigo-600 text-white' :
                        isPast ? 'text-gray-300 cursor-not-allowed' :
                        'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Available Times
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {getAvailableSlots().map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedTime === slot 
                            ? 'bg-indigo-600 text-white' 
                            : 'border border-gray-200 text-gray-600 hover:border-indigo-300'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>

                  {selectedTime && (
                    <button
                      onClick={() => setStep('confirm')}
                      className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Continue to Confirm
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Confirm Booking</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                <p><span className="text-gray-500">Date:</span> <strong>{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong></p>
                <p><span className="text-gray-500">Time:</span> <strong>{selectedTime}</strong></p>
                {lead?.name && <p><span className="text-gray-500">Name:</span> <strong>{lead.name}</strong></p>}
                {lead?.property_address && <p><span className="text-gray-500">Address:</span> <strong>{lead.property_address}</strong></p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('calendar')} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Back
                </button>
                <button onClick={confirmBooking} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Confirm Booking
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Booking Confirmed!</h3>
              <p className="text-sm text-gray-500 mb-4">
                Your cleaning appointment is set for {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime}.
                You'll receive a reminder 24 hours before.
              </p>
              <p className="text-xs text-gray-400">Check your email/SMS for confirmation details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}