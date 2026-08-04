import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Send, Radio, Users, MapPin, CreditCard, UserCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { Card, Button, Input, Textarea, Select } from '../ui';
import { useToast } from '../toast';

type ProfileHit = { id: string; first_name: string | null; last_name: string | null; phone: string | null; role: string };
type TargetMode = 'user' | 'role' | 'city' | 'subscription' | 'all';

const ROLES = ['customer', 'agent', 'builder', 'admin'];
const CONCURRENCY = 10;

// Resolves a batch of user ids sequentially in small concurrent chunks, so a broadcast to a
// large audience doesn't fire hundreds of simultaneous RPC calls at once. Reuses the existing
// single-user admin_send_notification RPC — no new backend surface for role/city/subscription
// targeting, just client-side audience resolution + fan-out over what already exists.
async function sendToUsers(userIds: string[], title: string, body: string, link: string, onProgress: (done: number) => void) {
  let done = 0;
  for (let i = 0; i < userIds.length; i += CONCURRENCY) {
    const chunk = userIds.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map((id) =>
        supabase.rpc('admin_send_notification', {
          p_title: title,
          p_body: body || null,
          p_user_id: id,
          p_broadcast: false,
          p_link: link || null,
        }),
      ),
    );
    done += chunk.length;
    onProgress(done);
  }
}

