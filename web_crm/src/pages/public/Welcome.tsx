import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { motion } from 'framer-motion';
import {
  Users,
  CalendarDays,
  BarChart3,
  Search,
  MapPin,
  CheckCircle2,
  Zap,
  ArrowRight,
  TrendingDown,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
export default function Welcome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      logout();
      localStorage.clear();
    }
  }, [user, logout]);

  const handleBookingRedirect = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      navigate('/register');
    }
  };

  const features = [
    {
      title: 'CRM for Restaurants',
      desc: 'Customer base, visit history, VIP statuses, and manager notes — all in one powerful dashboard.',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-primary bg-primary/10'
    },
    {
      title: 'Online Booking',
      desc: 'Guests book a table in 30 seconds. Automatic confirmation and smart SMS reminders.',
      icon: <CalendarDays className="w-5 h-5" />,
      color: 'text-indigo-500 bg-indigo-50'
    },
    {
      title: 'Real-time Analytics',
      desc: 'Floor occupancy, no-show rates, popular dishes, and growth trends — updated live.',
      icon: <Users className="w-5 h-5" />,
      color: 'text-purple-500 bg-purple-50'
    }
  ];

  const restaurants = [
    { name: "The Ritz", rating: "4.9", type: "Fine Dining • Signature", img: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "Barley", rating: "4.7", type: "Steaks • Grill", img: "https://images.unsplash.com/photo-1544148103-0773bf10d330?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "Del Papa", rating: "4.8", type: "Italian • Pizza", img: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "Kok Tobe", rating: "4.9", type: "National • Kazakh", img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" }
  ];

  return (
    <div className="min-h-screen bg-background-light font-display selection:bg-primary/20 overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-brand-dark/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 8L40 24L24 40L8 24L24 8ZM21 32V16L13 24L21 32Z" fill="currentColor" fillRule="evenodd"></path>
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight"><Logo /></span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all">Features</a>
            <Link to="/pricing" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all">Pricing</Link>
            <a href="#crm" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all">Enterprise</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden sm:block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-primary transition-all px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Login</Link>
            <Link to="/register" className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-blue-700 active:scale-[0.98] transition-all">Sign Up</Link>
          </div>
        </div>
      </nav>

      <section className="pt-48 pb-32 px-6 text-center overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-30"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-10 shadow-sm border border-primary/5"
          >
            <Sparkles size={14} /> THE NEW STANDARD FOR DINING
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl lg:text-[7rem] font-black text-slate-900 leading-[0.95] tracking-tighter mb-10 max-w-5xl mx-auto"
          >
            Elevate every<br />
            <span className="text-primary italic">guest experience.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto mb-16"
          >
            Modern CRM for forward-thinking restaurants. Seamless bookings, automated hospitality, and powerful growth analytics.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24"
          >
            <Link to="/register" className="w-full sm:w-auto bg-primary text-white font-extrabold py-5 px-12 rounded-xl shadow-lg shadow-primary/20 hover:bg-blue-700 hover:shadow-2xl hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg">
              For Business
            </Link>
            <Link
              to="/discover"
              onClick={handleBookingRedirect}
              className="w-full sm:w-auto bg-white/50 backdrop-blur-sm text-slate-900 font-extrabold py-5 px-12 rounded-xl border border-slate-200 hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
            >
              Booking
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center"
          >
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">POWERING PREMIER VENUES WORLDWIDE</p>
            <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 grayscale opacity-60">
              <span className="text-xl font-black text-slate-900 tracking-tighter">THE RITZ</span>
              <span className="text-xl font-black text-slate-900 tracking-tighter">BARLEY</span>
              <span className="text-xl font-black text-slate-900 tracking-tighter">NOBU</span>
              <span className="text-xl font-black text-slate-900 tracking-tighter">HAKKASAN</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-12 relative z-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden ring-1 ring-slate-100 p-4"
          >
            <div className="bg-slate-50 rounded-[2.2rem] border border-slate-100 overflow-hidden shadow-inner">
              <div className="h-[500px] w-full bg-gradient-to-br from-slate-50 to-white relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://api.dicebear.com/7.x/glass/svg?seed=kezdes&backgroundColor=transparent')] bg-repeat"></div>
                <div className="relative z-10 w-[80%] h-[70%] bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <div className="h-6 w-32 bg-slate-100 rounded-full animate-pulse"></div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10"></div>
                      <div className="w-8 h-8 rounded-lg bg-slate-50"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 bg-slate-50 rounded-2xl border border-slate-100"></div>
                    ))}
                  </div>
                  <div className="flex-1 bg-slate-50/50 rounded-2xl p-6">
                    <div className="h-full w-full bg-gradient-to-t from-primary/20 to-transparent rounded-xl flex items-end p-4">
                      <div className="h-2 w-full bg-primary/20 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter mb-6">Find your perfect table</h2>
          <p className="text-lg text-slate-500 font-medium mb-12 max-w-xl mx-auto font-sans">Discover curated dining experiences near you. From intimate bistros to grand ballrooms.</p>

          <div className="flex flex-col sm:flex-row items-center bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-3xl p-3 gap-3 max-w-3xl mx-auto ring-1 ring-slate-50">
            <div className="flex-1 flex items-center gap-4 px-6 py-4 border-b sm:border-b-0 sm:border-r border-slate-100 w-full group">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input type="text" placeholder="Cuisine or restaurant name..." className="w-full bg-transparent outline-none text-sm font-bold placeholder:text-slate-300 text-slate-900" />
            </div>
            <div className="flex items-center gap-4 px-6 py-4 w-full sm:w-auto">
              <MapPin className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-black text-slate-900 whitespace-nowrap uppercase tracking-widest">Astana</span>
            </div>
            <Link
              to="/discover"
              onClick={handleBookingRedirect}
              className="w-full sm:w-auto bg-brand-dark text-white font-black text-xs uppercase tracking-widest px-10 py-5 rounded-2xl hover:scale-[1.02] transition-all text-center shadow-lg shadow-brand-dark/10"
            >
              Discover
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="py-32 px-6 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -mr-40 -mt-20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-left mb-20 max-w-2xl">
            <div className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6">CAPABILITIES</div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-6">Everything you need to run your venue.</h2>
            <p className="text-lg text-slate-500 font-medium">Replaces fragmented spreadsheets, WhatsApp chats, and paper logs with one elegant unified platform.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-12 rounded-[2.5rem] border border-slate-100 hover:border-primary/20 hover:shadow-2xl transition-all group relative overflow-hidden"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-all duration-500 shadow-sm ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight">{f.title}</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="crm" className="py-40 px-6 overflow-hidden bg-indigo-600 text-white relative">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-white/10 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-white/5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
          <div className="relative">
            <motion.div
              initial={{ rotate: -5, opacity: 0 }}
              whileInView={{ rotate: -2, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white rounded-[3rem] shadow-2xl p-8 relative z-10 text-slate-900 max-w-md mx-auto ring-1 ring-white/10"
            >
              <div className="flex items-center gap-5 mb-10">
                <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-600/30 italic">AN</div>
                <div>
                  <h4 className="text-xl font-black tracking-tight italic">Alia Nursultan</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Premium Member • Since 2025</p>
                </div>
                <div className="ml-auto bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest self-start">VIP</div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Total Visits</p>
                  <p className="text-3xl font-black tracking-tighter tabular-nums">42</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Acquisition</p>
                  <p className="text-lg font-black tracking-tight text-indigo-600">Direct Referral</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" /> Prefers Window Seating
                </div>
                <div className="flex items-center gap-4 bg-slate-50 text-slate-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest">
                  <CalendarDays className="w-5 h-5 shrink-0" /> Last visit: Today
                </div>
              </div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-12 bottom-20 bg-indigo-600 text-white rounded-2xl shadow-2xl p-5 w-60 border border-white/20"
              >
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-white mt-2 animate-ping"></div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/60 text-indigo-200">New Activity</p>
                    <p className="text-xs font-bold mt-1 leading-tight">Guest arrived and seated at Table 12.</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="space-y-12">
            <div className="inline-flex items-center px-4 py-1.5 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md">
              INTELLIGENT HOSPITALITY
            </div>
            <h2 className="text-6xl md:text-7xl font-black tracking-tighter leading-[0.9] max-w-xl italic">
              Know your guests<br />
              <span className="text-white/80">by name.</span>
            </h2>
            <p className="text-lg text-white/70 font-medium leading-relaxed max-w-lg">
              Forge deep connections with every patron. Kezdes CRM automatically tracks preferences, allergies, and momentous occasions.
            </p>

            <div className="grid sm:grid-cols-2 gap-10 pt-4">
              {[
                { icon: Users, title: "Guest Profiling", desc: "Detailed profiles with history, dietary notes, and VIP segmentation." },
                { icon: Zap, title: "Smart Recognition", desc: "Identify high-value guests the moment they walk through the door." },
                { icon: Bell, title: "Proactive Service", desc: "Real-time alerts for staff to ensure consistent premium service." },
                { icon: TrendingDown, title: "Churn Prevention", desc: "Identify declining visits and re-engage guests automatically." }
              ].map((item, i) => (
                <div key={i} className="space-y-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/10 text-white">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tight text-white mb-2 italic">{item.title}</h4>
                    <p className="text-sm text-white/50 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-40 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
            <div className="max-w-xl">
              <div className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6">CURATED DESTINATIONS</div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4">The world's most desired tables.</h2>
              <p className="text-lg text-slate-500 font-medium">Join our exclusive network of award-winning restaurants.</p>
            </div>
            <Link to="/discover" className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-primary hover:text-slate-900 transition-all group shrink-0">
              Explore All Venues <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {restaurants.map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all"
              >
                <div className="h-64 overflow-hidden relative">
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute top-5 right-5 bg-white/90 backdrop-blur-sm text-slate-900 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5">
                    <Star size={14} className="fill-primary text-primary" /> {item.rating}
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 truncate">{item.name}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-8">{item.type}</p>
                  <Link
                    to="/discover"
                    onClick={handleBookingRedirect}
                    className="block w-full text-center bg-slate-50 hover:bg-primary hover:text-white text-slate-900 text-sm font-bold py-3 rounded-xl transition-all"
                  >
                    Book Table
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary pt-32 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-primary bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary via-primary to-indigo-600"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-10 leading-none"
          >
            Ready to lead the<br />hospitality revolution?
          </motion.h2>
          <p className="text-white/80 text-xl font-medium mb-16 max-w-2xl mx-auto leading-relaxed">
            Join the elite circle of venues redefining dining. 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/register" className="w-full sm:w-auto bg-white text-primary font-bold py-5 px-12 rounded-2xl shadow-xl hover:bg-blue-50 active:scale-95 transition-all text-xl">
              Start Free Trial
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto bg-blue-600 text-white border border-blue-400 font-bold py-5 px-12 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all text-xl">
              Contact Sales
            </Link>
          </div>

          <div className="mt-24 pt-16 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 opacity-40">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Data Encryption</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">PCI-DSS Compliant</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Multi-Regional Hosting</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white py-24 px-6 border-t border-slate-100 overflow-hidden relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 mb-24 relative z-10">
          <div className="md:col-span-4">
            <div className="flex items-center gap-3 mb-10">
              <span className="text-2xl font-black tracking-tighter"><Logo /></span>
            </div>
            <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm">
              The premium CRM architecture for distinguished restaurants and global hospitality groups. Designed for excellence.
            </p>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[10px] font-black tracking-[0.3em] text-slate-900 mb-8 uppercase">Product</h4>
            <ul className="space-y-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <li><a href="#features" className="hover:text-primary transition-all">Capabilities</a></li>
              <li><Link to="/pricing" className="hover:text-primary transition-all">Pricing</Link></li>
              <li><Link to="/discover" className="hover:text-primary transition-all">Destinations</Link></li>
              <li><a href="#" className="hover:text-primary transition-all">Roadmap</a></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[10px] font-black tracking-[0.3em] text-slate-900 mb-8 uppercase">Company</h4>
            <ul className="space-y-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <li><a href="#" className="hover:text-primary transition-all">About</a></li>
              <li><a href="#" className="hover:text-primary transition-all">Press</a></li>
              <li><a href="#" className="hover:text-primary transition-all">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-all">Contact</a></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h4 className="text-[10px] font-black tracking-[0.3em] text-slate-900 mb-8 uppercase">Newsletter</h4>
            <p className="text-slate-500 text-xs font-medium mb-6">Receive curated insights on modern hospitality.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email address" className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-medium w-full outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300" />
              <button className="bg-primary text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Join</button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-100 pt-10 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-60">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">© 2026 KEZDES SAAS. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <a href="#" className="hover:text-primary transition-all">Privacy</a>
            <a href="#" className="hover:text-primary transition-all">Terms</a>
            <a href="#" className="hover:text-primary transition-all">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Star(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

