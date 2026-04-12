import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Search, Shield, UserCog, UserPlus, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import {
  useRestaurantSubscriptionSummary,
  type RestaurantSubscriptionSummary,
} from '@/features/subscription/useRestaurantSubscriptionSummary';
import { getApiErrorMessage } from '@/features/reservations/shared';

type RoleFilter = 'all' | 'manager' | 'host' | 'staff';

type StaffMember = {
  id: number;
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  is_active?: boolean;
};

type InviteFormState = {
  username: string;
  email: string;
  first_name: string;
  role: string;
  password: string;
};

const INITIAL_FORM: InviteFormState = {
  username: '',
  email: '',
  first_name: '',
  role: 'manager',
  password: '',
};

function getFullName(member: StaffMember): string {
  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
  return fullName || member.username || 'Team member';
}

function normalizeRole(role?: string | null): string {
  return (role || 'staff').replaceAll('_', ' ');
}

function getRoleLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  if (normalized.includes('manager')) return 'Manager';
  if (normalized.includes('host')) return 'Host';
  return 'Staff';
}

function getRoleTone(role?: string | null): string {
  const normalized = normalizeRole(role);
  if (normalized.includes('manager')) return 'border-blue-200 bg-blue-50 text-blue-700';
  if (normalized.includes('host')) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function hasFeature(summary: RestaurantSubscriptionSummary | null, key: string): boolean {
  if (!summary) return false;
  const flag = summary.feature_flags?.[key];
  if (typeof flag === 'boolean') return flag;
  return summary.features?.some((feature) => feature.key === key && feature.enabled) ?? false;
}

export default function Staff() {
  const { summary, loading: subscriptionLoading, error: subscriptionError, reload: reloadSubscription } = useRestaurantSubscriptionSummary();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [formData, setFormData] = useState<InviteFormState>(INITIAL_FORM);
  const canViewStaff = useMemo(() => hasFeature(summary, 'staff_basic'), [summary]);
  const stats = useMemo(
    () => ({
      total: staff.length,
      managers: staff.filter((member) => normalizeRole(member.role).includes('manager')).length,
      hosts: staff.filter((member) => normalizeRole(member.role).includes('host')).length,
      active: staff.filter((member) => member.is_active !== false).length,
    }),
    [staff],
  );

  const filteredStaff = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return staff.filter((member) => {
      const normalizedRole = normalizeRole(member.role);
      const matchesRole =
        roleFilter === 'all'
          ? true
          : roleFilter === 'manager'
            ? normalizedRole.includes('manager')
            : roleFilter === 'host'
              ? normalizedRole.includes('host')
              : !normalizedRole.includes('manager') && !normalizedRole.includes('host');

      if (!matchesRole) return false;
      if (!searchValue) return true;

      return [getFullName(member), member.email || '', member.username || '', normalizedRole]
        .join(' ')
        .toLowerCase()
        .includes(searchValue);
    });
  }, [roleFilter, search, staff]);

  const loadStaff = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const response = await api.get('/restaurants/staff/');
      const items = Array.isArray(response.data) ? response.data : response.data?.results || [];
      setStaff(items as StaffMember[]);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Не удалось загрузить команду.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (subscriptionLoading || !summary) return;
    if (!canViewStaff) return;
    void loadStaff();
  }, [canViewStaff, loadStaff, subscriptionLoading, summary]);

  if (subscriptionLoading && !summary) {
    return (
      <div className="space-y-8 pb-10">
        <div className="h-24 animate-pulse rounded-3xl bg-slate-50" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-50" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-50" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-50" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-50" />
        </div>
      </div>
    );
  }

  if (subscriptionError && !summary) {
    return (
      <div className="space-y-8 pb-10">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>{subscriptionError}</div>
            <button
              type="button"
              onClick={() => void reloadSubscription()}
              className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-100"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (summary && !canViewStaff) {
    return (
      <div className="space-y-8 pb-10">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Team</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Команда недоступна на текущем тарифе</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Для управления staff нужен тариф Plus или ручное включение флага `staff_basic`.
          </p>
        </div>
      </div>
    );
  }

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviting(true);
    try {
      await api.post('/restaurants/staff/', formData);
      toast.success('Участник команды добавлен.');
      setIsModalOpen(false);
      setFormData(INITIAL_FORM);
      await loadStaff();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось добавить участника команды.'));
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/restaurants/staff/${id}/`);
      toast.success('Доступ сотрудника отозван.');
      if (selectedStaff?.id === id) setSelectedStaff(null);
      await loadStaff();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось отозвать доступ.'));
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Team</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Staff directory</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Роли, доступы и контакты команды, которая работает с бронями, залом и гостями.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
        >
          <UserPlus size={16} />
          Add team member
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard icon={<Users size={18} />} label="Всего" value={stats.total} />
        <SummaryCard icon={<Shield size={18} />} label="Managers" value={stats.managers} tone="border-blue-200 bg-blue-50 text-blue-700" />
        <SummaryCard icon={<UserCog size={18} />} label="Hosts" value={stats.hosts} tone="border-amber-200 bg-amber-50 text-amber-700" />
        <SummaryCard icon={<Mail size={18} />} label="Активны" value={stats.active} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {error ? (
          <div className="flex items-center justify-between gap-4 border-b border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadStaff()}
              className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-100"
            >
              Повторить
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'manager', label: 'Managers' },
              { key: 'host', label: 'Hosts' },
              { key: 'staff', label: 'Staff' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setRoleFilter(item.key as RoleFilter)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  roleFilter === item.key ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative min-w-[280px]">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="staff-search"
                placeholder="Поиск по имени, роли или email"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
              />
            </div>
            <button
              type="button"
              onClick={() => void loadStaff()}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {refreshing ? 'Обновление...' : 'Обновить'}
            </button>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Team member</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-500">
                      Загрузка команды...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-500">
                      По текущим фильтрам сотрудников нет.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => setSelectedStaff(member)}
                      className={`cursor-pointer transition hover:bg-slate-50 ${selectedStaff?.id === member.id ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700">
                            {getFullName(member).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{getFullName(member)}</div>
                            <div className="text-xs text-slate-500">@{member.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${getRoleTone(member.role)}`}>
                          {getRoleLabel(member.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{member.email || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${member.is_active === false ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                          {member.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedStaff(member);
                          }}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <aside className="border-t border-slate-200 bg-slate-50/60 p-6 xl:border-l xl:border-t-0">
            {selectedStaff ? (
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-semibold text-blue-700">
                      {getFullName(selectedStaff).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{getFullName(selectedStaff)}</h3>
                      <p className="text-sm text-slate-500">@{selectedStaff.username}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Access</div>
                  <div className="mt-4 grid gap-4">
                    <DetailRow label="Role" value={getRoleLabel(selectedStaff.role)} />
                    <DetailRow label="Email" value={selectedStaff.email || '—'} />
                    <DetailRow label="Username" value={selectedStaff.username} />
                    <DetailRow label="Status" value={selectedStaff.is_active === false ? 'Inactive' : 'Active'} />
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Operational scope</div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    Эта карточка фиксирует, кто имеет доступ к броням, залу и сообщениям. Для production-потока этого
                    достаточно: видно роль, контакт и текущий статус доступа.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleDelete(selectedStaff.id)}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  Revoke access
                </button>
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 text-center text-sm text-slate-500">
                Выберите участника команды, чтобы увидеть его роль и параметры доступа.
              </div>
            )}
          </aside>
        </div>
      </section>

      <AnimatePresence>
        {isModalOpen ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Add team member</h2>
                  <p className="text-sm text-slate-500">Создание нового доступа для менеджера, хоста или сотрудника.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-900"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleInvite} className="space-y-4 p-6">
                <Field label="Username" value={formData.username} onChange={(value) => setFormData((current) => ({ ...current, username: value }))} />
                <Field label="Email" type="email" value={formData.email} onChange={(value) => setFormData((current) => ({ ...current, email: value }))} />
                <Field label="First name" value={formData.first_name} onChange={(value) => setFormData((current) => ({ ...current, first_name: value }))} />
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role</label>
                  <select
                    value={formData.role}
                    onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="manager">Manager</option>
                    <option value="host">Host</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <Field
                  label="Temporary password"
                  type="password"
                  value={formData.password}
                  onChange={(value) => setFormData((current) => ({ ...current, password: value }))}
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="rounded-xl bg-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
                  >
                    {inviting ? 'Saving...' : 'Create access'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone = 'border-slate-200 bg-white text-slate-700',
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className={`rounded-3xl border px-5 py-4 shadow-sm ${tone}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}