export function BroadcastPanel() {
  const toast = useToast();
  const [mode, setMode] = useState<TargetMode>('user');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<ProfileHit | null>(null);
  const [role, setRole] = useState('customer');
  const [cityId, setCityId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: hits } = useQuery({
    queryKey: ['admin-notif-user-search', search],
    queryFn: async () => {
      if (search.trim().length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, role')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`)
        .limit(8);
      return (data ?? []) as ProfileHit[];
    },
    enabled: mode === 'user' && search.trim().length >= 2 && !selectedUser,
  });

  const { data: cities } = useQuery({
    queryKey: ['admin-notif-cities'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name').order('name');
      return data ?? [];
    },
    enabled: mode === 'city',
  });

  const { data: packages } = useQuery({
    queryKey: ['admin-notif-packages'],
    queryFn: async () => {
      const { data } = await supabase.from('packages').select('id, name').order('name');
      return data ?? [];
    },
    enabled: mode === 'subscription',
  });

  const reset = () => {
    setTitle('');
    setBody('');
    setLink('');
    setSelectedUser(null);
    setSearch('');
    setProgress(null);
  };

  const resolveAudience = async (): Promise<string[]> => {
    if (mode === 'role') {
      const { data } = await supabase.from('profiles').select('id').eq('role', role).eq('status', 'active');
      return (data ?? []).map((r) => r.id as string);
    }
    if (mode === 'city') {
      if (!cityId) return [];
      const { data } = await supabase.from('properties').select('owner_id, assigned_agent_id').eq('city_id', cityId);
      const ids = new Set<string>();
      (data ?? []).forEach((p) => {
        if (p.owner_id) ids.add(p.owner_id as string);
        if (p.assigned_agent_id) ids.add(p.assigned_agent_id as string);
      });
      return [...ids];
    }
    if (mode === 'subscription') {
      if (!packageId) return [];
      const { data } = await supabase.from('user_packages').select('user_id').eq('package_id', packageId).eq('status', 'active');
      return [...new Set((data ?? []).map((r) => r.user_id as string))];
    }
    return [];
  };

  const send = async () => {
    if (!title.trim()) return toast.addToast('error', 'Title is required');
    if (mode === 'user' && !selectedUser) return toast.addToast('error', 'Select a recipient first');
    if (mode === 'city' && !cityId) return toast.addToast('error', 'Select a city first');
    if (mode === 'subscription' && !packageId) return toast.addToast('error', 'Select a package first');

    setSending(true);
    setProgress(null);
    try {
      if (mode === 'all') {
        const { data, error } = await supabase.rpc('admin_send_notification', {
          p_title: title.trim(),
          p_body: body.trim() || null,
          p_broadcast: true,
          p_link: link.trim() || null,
        });
        if (error) throw error;
        toast.addToast('success', `Sent to ${data} users`);
      } else if (mode === 'user') {
        const { error } = await supabase.rpc('admin_send_notification', {
          p_title: title.trim(),
          p_body: body.trim() || null,
          p_user_id: selectedUser!.id,
          p_broadcast: false,
          p_link: link.trim() || null,
        });
        if (error) throw error;
        toast.addToast('success', 'Notification sent');
      } else {
        const audience = await resolveAudience();
        if (audience.length === 0) {
          toast.addToast('error', 'No matching users found for that target');
          return;
        }
        setProgress({ done: 0, total: audience.length });
        await sendToUsers(audience, title.trim(), body.trim(), link.trim(), (done) =>
          setProgress({ done, total: audience.length }),
        );
        toast.addToast('success', `Sent to ${audience.length} user${audience.length === 1 ? '' : 's'}`);
      }
      reset();
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const modeTabs: { id: TargetMode; label: string; icon: typeof Search }[] = [
    { id: 'user', label: 'One user', icon: Search },
    { id: 'role', label: 'By role', icon: UserCircle2 },
    { id: 'city', label: 'By city', icon: MapPin },
    { id: 'subscription', label: 'By subscription', icon: CreditCard },
    { id: 'all', label: 'Everyone', icon: Radio },
  ];

  return (
    <Card className="mb-6 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Send className="h-4 w-4 text-red-600" />
        <h3 className="font-bold text-navy-900 dark:text-white">Broadcast Notification</h3>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-navy-100 p-1 dark:bg-navy-800">
        {modeTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setMode(id);
              setSelectedUser(null);
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition',
              mode === id ? 'bg-white text-navy-900 shadow dark:bg-navy-700 dark:text-white' : 'text-navy-500',
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {mode === 'user' && (
        <div className="mb-3">
          {selectedUser ? (
            <div className="flex items-center justify-between rounded-xl border border-navy-150 bg-navy-50 px-3 py-2 dark:border-navy-700 dark:bg-navy-800">
              <span className="text-sm font-semibold text-navy-800 dark:text-white">
                {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || selectedUser.phone || selectedUser.id}
                <span className="ml-2 text-xs font-normal text-navy-500">({selectedUser.role})</span>
              </span>
              <button onClick={() => setSelectedUser(null)} className="text-navy-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..." />
              {hits && hits.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-xl border border-navy-100 bg-white shadow-lg dark:border-navy-700 dark:bg-navy-900">
                  {hits.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSelectedUser(h);
                        setSearch('');
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-navy-50 dark:hover:bg-navy-800"
                    >
                      <span className="font-medium text-navy-800 dark:text-white">
                        {[h.first_name, h.last_name].filter(Boolean).join(' ') || h.phone || h.id}
                      </span>
                      <span className="text-xs text-navy-400">{h.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'role' && (
        <div className="mb-3">
          <Select label="Target role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}s
              </option>
            ))}
          </Select>
        </div>
      )}

      {mode === 'city' && (
        <div className="mb-3">
          <Select label="Target city" value={cityId} onChange={(e) => setCityId(e.target.value)}>
            <option value="">Select a city</option>
            {(cities ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-navy-400">Owners and agents with listings in this city.</p>
        </div>
      )}

      {mode === 'subscription' && (
        <div className="mb-3">
          <Select label="Target package" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
            <option value="">Select a package</option>
            {(packages ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-navy-400">Users with an active subscription on this package.</p>
        </div>
      )}

      {mode === 'all' && <p className="mb-3 text-xs text-navy-400">Sends to every active user on the platform.</p>}

      <div className="flex items-center gap-2 text-xs text-navy-400 mb-1">
        <Users className="h-3 w-3" /> Users targeted
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Platform maintenance tonight" />
        <Input label="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/portal/..." />
      </div>
      <div className="mt-3">
        <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Notification body..." />
      </div>

      {progress && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100 dark:bg-navy-800">
            <div
              className="h-full rounded-full bg-red-600 transition-all"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-navy-400">
            Sent {progress.done} of {progress.total}
          </p>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={send} loading={sending} icon={<Send className="h-4 w-4" />}>
          {mode === 'all' ? 'Send to everyone' : 'Send'}
        </Button>
      </div>
    </Card>
  );
}
