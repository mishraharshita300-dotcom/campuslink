import { Link } from 'react-router-dom';
import {
  GraduationCap, MessageSquare, Users, Rss, Calendar, Shield,
  ArrowRight, Search, Bell, Sparkles, CheckCircle2, Zap, Heart,
  Star,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8f7ff] dark:bg-[#16162a] transition-colors">
      {/* Nav */}
      <nav className="border-b border-[#e6e4ff] dark:border-[#2c2b4a] sticky top-0 z-30 bg-[#f8f7ff]/85 dark:bg-[#16162a]/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">CampusLink</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
              Sign in
            </Link>
            <Link to="/register" className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg transition active:scale-95">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-wave relative overflow-hidden bg-[#f1f0ff] dark:bg-[#211d5c]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f8f7ff] via-[#efedff] to-[#ddd9ff] dark:from-[#211d5c] dark:via-[#25215f] dark:to-[#302c88]" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                The campus communication platform
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-6">
                Everything campus,<br />
                <span className="bg-gradient-to-r from-teal-600 via-[#6f63ff] to-cyan-600 bg-clip-text text-transparent">one platform.</span>
              </h1>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed mb-8">
                Chat with classmates, join course and club groups, connect with alumni mentors, share on the community feed, discover campus events, and never miss what matters.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 active:scale-95 transition shadow-lg shadow-teal-600/20">
                  Get started free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                  Sign in
                </Link>
              </div>
              <div className="flex items-center gap-4 mt-8">
                <div className="flex -space-x-2">
                  {['from-teal-500 to-cyan-600', 'from-blue-500 to-indigo-600', 'from-amber-500 to-orange-600', 'from-rose-500 to-pink-600'].map((g, i) => (
                    <div key={i} className={'w-8 h-8 rounded-full bg-gradient-to-br ' + g + ' border-2 border-white dark:border-slate-950'} />
                  ))}
                </div>
                <p className="text-sm text-slate-400">Join your campus community today</p>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#b1aaff]/50 to-[#9ebcff]/40 dark:from-[#6f63ff]/30 dark:to-[#5277f5]/20 rounded-3xl blur-2xl" />
              <img
                src="/2slider2.jpg"
                alt="Students walking on campus"
                className="relative rounded-3xl shadow-2xl w-full object-cover"
              />
              {/* Floating cards */}
              <div className="absolute top-4 -left-4 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2 animate-float">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">New message</p>
                  <p className="text-xs text-slate-400">from Sarah</p>
                </div>
              </div>
              <div className="absolute bottom-4 -right-4 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2 animate-float [animation-delay:1s]">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Hackathon 2026</p>
                  <p className="text-xs text-slate-400">42 going</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-[#e6e4ff] dark:border-[#2c2b4a] bg-white/60 dark:bg-[#1c1c35]/70">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <StatCard value="7" label="Core features" />
            <StatCard value="Real-time" label="Live updates" />
            <StatCard value="3" label="User roles" />
            <StatCard value="100%" label="Secure & moderated" />
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
            Everything you need, nothing you don't
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Seven integrated tools designed for how campuses actually communicate.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Real-time DMs"
            description="1:1 chats with typing indicators, read receipts, and full message history."
            color="bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400"
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Group Channels"
            description="Course, club, and hostel groups with announcement channels and invite codes."
            color="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
          />
          <FeatureCard
            icon={<Rss className="w-6 h-6" />}
            title="Community Feed"
            description="Share posts with images, like and comment, reply in threads, and see everything live."
            color="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
          />
          <FeatureCard
            icon={<Calendar className="w-6 h-6" />}
            title="Campus Events"
            description="Browse events on a calendar, RSVP with going/interested, and manage capacity."
            color="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
          />
          <FeatureCard
            icon={<GraduationCap className="w-6 h-6" />}
            title="Alumni Connect"
            description="Find verified alumni by department, year, or company. Send connection requests with a message."
            color="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
          />
          <FeatureCard
            icon={<Search className="w-6 h-6" />}
            title="Global Search"
            description="Find people, groups, events, and posts from one unified search bar."
            color="bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400"
          />
          <FeatureCard
            icon={<Bell className="w-6 h-6" />}
            title="Smart Notifications"
            description="Connection requests, likes, comments, admin alerts — all in one real-time inbox."
            color="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Safe & Secure"
            description="Role-based access, alumni verification, content reporting, and admin moderation tools."
            color="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          />
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="Beautiful by default"
            description="Dark mode, responsive design, smooth animations, and a polished interface on every screen."
            color="bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white/60 dark:bg-[#1c1c35]/70 border-y border-[#e6e4ff] dark:border-[#2c2b4a]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
              Get started in seconds
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              step="01"
              icon={<ArrowRight className="w-5 h-5" />}
              title="Create your account"
              description="Sign up as a student or alumni. Alumni accounts get verified by admins for trust."
            />
            <StepCard
              step="02"
              icon={<Users className="w-5 h-5" />}
              title="Join the community"
              description="Search for classmates, join groups with invite codes, and start chatting immediately."
            />
            <StepCard
              step="03"
              icon={<Zap className="w-5 h-5" />}
              title="Stay connected"
              description="Post on the feed, RSVP to events, connect with alumni, and get real-time notifications."
            />
          </div>
        </div>
      </section>

      {/* Feature highlight: Events */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative order-2 lg:order-1">
            <img
              src="https://images.pexels.com/photos/7944181/pexels-photo-7944181.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
              alt="Graduates celebrating"
              className="rounded-3xl shadow-xl w-full object-cover"
            />
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-4">
              <Calendar className="w-4 h-4" />
              Events & RSVP
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
              Never miss a campus moment
            </h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Browse events on a beautiful calendar, filter by category, RSVP with one tap, and see who's going. Event creators can set capacity limits, upload cover images, and manage their events.
            </p>
            <ul className="space-y-3">
              {[
                'Calendar and list views with category filters',
                'RSVP with going, interested, or can\'t go',
                'Capacity limits with automatic enforcement',
                'Cover image uploads for eye-catching events',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
            Built for everyone on campus
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TestimonialCard
            quote="The alumni directory made it so easy to find mentors in my field. I connected with three graduates working at companies I'm interested in."
            author="CS Student"
            role="Class of 2027"
          />
          <TestimonialCard
            quote="As an alum, I love staying connected to my campus. The verification process was quick, and I can share career advice with current students."
            author="Software Engineer"
            role="Class of 2020"
          />
          <TestimonialCard
            quote="The events calendar is a game-changer. I can see everything happening on campus in one place and RSVP without checking five different group chats."
            author="Student Leader"
            role="Class of 2026"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-700 p-12 text-center">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          </div>
          <div className="relative">
            <Heart className="w-10 h-10 text-white/80 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">Ready to connect your campus?</h2>
            <p className="text-teal-100 mb-8 max-w-lg mx-auto">
              Join in seconds and start chatting with your campus community. It's free and always will be.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-teal-700 font-semibold hover:bg-teal-50 active:scale-95 transition shadow-lg">
              Create your account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e6e4ff] dark:border-[#2c2b4a] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">CampusLink</span>
          </div>
          <p className="text-sm text-slate-400">Real-time campus communication platform</p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition bg-white dark:bg-slate-900">
      <div className={'w-12 h-12 rounded-xl ' + color + ' flex items-center justify-center mb-4 transition group-hover:scale-110'}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ step, icon, title, description }: { step: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
          {icon}
        </div>
        <span className="text-3xl font-bold text-slate-100 dark:text-slate-800">{step}</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{quote}</p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
          {author.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{author}</p>
          <p className="text-xs text-slate-400">{role}</p>
        </div>
      </div>
    </div>
  );
}
