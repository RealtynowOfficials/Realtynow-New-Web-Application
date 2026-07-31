import React, { useState } from 'react';
import { useLanguageContext } from '../../lib/i18n/language-context';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
} from 'lucide-react';

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  customerName: string;
  agentName?: string;
  locality?: string;
  type: 'visit' | 'meeting' | 'followup' | 'call';
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
}

interface EnterpriseSchedulerProps {
  events: CalendarEventItem[];
  onAddAppointment?: () => void;
}

export function EnterpriseScheduler({ events, onAddAppointment }: EnterpriseSchedulerProps) {
  const { t } = useLanguageContext();
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const filteredEvents = events.filter((e) => viewMode === 'agenda' || e.date === selectedDate);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-md p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Property Visits & Appointment Scheduler</h2>
            <p className="text-xs text-slate-500">Manage site visits, customer follow-ups, and agent calendars.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Selected Day
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'agenda' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Full Agenda
            </button>
          </div>

          {/* Date Picker Input */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-red-600"
          />

          {onAddAppointment && (
            <button
              type="button"
              onClick={onAddAppointment}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No appointments scheduled for {selectedDate}.</div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-4 rounded-2xl border border-slate-100 hover:border-red-200 bg-slate-50/50 hover:bg-red-50/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    evt.type === 'visit'
                      ? 'bg-amber-100 text-amber-700'
                      : evt.type === 'meeting'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{evt.title}</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-red-500" /> {evt.time} ({evt.date})
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" /> {evt.customerName}
                    </span>
                    {evt.locality && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {evt.locality}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                    evt.status === 'confirmed'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : evt.status === 'completed'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}
                >
                  {evt.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
