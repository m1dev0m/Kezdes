import { Activity } from 'lucide-react';

export default function SystemLogs() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">System Logs</h1>
                    <p className="text-slate-500 text-sm mt-1">Monitor recent platform activity.</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-12 flex flex-col items-center justify-center text-slate-500">
                <Activity className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Logs Not Available</h3>
                <p className="text-sm max-w-sm text-center">System logs are currently disabled. Connect a logging service like Datadog, Sentry, or ELK stack to view real-time platform events.</p>
            </div>
        </div>
    );
}
