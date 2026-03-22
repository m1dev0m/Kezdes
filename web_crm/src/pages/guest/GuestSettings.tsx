import { useState } from 'react';
import { Moon, Sun, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

export default function GuestSettings() {
    const [notifications, setNotifications] = useState({
        email: true,
        sms: true,
        bookingReminders: true,
        promotions: false
    });
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            toast.success('Settings saved successfully');
        } catch (err) {
            toast.error('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12 max-w-4xl mx-auto">
            <div className="mb-10">
                <h2 className="text-4xl font-black text-brand-green tracking-tight">Settings</h2>
                <p className="text-slate-500 mt-2">Manage your premium dining experience and account preferences.</p>
            </div>

            <div className="space-y-8">
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-brand-green">Account Settings</h3>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Email Address</span>
                                <span className="text-lg font-medium">example@email.com</span>
                            </div>
                            <button type="button" className="px-4 py-2 text-sm font-bold text-brand-green border border-brand-green/20 rounded-lg hover:bg-brand-green/5 transition-colors">Update</button>
                        </div>
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Phone Number</span>
                                <span className="text-lg font-medium">+7 (777) 000-00-00</span>
                            </div>
                            <button type="button" className="px-4 py-2 text-sm font-bold text-brand-green border border-brand-green/20 rounded-lg hover:bg-brand-green/5 transition-colors">Update</button>
                        </div>
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Language Preference</span>
                                <span className="text-lg font-medium">English (United Kingdom)</span>
                            </div>
                            <button type="button" className="px-4 py-2 text-sm font-bold text-brand-green border border-brand-green/20 rounded-lg hover:bg-brand-green/5 transition-colors">Change</button>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-brand-green">Notifications</h3>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-100">
                                <tr>
                                    <th className="p-6 text-sm font-semibold text-slate-500 uppercase">Alert Type</th>
                                    <th className="p-6 text-sm font-semibold text-slate-500 uppercase text-center">Email</th>
                                    <th className="p-6 text-sm font-semibold text-slate-500 uppercase text-center">Push</th>
                                    <th className="p-6 text-sm font-semibold text-slate-500 uppercase text-center">SMS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    { key: 'bookingReminders', label: 'Booking Reminders' },
                                    { key: 'promotions', label: 'Special Offers' },
                                    { key: 'email', label: 'Chat Messages' },
                                ].map((row) => (
                                    <tr key={row.key}>
                                        <td className="p-6 font-medium">{row.label}</td>
                                        <td className="p-6 text-center">
                                            <input
                                                type="checkbox"
                                                checked={!!notifications[row.key as keyof typeof notifications]}
                                                onChange={() => setNotifications(prev => ({ ...prev, [row.key]: !prev[row.key as keyof typeof prev] }))}
                                                className="w-5 h-5 rounded text-brand-green border-slate-300 focus:ring-brand-green"
                                            />
                                        </td>
                                        <td className="p-6 text-center">
                                            <input
                                                type="checkbox"
                                                checked={!!notifications[row.key as keyof typeof notifications]}
                                                onChange={() => setNotifications(prev => ({ ...prev, [row.key]: !prev[row.key as keyof typeof prev] }))}
                                                className="w-5 h-5 rounded text-brand-green border-slate-300 focus:ring-brand-green"
                                            />
                                        </td>
                                        <td className="p-6 text-center">
                                            <input
                                                type="checkbox"
                                                checked={!!notifications[row.key as keyof typeof notifications]}
                                                onChange={() => setNotifications(prev => ({ ...prev, [row.key]: !prev[row.key as keyof typeof prev] }))}
                                                className="w-5 h-5 rounded text-brand-green border-slate-300 focus:ring-brand-green"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-brand-green">Privacy & Security</h3>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <p className="font-bold">Data Sharing</p>
                                <p className="text-sm text-slate-500">Allow Kezdes to share booking history with partners for rewards.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNotifications(prev => ({ ...prev, promotions: !prev.promotions }))}
                                className={`w-14 h-8 rounded-full transition-colors relative ${notifications.promotions ? 'bg-brand-green' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${notifications.promotions ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-rose-600">Delete Account</p>
                                <p className="text-sm text-slate-500">Permanently remove all your data and booking history.</p>
                            </div>
                            <button type="button" className="px-4 py-2 text-sm font-bold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors">Delete</button>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-brand-green">App Preferences</h3>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider">Default Currency</label>
                                <select className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-green transition-all">
                                    <option>USD - United States Dollar</option>
                                    <option>EUR - Euro</option>
                                    <option>GBP - British Pound</option>
                                    <option>KZT - Kazakhstani Tenge</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider">Appearance</label>
                                <div className="flex p-1 bg-slate-100 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setDarkMode(false)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold ${!darkMode ? 'bg-white shadow-sm text-brand-green' : 'text-slate-400'}`}
                                    >
                                        <Sun className="w-4 h-4" />
                                        Light
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDarkMode(true)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold ${darkMode ? 'bg-white shadow-sm text-brand-green' : 'text-slate-400'}`}
                                    >
                                        <Moon className="w-4 h-4" />
                                        Dark
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-12 flex justify-end gap-4 border-t border-slate-200 pt-8">
                    <button type="button" className="px-8 py-3 text-sm font-bold text-slate-600 hover:text-brand-green transition-colors">Discard Changes</button>
                    <Button onClick={handleSave} isLoading={loading} className="px-8 py-3 text-sm font-bold text-white bg-brand-green rounded-xl shadow-lg hover:brightness-110 transition-all">
                        <Save className="w-4 h-4 mr-2" /> Save Preferences
                    </Button>
                </div>
            </div>
        </div>
    );
}
