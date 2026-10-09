import { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEvents, createEvent, updateEvent, deleteEvent, setRsvp, removeRsvp } from '@/hooks/useEvents';
import type { EventWithMeta, EventCategory, RsvpStatus } from '@/lib/types';
import {
  Calendar, Plus, Loader2, MapPin, Clock, Users, X, ChevronLeft,
  ChevronRight, Check, Star, XCircle, Trash2, Edit3, Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

const categoryColors: Record<EventCategory, string> = {
  academic: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
  social: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
  sports: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
  workshop: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
  career: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400',
  other: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
};

const categoryDotColors: Record<EventCategory, string> = {
  academic: 'bg-blue-500',
  social: 'bg-purple-500',
  sports: 'bg-emerald-500',
  workshop: 'bg-amber-500',
  career: 'bg-rose-500',
  other: 'bg-slate-400',
};

const categories: { value: EventCategory; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'social', label: 'Social' },
  { value: 'sports', label: 'Sports' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'career', label: 'Career' },
  { value: 'other', label: 'Other' },
];

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type ViewMode = 'calendar' | 'list';

export default function EventsPage() {
  const { user, profile } = useAuth();
  const { events, loading } = useEvents();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editEvent, setEditEvent] = useState<EventWithMeta | null>(null);
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'all'>('all');

  const filteredEvents = useMemo(() => {
    if (filterCategory === 'all') return events;
    return events.filter((e) => e.category === filterCategory);
  }, [events, filterCategory]);

  const selectedEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) ?? null : null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Events</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Campus events and activities</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 active:scale-95 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create event
        </button>
      </div>

      {/* View toggle + filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              viewMode === 'calendar' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              viewMode === 'list' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            List
          </button>
        </div>

        <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1 ml-auto">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterCategory === 'all' ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                filterCategory === c.value ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : filteredEvents.length === 0 && !selectedEvent ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">No events found</p>
          <p className="text-sm text-slate-400 mt-1">Create one to get started!</p>
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView events={filteredEvents} onSelectEvent={(id) => setSelectedEventId(id)} />
      ) : (
        <ListView events={filteredEvents} onSelectEvent={(id) => setSelectedEventId(id)} />
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          currentUserId={user?.id ?? ''}
          currentUserRole={profile?.role ?? 'student'}
          onClose={() => setSelectedEventId(null)}
          onEdit={() => { setEditEvent(selectedEvent); setSelectedEventId(null); }}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <EventFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}

      {/* Edit modal */}
      {editEvent && (
        <EventFormModal
          event={editEvent}
          onClose={() => setEditEvent(null)}
          onSaved={() => setEditEvent(null)}
        />
      )}
    </div>
  );
}

// === Calendar View ===

