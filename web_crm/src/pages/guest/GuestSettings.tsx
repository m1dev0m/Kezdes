import { useState } from 'react';
import { Bell, Shield, Moon, Sun, Save } from 'lucide-react';
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
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-slate-500 font-medium mt-1">Manage your preferences and notifications.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Notifications</h3>
                        <p className="text-sm text-slate-500">Choose how you want to be notified</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {[
                        { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                        { key: 'sms', label: 'SMS Notifications', desc: 'Get text messages for important updates' },
                        { key: 'bookingReminders', label: 'Booking Reminders', desc: 'Reminders before your reservations' },
                        { key: 'promotions', label: 'Promotions & Offers', desc: 'Receive special offers and discounts' },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                                <p className="text-sm text-slate-500">{item.desc}</p>
                            </div>
                            <button
                                onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                                className={`w-14 h-8 rounded-full transition-colors relative ${notifications[item.key as keyof typeof notifications] ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                        {darkMode ? <Moon className="w-5 h-5 text-purple-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Appearance</h3>
                        <p className="text-sm text-slate-500">Customize your experience</p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                        {darkMode ? <Moon className="w-5 h-5 text-purple-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white">Dark Mode</p>
                            <p className="text-sm text-slate-500">Switch between light and dark theme</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`w-14 h-8 rounded-full transition-colors relative ${darkMode ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Security</h3>
                        <p className="text-sm text-slate-500">Manage your account security</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-slate-400" />
                            <p className="font-bold text-slate-900 dark:text-white text-left">Change Password</p>
                        </div>
                        <span className="text-slate-400">→</span>
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} isLoading={loading} size="lg" className="flex items-center gap-2">
                    <Save size={18} /> Save Settings
                </Button>
            </div>
        </div>
    );
}
