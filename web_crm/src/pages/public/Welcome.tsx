import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/logic/AuthContext';

export default function Welcome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      logout();
      try {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } catch {
        // ignore
      }
      try {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
      } catch {
        // ignore
      }
    }
  }, [user, logout]);

  const handleBookingRedirect = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      navigate('/register');
    }
  };

  return (
    <div className="bg-brand-cream font-sans text-brand-green min-h-screen">
      {/* BEGIN: Navigation */}
      <nav className="fixed w-full z-50 bg-brand-cream/90 backdrop-blur-md border-b border-brand-accent px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-brand-green">Kezdes</span>
          </div>
          <div className="hidden md:flex items-center gap-6 font-medium">
            <Link className="nav-link" to="/discover">Explore</Link>
            <Link className="nav-link" to="/discover">Offers</Link>
            <div className="flex items-center gap-3">
              <Link
                className="px-5 py-2.5 border-2 border-brand-green text-brand-green rounded-full hover:bg-brand-green hover:text-brand-cream transition-all font-semibold text-sm"
                to="/register?mode=restaurant"
              >
                For Restaurants
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 bg-brand-green text-brand-cream rounded-full hover:bg-opacity-90 transition-all font-semibold text-sm"
              >
                Join Now
              </Link>
            </div>
          </div>
          {/* Mobile Menu Trigger (Visual Only) */}
          <button
            className="md:hidden text-brand-green"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-brand-cream border-t border-brand-accent mt-4 py-4 flex flex-col gap-4 text-center">
            <Link className="font-medium text-brand-green" to="/discover">Explore</Link>
            <Link className="font-medium text-brand-green" to="/discover">Offers</Link>
            <Link to="/register?mode=restaurant" className="mx-auto w-2/3 px-6 py-2.5 border-2 border-brand-green text-brand-green rounded-full hover:bg-brand-green hover:text-brand-cream transition-all font-semibold text-center">
              For Restaurants
            </Link>
            <Link to="/register" className="mx-auto w-2/3 px-6 py-2.5 bg-brand-green text-brand-cream rounded-full hover:bg-opacity-90 font-semibold text-center">
              Join Now
            </Link>
          </div>
        )}
      </nav>
      {/* END: Navigation */}

      <main>
        {/* BEGIN: Hero Section */}
        <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center pt-20">
          {/* Hero Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              alt="Elegant restaurant interior"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSC_RsYzcsX7tn-ZVIBKhdfCnRfrt42x4XE7lFtZ2aQIU7UGtXxrP_VkiVYznestfskBSpo41PQKfog-7kZK4AISLlT-jRu-JZzuUdlQ7AXcC7512MkBDXgppkx2fEt-O9UzZMTlfE5SHFMp3l9E3Ct-UdK_Nxr40IYBsa-qSMi7dc3NPm2Gz7-zeQ0Zxi0EDtihSxEGqmkIEq0WAqYXqMzipj7s1hhphwgXYMPgYEXqSNMwe_1X7D-JJjWFP3WkqR7Z4FDoSSfYqK"
            />
            <div className="absolute inset-0 hero-gradient"></div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
            <h1 className="font-serif text-5xl md:text-7xl text-white mb-6 leading-tight">Book Your Table,<br />Pre-order Your Feast</h1>
            <p className="text-white/90 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-light">Experience dining redefined. Skip the wait and have your favorite dishes ready the moment you arrive.</p>

            {/* Search Bar */}
            <div className="bg-white p-2 rounded-2xl md:rounded-full shadow-2xl flex flex-col md:flex-row items-center gap-2 max-w-3xl mx-auto">
              <div className="flex-1 w-full px-4 py-2 flex items-center gap-3 border-b md:border-b-0 md:border-r border-gray-100">
                <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <input className="w-full border-none focus:ring-0 text-brand-green placeholder-gray-400 font-sans" placeholder="Location or City" type="text" />
              </div>
              <div className="flex-1 w-full px-4 py-2 flex items-center gap-3">
                <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <input className="w-full border-none focus:ring-0 text-brand-green placeholder-gray-400 font-sans" placeholder="Cuisine or Restaurant" type="text" />
              </div>
              <Link
                to="/discover"
                onClick={handleBookingRedirect}
                className="w-full md:w-auto px-10 py-4 bg-brand-gold text-white rounded-xl md:rounded-full font-bold hover:bg-brand-gold/90 transition-all uppercase tracking-wider text-sm flex items-center justify-center font-sans"
              >
                Find Table
              </Link>
            </div>
          </div>
        </section>
        {/* END: Hero Section */}

        {/* BEGIN: How It Works */}
        <section className="py-24 px-6 bg-brand-cream">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl mb-4">The Kezdes Experience</h2>
              <div className="h-1 w-20 bg-brand-gold mx-auto"></div>
            </div>
            <div className="grid md:grid-cols-3 gap-12">
              {/* Step 1 */}
              <div className="text-center group">
                <div className="w-24 h-24 bg-brand-accent/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-gold/10 transition-colors">
                  <svg className="w-10 h-10 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 font-sans">Find a Restaurant</h3>
                <p className="text-gray-600 leading-relaxed font-sans">Discover top-rated dining spots curated for your taste and location.</p>
              </div>
              {/* Step 2 */}
              <div className="text-center group">
                <div className="w-24 h-24 bg-brand-accent/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-gold/10 transition-colors">
                  <svg className="w-10 h-10 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 font-sans">Pre-order Food</h3>
                <p className="text-gray-600 leading-relaxed font-sans">Browse the digital menu and select your dishes before you even leave home.</p>
              </div>
              {/* Step 3 */}
              <div className="text-center group">
                <div className="w-24 h-24 bg-brand-accent/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-gold/10 transition-colors">
                  <svg className="w-10 h-10 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 font-sans">Confirm Booking</h3>
                <p className="text-gray-600 leading-relaxed font-sans">Secure your table instantly and receive a confirmation for your perfect meal.</p>
              </div>
            </div>
          </div>
        </section>
        {/* END: How It Works */}

        {/* BEGIN: Featured Restaurants */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <span className="text-brand-gold font-bold uppercase tracking-widest text-sm mb-2 block font-sans">Curation</span>
                <h2 className="font-serif text-4xl md:text-5xl">Featured Restaurants</h2>
              </div>
              <Link to="/discover" className="text-brand-green font-bold border-b-2 border-brand-gold pb-1 hover:text-brand-gold transition-colors font-sans" onClick={handleBookingRedirect}>
                View All Restaurants
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Restaurant 1 */}
              <div className="restaurant-card bg-brand-cream rounded-2xl overflow-hidden shadow-lg border border-brand-accent/50">
                <div className="h-64 relative overflow-hidden">
                  <img alt="Lumière Dining" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_Gv4x5Pz0YnpYJk_ZO-t6vhj8EPKJDnShZrltZQwFkHQ9LvADWJ4_8EnCu4OhRKRKv6-EAqnXk0GJzZGaD_eo41hBDD3qdbUV7XWMxYPxz0mSQplfmS6pcSyB0-ScXxBWVuVtRTJb21LdwpfR6JoEup-m81_ffYyiexXdjl2YRznhcMaZ51NIoOEZe0Z2IcJakFmP689iBiVbeKRcVAqBnpLV8DRECENj7b4FCT2LDy3mOE4RZ6ltvW4MHoQ_S799t8G-ZD78wvn6" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 font-sans">
                    <span className="text-brand-gold">★</span> 4.9
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold font-sans">Lumière Dining</h3>
                    <span className="text-brand-gold font-medium font-sans">$$$</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-4 font-sans">Modern European • Manhattan, NY</p>
                  <Link to="/discover" onClick={handleBookingRedirect} className="w-full py-3 border border-brand-green text-brand-green rounded-xl font-bold hover:bg-brand-green hover:text-white transition-all flex items-center justify-center font-sans">
                    Explore Menu
                  </Link>
                </div>
              </div>

              {/* Restaurant 2 */}
              <div className="restaurant-card bg-brand-cream rounded-2xl overflow-hidden shadow-lg border border-brand-accent/50">
                <div className="h-64 relative overflow-hidden">
                  <img alt="Sakura Zen" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDIKAEZwDlBzoNRHueAxvdLDFt6DLKL9pQs24QAWCCYbwLruEb87GfZ-r1TrrzlhkndxRs022HgyaGw5nNXGZt7fxZQBydNzxr9qAEfGdB9I2FOUguSfCIbb70jImewaLY0aGqxyHNF3vYhy_0LrT0aBnqsOEWdH2r_39XQ_4MYtV9qcsxGMxePQKyVg44O8VVWZtAv9t3zZ8HvnMdZpIlmFSvWzTsKiD1OucIkG-I7ZrBLF-YqMRn7QNZJJiNIRyx2bsKAu5GrBZJ" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 font-sans">
                    <span className="text-brand-gold">★</span> 4.8
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold font-sans">Sakura Zen</h3>
                    <span className="text-brand-gold font-medium font-sans">$$$$</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-4 font-sans">Authentic Japanese • Brooklyn, NY</p>
                  <Link to="/discover" onClick={handleBookingRedirect} className="w-full py-3 border border-brand-green text-brand-green rounded-xl font-bold hover:bg-brand-green hover:text-white transition-all flex items-center justify-center font-sans">
                    Explore Menu
                  </Link>
                </div>
              </div>

              {/* Restaurant 3 */}
              <div className="restaurant-card bg-brand-cream rounded-2xl overflow-hidden shadow-lg border border-brand-accent/50">
                <div className="h-64 relative overflow-hidden">
                  <img alt="The Hearth" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAh4hDhqfnMFQ_4-CgFXG9RNNRJ7DmcMH9USJCkOVFlF0w-aZ-887OFxNn5xhUjX3AxQO3oswootARqupsJS_p8rNWC161TS04ov4riKxOi_hAeCs85eShzFbwvDNI4-YoNQTf0hCOdGJfk9La1wIDt5JM_TA4hZMeNSfK9VYGkQpk_3LeMl2ILVWdXH8euFmllXKZ_QYSFSvmQDPzcBIKQq3m36myh5ugJv-h1mwEdoPSquWere5pMK-NQcwToTSCYJ15igqGw9aW4" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 font-sans">
                    <span className="text-brand-gold">★</span> 4.7
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold font-sans">The Hearth</h3>
                    <span className="text-brand-gold font-medium font-sans">$$</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-4 font-sans">Rustic Italian • Queens, NY</p>
                  <Link to="/discover" onClick={handleBookingRedirect} className="w-full py-3 border border-brand-green text-brand-green rounded-xl font-bold hover:bg-brand-green hover:text-white transition-all flex items-center justify-center font-sans">
                    Explore Menu
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* END: Featured Restaurants */}

        {/* BEGIN: Special Offers */}
        <section className="py-24 px-6 bg-brand-green text-white relative overflow-hidden">
          {/* Decor Circles */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-gold/10 rounded-full"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-gold/10 rounded-full"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="font-serif text-4xl md:text-5xl mb-6">Exclusive Perks for Early Birds</h2>
                <p className="text-brand-accent/80 text-lg mb-8 leading-relaxed font-sans">Join our membership program to unlock complimentary appetizers, priority seating during peak hours, and special seasonal menus only available to Kezdes members.</p>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full border border-brand-gold flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-brand-gold rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-bold text-xl mb-1 font-sans">15% Off Pre-orders</h4>
                      <p className="text-brand-accent/60 font-sans">Enjoy a discount on your meal when you pre-order through our app.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full border border-brand-gold flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-brand-gold rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-bold text-xl mb-1 font-sans">Zero Reservation Fees</h4>
                      <p className="text-brand-accent/60 font-sans">No hidden costs. Just the food you love and the seat you deserve.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl overflow-hidden border-4 border-brand-gold/20 shadow-2xl">
                  <img alt="Special food plate" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeYsoZKS_bFcQaiuTLSxiq9731jFc_fC6WsHyj0fW_ibklKN_d0mMBpWP7eNKz9jzPH1DIxG7wGF00Pgw0yjqiYuscbVXYUzSsRNtilgmDldsVFApfvkcoAbxTQ2HCTkDwhON4P3yfHAutxr0e3gjNFxFp3P7NP1kYs7AVpJLKNb8kvxs5W03ylMwSnONwTdpMRerAfFaXRJ0FOJeG7mIlbFN4EqELFyXYqI5yCFUFfhlQagPaOTXUoZ9MZS78w7RtzwOh275E7Plk" />
                </div>
                {/* Floating Offer Badge */}
                <div className="absolute -bottom-6 -left-6 bg-brand-gold p-8 rounded-2xl text-center shadow-xl">
                  <span className="block text-4xl font-serif mb-1 shrink-0">25%</span>
                  <span className="block text-xs uppercase tracking-widest font-bold shrink-0 font-sans">First Order</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* END: Special Offers */}

        {/* BEGIN: CTA Section */}
        <section className="py-24 px-6 bg-brand-cream text-center shrink-0">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-4xl md:text-5xl mb-6">Ready to Dine?</h2>
            <p className="text-gray-600 text-lg mb-10 leading-relaxed font-sans">Join thousands of diners who have reclaimed their time and enhanced their restaurant experiences with Kezdes.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="px-12 py-5 bg-brand-green text-white rounded-full font-bold text-lg hover:bg-opacity-95 transition-all shadow-xl font-sans inline-block">Join Kezdes Today</Link>
              <Link to="/discover" className="px-12 py-5 border-2 border-brand-green text-brand-green rounded-full font-bold text-lg hover:bg-brand-green hover:text-white transition-all font-sans inline-block">Learn More</Link>
            </div>
          </div>
        </section>
        {/* END: CTA Section */}
      </main>

      {/* BEGIN: Footer */}
      <footer className="bg-brand-accent/20 pt-16 pb-8 px-6 border-t border-brand-accent">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <span className="font-serif text-3xl font-bold text-brand-green mb-6 block">Kezdes</span>
              <p className="text-gray-500 text-sm leading-relaxed font-sans">Elevating the dining experience through seamless technology and culinary passion.</p>
            </div>
            <div>
              <h5 className="font-bold mb-6 font-sans">Explore</h5>
              <ul className="space-y-4 text-sm text-gray-600 font-sans">
                <li><Link className="hover:text-brand-gold transition-colors" to="/discover">Find Restaurants</Link></li>
                <li><Link className="hover:text-brand-gold transition-colors" to="#">Gift Cards</Link></li>
                <li><Link className="hover:text-brand-gold transition-colors" to="#">Dining Blog</Link></li>
                <li><Link className="hover:text-brand-gold transition-colors" to="#">Cuisines</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 font-sans">Company</h5>
              <ul className="space-y-4 text-sm text-gray-600 font-sans">
                <li><Link className="hover:text-brand-gold transition-colors" to="#">About Us</Link></li>
                <li><Link className="hover:text-brand-gold transition-colors" to="#">Careers</Link></li>
                <li><Link className="hover:text-brand-gold transition-colors" to="#">Privacy Policy</Link></li>
                <li><Link className="hover:text-brand-gold transition-colors" to="#">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 font-sans">Follow Us</h5>
              <div className="flex gap-4">
                {/* Social Icons Placeholders */}
                <a className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center text-white hover:bg-brand-gold transition-colors" href="#">
                  <span className="sr-only">Instagram</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.607.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.063 1.366-.333 2.633-1.308 3.608-.975-.975-2.242 1.245-3.607 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.063-2.633-.333-3.608-1.308-.975-.975-1.245-2.242-1.308-3.607-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.607-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path></svg>
                </a>
                <a className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center text-white hover:bg-brand-gold transition-colors" href="#">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-400 border-t border-brand-accent pt-8 font-sans">
            © 2024 Kezdes Technologies Inc. All rights reserved. Elegant dining, simplified.
          </div>
        </div>
      </footer>
      {/* END: Footer */}
    </div>
  );
}