function CalendarView({ events, onSelectEvent }: { events: EventWithMeta[]; onSelectEvent: (id: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventWithMeta[]> = {};
    events.forEach((e) => {
      const dateKey = e.event_date;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(e);
    });
    return map;
  }, [events]);

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{monthName}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
        {weekdays.map((day) => (
          <div key={day} className="text-center py-2 text-xs font-medium text-slate-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: startWeekday }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-24 border-b border-r border-slate-50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayDate = new Date(year, month, day);
          dayDate.setHours(0, 0, 0, 0);
          const isToday = dayDate.getTime() === today.getTime();
          const isPast = dayDate < today;
          const dayEvents = eventsByDate[dateStr] ?? [];

          return (
            <div
              key={day}
              className={`min-h-24 border-b border-r border-slate-100 dark:border-slate-800 p-1.5 last:border-r-0 ${
                isPast ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${isToday ? 'w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center' : 'text-slate-500 dark:text-slate-400'}`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelectEvent(e.id)}
                    className="w-full text-left"
                  >
                    <div className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-xs truncate hover:opacity-80 transition ${categoryColors[e.category]}`}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${categoryDotColors[e.category]}`} />
                      <span className="truncate">{e.title}</span>
                    </div>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-xs text-slate-400 px-1.5">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === List View ===

function ListView({ events, onSelectEvent }: { events: EventWithMeta[]; onSelectEvent: (id: string) => void }) {
  return (
    <div className="space-y-3">
      {events.map((e) => (
        <EventListItem key={e.id} event={e} onClick={() => onSelectEvent(e.id)} />
      ))}
    </div>
  );
}

function EventListItem({ event, onClick }: { event: EventWithMeta; onClick: () => void }) {
  const date = new Date(event.event_date + 'T00:00');
  const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = date.getDate();
  const timeStr = formatTime(event.start_time);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition text-left flex items-center gap-4"
    >
      {/* Date block */}
      <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-xs font-medium text-slate-400">{monthStr}</span>
        <span className="text-lg font-bold text-slate-900 dark:text-white">{dayNum}</span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${categoryColors[event.category]}`}>
            {event.category}
          </span>
          {event.my_rsvp === 'going' && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 font-medium">
              Going
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{event.title}</h3>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {dayStr}, {timeStr}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5" />
              {event.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {event.rsvp_counts.going}
          </span>
        </div>
      </div>

      {/* Cover image */}
      {event.cover_image_url && (
        <img src={event.cover_image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
      )}
    </button>
  );
}

// === Event Detail Modal ===

function EventDetailModal({
  event,
  currentUserId,
  currentUserRole,
  onClose,
  onEdit,
}: {
  event: EventWithMeta;
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus | null>(event.my_rsvp);
  const [updating, setUpdating] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const isCreator = event.created_by === currentUserId;
  const isAdmin = currentUserRole === 'admin';
  const canManage = isCreator || isAdmin;

  async function handleRsvp(status: RsvpStatus) {
    setUpdating(true);
    setRsvpStatus(status);
    const success = await setRsvp(event.id, currentUserId, status);
    if (!success) {
      setRsvpStatus(event.my_rsvp);
      alert('This event is at full capacity.');
    }
    setUpdating(false);
  }

  async function handleRemoveRsvp() {
    setUpdating(true);
    setRsvpStatus(null);
    await removeRsvp(event.id, currentUserId);
    setUpdating(false);
  }

  async function handleDelete() {
    await deleteEvent(event.id, currentUserId, isAdmin);
    onClose();
  }

  const date = new Date(event.event_date + 'T00:00');
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = formatTime(event.start_time);
  const endTimeStr = event.end_time ? ` – ${formatTime(event.end_time)}` : '';
  const creatorInitials = (event.creator?.full_name || '?').slice(0, 2).toUpperCase();

  const rsvpButtons: { status: RsvpStatus; label: string; icon: typeof Check; activeClass: string }[] = [
    { status: 'going', label: 'Going', icon: Check, activeClass: 'bg-teal-600 text-white' },
    { status: 'interested', label: 'Interested', icon: Star, activeClass: 'bg-amber-500 text-white' },
    { status: 'not_going', label: "Can't go", icon: XCircle, activeClass: 'bg-slate-600 text-white' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 overflow-y-auto px-4 pb-8">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Cover image */}
        {event.cover_image_url && (
          <div className="relative h-40 overflow-hidden">
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/20 backdrop-blur text-white flex items-center justify-center hover:bg-white/30 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5">
          {/* Category badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${categoryColors[event.category]}`}>
              {event.category}
            </span>
            {event.capacity && (
              <span className="text-xs text-slate-400">
                {event.rsvp_counts.going}/{event.capacity} going
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{event.title}</h2>

          {/* Date/time/location */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Calendar className="w-4 h-4 text-slate-400" />
              {dateStr}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Clock className="w-4 h-4 text-slate-400" />
              {timeStr}{endTimeStr}
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <MapPin className="w-4 h-4 text-slate-400" />
                {event.location}
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4 whitespace-pre-wrap">{event.description}</p>
          )}

          {/* Creator */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-xs font-bold">
              {creatorInitials}
            </div>
            <div>
              <p className="text-xs text-slate-400">Organized by</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{event.creator?.full_name ?? 'Unknown'}</p>
            </div>
          </div>

          {/* RSVP counts */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
              <Check className="w-4 h-4" />
              {event.rsvp_counts.going} going
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <Star className="w-4 h-4" />
              {event.rsvp_counts.interested} interested
            </span>
          </div>

          {/* RSVP buttons */}
          {updating ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {rsvpButtons.map((btn) => {
                const Icon = btn.icon;
                const isActive = rsvpStatus === btn.status;
                return (
                  <button
                    key={btn.status}
                    onClick={() => handleRsvp(btn.status)}
                    disabled={btn.status === 'going' && event.capacity !== null && event.rsvp_counts.going >= event.capacity && rsvpStatus !== 'going'}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition text-xs font-medium disabled:opacity-40 ${
                      isActive
                        ? `${btn.activeClass} border-transparent`
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          )}

          {rsvpStatus && !updating && (
            <button
              onClick={handleRemoveRsvp}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition py-1"
            >
              Remove my RSVP
            </button>
          )}

          {/* Manage buttons */}
          {canManage && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {isCreator && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              )}
              {!showDelete ? (
                <button
                  onClick={() => setShowDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-slate-500">Are you sure?</span>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setShowDelete(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === Event Form Modal (Create / Edit) ===

function EventFormModal({
  event,
  onClose,
  onSaved,
}: {
  event?: EventWithMeta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const isEdit = !!event;

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [category, setCategory] = useState<EventCategory>(event?.category ?? 'social');
  const [location, setLocation] = useState(event?.location ?? '');
  const [eventDate, setEventDate] = useState(event?.event_date ?? '');
  const [startTime, setStartTime] = useState(event?.start_time ?? '09:00');
  const [endTime, setEndTime] = useState(event?.end_time ?? '');
  const [capacity, setCapacity] = useState(event?.capacity?.toString() ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(event?.cover_image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    if (coverPreview && coverPreview.startsWith('blob:')) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function removeCover() {
    if (coverPreview && coverPreview.startsWith('blob:')) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverFile(null);
    setCoverPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSave() {
    if (!title.trim() || !eventDate || !startTime) {
      setError('Title, date, and start time are required.');
      return;
    }
    if (!user) return;

    setSaving(true);
    setError(null);

    const capacityNum = capacity.trim() ? parseInt(capacity) : null;

    if (isEdit && event) {
      const success = await updateEvent(event.id, user.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        eventDate,
        startTime,
        endTime: endTime || '',
        capacity: capacityNum,
      });
      if (!success) {
        setError('Could not update the event. Please try again.');
        setSaving(false);
        return;
      }
    } else {
      const id = await createEvent(user.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        eventDate,
        startTime,
        endTime: endTime || '',
        capacity: capacityNum,
        coverImageFile: coverFile,
      });
      if (!id) {
        setError('Could not create the event. Please try again.');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved();
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 overflow-y-auto px-4 pb-8">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{isEdit ? 'Edit event' : 'Create event'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Cover image */}
          {coverPreview ? (
            <div className="relative group">
              <img src={coverPreview} alt="Cover preview" className="w-full h-32 object-cover rounded-xl" />
              <button
                onClick={removeCover}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-32 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-rose-400 hover:text-rose-500 transition"
            >
              <ImageIcon className="w-6 h-6" />
              <span className="text-sm">Add cover image (optional)</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Event title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hackathon 2026"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition capitalize ${
                    category === c.value
                      ? 'bg-rose-600 text-white'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date *</label>
              <input
                type="date"
                value={eventDate}
                min={today}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Start time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">End time (optional)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Capacity (optional)</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Unlimited"
                min="1"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Student Center, Room 101"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your event..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={!title.trim() || !eventDate || saving}
            className="w-full py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-5 h-5 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// === Helpers ===

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
