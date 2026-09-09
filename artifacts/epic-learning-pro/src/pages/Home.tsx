import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, ArrowRight, BookOpen, Star, Mail, CheckCircle2,
  MessageCircle, Users, FileEdit, Award,
  Send, Phone, Target, Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

import logoPath from "@assets/logo_1786572107482.png";
import oliviaPath from "@assets/olivia.cropped_1786576741119.png";
import octaviaPath from "@assets/octavia.cropped_1786576741121.png";
import mikellePath from "@assets/mikelle.cropped_1786576741122.png";

function useSparks() {
  useEffect(() => {
    const handleMouseClick = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const numSparks = Math.floor(Math.random() * 8) + 14;
      for (let i = 0; i < numSparks; i++) createSpark(clientX, clientY);
    };
    const createSpark = (x: number, y: number) => {
      const spark = document.createElement("div");
      const size = Math.random() * 5 + 5; // 5–10px
      spark.className = "fixed pointer-events-none rounded-full z-[9999]";
      spark.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;background:radial-gradient(circle, #FFD966 0%, #CAA747 60%, #b8892a 100%);box-shadow:0 0 6px 2px rgba(202,167,71,0.7)`;
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 90 + 55;
      const duration = Math.random() * 600 + 600;
      spark.animate(
        [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
         { transform: `translate(${Math.cos(angle) * velocity}px,${Math.sin(angle) * velocity}px) scale(0)`, opacity: 0 }],
        { duration, easing: 'cubic-bezier(0.25,1,0.5,1)', fill: 'forwards' }
      );
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), duration);
    };
    window.addEventListener("click", handleMouseClick);
    return () => window.removeEventListener("click", handleMouseClick);
  }, []);
}

const FadeIn = ({ children, delay = 0, className = "", direction = "up" }: {
  children: React.ReactNode; delay?: number; className?: string; direction?: "up" | "left" | "right" | "none";
}) => {
  const initial: Record<string, number> = { opacity: 0 };
  if (direction === "up") initial.y = 30;
  if (direction === "left") initial.x = 30;
  if (direction === "right") initial.x = -30;
  return (
    <motion.div initial={initial} whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}>
      {children}
    </motion.div>
  );
};

const testimonials = [
  { name: "Will F.",    text: "Olivia is an icon in the teaching industry. Highly recommended!" },
  { name: "Robert W.", text: "Extremely knowledgeable and compassionate. Very professional." },
  { name: "Shannon D.", text: "The owner is amazing, hardworking and cares about everyone she does business with." },
  { name: "Irene B.",  text: "Epic Pro teaches on a level that, learning never ends so why not enjoy it all the time cuz it's fun" },
  { name: "Dan D.",    text: "Very knowledgeable and experienced!" },
];

const serviceOptions = [
  "Consulting & Coaching",
  "Professional Seminars",
  "Proofreading & Editing",
  "GED Coaching",
  "Homeschooling Coaching",
  "Special Needs Educational Coaching",
  "Other / Not Sure Yet",
];

const painPoints = [
  { title: "Homeschooling & Special Needs", desc: "Overwhelmed parents trying to navigate homeschooling or a child's unique educational needs.", icon: Users },
  { title: "Career Roadblocks",            desc: "Stuck without credentials like a GED, limiting your opportunities for advancement.",         icon: Award },
  { title: "Team Friction",                desc: "Teams with poor communication, unclear leadership, and misaligned goals.",                  icon: MessageCircle },
  { title: "Unprofessional Presence",      desc: "Professional documents with errors that silently undermine your credibility.",              icon: FileEdit },
  { title: "Weak Training Programs",       desc: "Businesses lacking strong, engaging training that retains and empowers employees.",         icon: BookOpen },
  { title: "Unfocused Goals",             desc: "Without clear direction or an accountability partner, ambitions stay dreams instead of achievements.", icon: Target },
];

export default function Home() {
  useSparks();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* ── Testimonial marquee ── */
  const marqueeTrackRef = useRef<HTMLDivElement>(null);
  const marqueeAnimRef = useRef<Animation | null>(null);
  const isDraggingRef = useRef(false);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    const el = marqueeTrackRef.current;
    if (!el) return;
    const t = setTimeout(() => { marqueeAnimRef.current = el.getAnimations()[0] ?? null; }, 150);
    return () => clearTimeout(t);
  }, []);

  const pauseMarquee = () => {
    isHoveredRef.current = true;
    marqueeAnimRef.current?.pause();
  };
  const resumeMarquee = () => {
    isHoveredRef.current = false;
    if (!isDraggingRef.current) marqueeAnimRef.current?.play();
  };
  const handleMarqueeDrag = (startClientX: number) => {
    const anim = marqueeAnimRef.current;
    const el = marqueeTrackRef.current;
    if (!anim || !el) return;
    anim.pause();
    isDraggingRef.current = true;
    const startTime = (anim.currentTime as number) ?? 0;
    const totalDuration = 40000;
    const pxPerMs = (el.scrollWidth / 2) / totalDuration;
    const onMove = (ev: MouseEvent | TouchEvent) => {
      const cx = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const delta = cx - startClientX;
      let t = startTime - delta / pxPerMs;
      t = ((t % totalDuration) + totalDuration) % totalDuration;
      anim.currentTime = t;
    };
    const onEnd = () => {
      isDraggingRef.current = false;
      if (!isHoveredRef.current) anim.play();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  };

  /* ── Contact form ── */
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', service: '', message: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim())  e.lastName  = 'Last name is required';
    if (!form.email.trim())     e.email     = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.service)          e.service   = 'Please select a service';
    if (!form.message.trim())   e.message   = 'Message is required';
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({}); setSubmitting(true); setSubmitError('');
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) setSubmitError(data.error ?? 'Something went wrong. Please try again or email us directly.');
      else setSubmitted(true);
    } catch { setSubmitError('Network error. Please check your connection and try again, or email us directly.'); }
    finally   { setSubmitting(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (formErrors[name]) setFormErrors(p => { const n = { ...p }; delete n[name]; return n; });
    if (submitError) setSubmitError('');
  };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [copiedEmail, setCopiedEmail] = useState(false);
  const copyEmail = () => {
    navigator.clipboard.writeText('contact@epiclearningpro.com').then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    });
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    if (id === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    // For every non-hero section the header will be in its compact state (py-3 + h-12 logo ≈ 72px)
    // by the time the smooth scroll arrives, so use that fixed value.
    const COMPACT_HEADER_HEIGHT = 72;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - COMPACT_HEADER_HEIGHT, behavior: 'smooth' });
  };

  const navLinks = [
    { name: "Services",      id: "services"    },
    { name: "Testimonials",  id: "social-proof"},
    { name: "About",         id: "about"       },
    { name: "FAQ",           id: "faq"         },
  ];

  const inputBase = "w-full rounded-xl border px-4 py-3 text-sm bg-white/15 border-white/30 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all";
  const inputError = "border-red-300/70 focus:ring-red-300/50";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans select-none">

      {/* ── Sticky Header ── */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-border/50 py-3" : "bg-transparent py-5"}`}>
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-2 group outline-none" data-testid="link-logo-home">
            <img src={logoPath} alt="Epic Learning Pro Logo" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-sm transition-transform duration-300 group-hover:scale-105"
              data-editable-image="" data-key="logo" />
            <span className={`font-serif font-semibold text-base sm:text-xl tracking-tight transition-colors hidden sm:block ${isScrolled ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white"}`}
              data-editable="" data-key="brand.name">
              Epic Learning Pro
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8" data-editable-nav="">
            {navLinks.map((link, i) => (
              <button key={link.name} onClick={() => scrollTo(link.id)} data-testid={`link-nav-${link.id}`}
                data-key={`nav.link-${i}`}
                className={`text-base font-medium transition-colors outline-none ${isScrolled ? "text-muted-foreground hover:text-primary" : "text-white/80 hover:text-white"}`}>
                {link.name}
              </button>
            ))}
            {isScrolled ? (
              <Button onClick={() => scrollTo('contact')} className="rounded-full shadow-md hover:shadow-lg transition-all" data-testid="button-header-cta"
                data-key="nav.cta">
                Let's Connect
              </Button>
            ) : (
              <button onClick={() => scrollTo('contact')} data-testid="button-header-cta"
                data-key="nav.cta"
                className="rounded-full px-5 py-2 text-sm font-semibold bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-all">
                Let's Connect
              </button>
            )}
          </nav>

          <button className={`md:hidden p-2 ${isScrolled ? "text-foreground" : "text-white"}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="button-mobile-menu">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
              className="md:hidden absolute top-full left-0 w-full bg-white border-b border-border shadow-lg py-4 px-4 flex flex-col gap-2">
              {navLinks.map(link => (
                <button key={link.name} onClick={() => scrollTo(link.id)}
                  className="text-left py-3 px-4 text-base font-medium text-foreground hover:bg-muted rounded-xl transition-colors">
                  {link.name}
                </button>
              ))}
              <Button onClick={() => scrollTo('contact')} className="w-full mt-2 rounded-full">Let's Connect</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero — purple gradient ── */}
      <section id="hero" className="relative flex items-center h-svh overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #5B2DA8 0%, #8B5FE6 55%, #A472F0 100%)' }}>
        {/* Decorative overlays */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(202,167,71,0.2) 0%, transparent 55%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(255,255,255,0.1) 0%, transparent 55%)' }} />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <FadeIn delay={0.05}>
              <p className="text-2xl sm:text-3xl md:text-4xl font-serif italic mb-4 tracking-wide"
                style={{ color: '#F0C84A', textShadow: '0 2px 16px rgba(202,167,71,0.45)' }}
                data-editable="" data-key="home.hero-tagline">
                Imagine. Believe. Achieve.
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-serif font-semibold tracking-tight text-white mb-6 leading-tight"
                data-editable="" data-key="home.hero-title">
                Professional Training{" "}
                <span className="text-white/80">&amp; Services</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="text-xl sm:text-2xl md:text-3xl text-white/80 mb-10 max-w-3xl mx-auto leading-relaxed"
                data-editable="" data-key="home.hero-subtitle">
                With over 30 years of experience, we help individuals and teams transform their potential into tangible results.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={() => scrollTo('contact')} data-testid="button-hero-cta"
                  className="inline-flex items-center justify-center gap-2 rounded-full w-full sm:w-auto text-base h-14 px-8 bg-white text-primary font-semibold shadow-lg hover:bg-white/90 hover:scale-105 transition-all group">
                  <span data-key="hero.cta-primary">Start Your Journey</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button onClick={() => scrollTo('services')} data-testid="button-hero-explore"
                  className="inline-flex items-center justify-center rounded-full w-full sm:w-auto text-base h-14 px-8 bg-white/15 text-white font-semibold border border-white/30 hover:bg-white/25 transition-all">
                  <span data-key="hero.cta-secondary">Explore Services</span>
                </button>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Problem / Agitate — soft lavender tint ── */}
      <section id="agitate" className="py-16 md:py-28" style={{ background: 'linear-gradient(135deg, #ede8ff 0%, #e4daff 100%)' }}>
        <div className="container mx-auto px-4 sm:px-6">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <h2 className="text-3xl md:text-5xl font-serif font-semibold mb-4 text-foreground"
                data-editable="" data-key="agitate.heading">Feeling stuck or overwhelmed?</h2>
              <p className="text-lg md:text-xl text-muted-foreground"
                data-editable="" data-key="agitate.subtext">You are not alone. Whether you're an individual facing a hurdle or a team struggling to connect, the path forward isn't always clear.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto"
            data-editable-list="agitate" data-key="agitate.items">
            {painPoints.map((pain, i) => (
              <FadeIn key={i} delay={0.07 * i} direction="up">
                <div className="bg-white rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-1 border border-primary/10 shadow-sm">
                  <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <pain.icon size={22} />
                  </div>
                  <h3 className="font-semibold text-xl mb-2 text-foreground"
                  data-editable="" data-key={`agitate.card-${i}-title`}>{pain.title}</h3>
                  <p className="text-muted-foreground text-base leading-relaxed"
                    data-editable="" data-key={`agitate.card-${i}-desc`}>{pain.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.5} className="mt-14 text-center">
            <p className="text-2xl font-medium text-foreground font-serif italic"
              data-editable="" data-key="agitate.closing">We see you. We understand. And we know exactly how to help.</p>
          </FadeIn>
        </div>
      </section>

      {/* ── Services — UNCHANGED ── */}
      <section id="services" className="py-16 md:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <FadeIn className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
            <h2 className="text-sm font-bold tracking-wider text-primary uppercase mb-3"
              data-editable="" data-key="services.label">Our Services</h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold mb-5"
              data-editable="" data-key="services.heading">Expertise that drives results.</h3>
            <p className="text-lg md:text-xl text-muted-foreground"
              data-editable="" data-key="services.subtext">From corporate training programs to individual coaching and professional editing, we tailor our approach to your specific goals.</p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8"
            data-editable-list="services" data-key="services.items">
            <FadeIn delay={0.1} className="flex h-full">
              <Card className="flex flex-col h-full border-border/60 shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-500 overflow-hidden group w-full">
                <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/50" />
                <CardHeader className="pb-4">
                  <div className="h-13 w-13 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 text-primary p-2.5">
                    <Users size={26} />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-serif" data-editable="" data-key="services.card-0-title">Consulting & Coaching</CardTitle>
                  <CardDescription className="text-base pt-1" data-editable="" data-key="services.card-0-subtitle">For Businesses & Individuals</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground mb-5 text-base leading-relaxed" data-editable="" data-key="services.card-0-desc">If your business values progress and proactivity, you need a strong training program. We create exciting educational plans unique to your team's needs. Well-trained, happy people perform better!</p>
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-foreground mb-3" data-editable="" data-key="services.card-0-section">Specialties</h4>
                  <ul className="space-y-2">
                    {["Business Training Programs", "Leadership & HR Coaching", "GED Coaching", "Homeschooling & Special Needs"].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span data-editable="" data-key={`services.card-0-bullet-${i}`}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-0 pb-6 border-t border-border/50 mt-auto bg-muted/20">
                  <div className="pt-4 w-full text-sm text-muted-foreground italic" data-editable="" data-key="services.card-0-note">Negotiated hourly/weekly/monthly. Coaching bundles available.</div>
                </CardFooter>
              </Card>
            </FadeIn>

            <FadeIn delay={0.2} className="flex h-full">
              <Card className="flex flex-col h-full border-border/60 shadow-md hover:shadow-xl hover:border-secondary/30 transition-all duration-500 overflow-hidden group relative w-full">
                <div className="h-1.5 w-full bg-gradient-to-r from-secondary to-secondary/50" />
                <CardHeader className="pb-4 relative z-10">
                  <div className="h-13 w-13 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-secondary group-hover:text-white transition-all duration-300 text-secondary p-2.5">
                    <Award size={26} />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-serif" data-editable="" data-key="services.card-1-title">Professional Seminars</CardTitle>
                  <CardDescription className="text-base pt-1" data-editable="" data-key="services.card-1-subtitle">Transform Your Team</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow relative z-10">
                  <p className="text-muted-foreground mb-5 text-base leading-relaxed" data-editable="" data-key="services.card-1-desc">Improve communication skills, gain expert knowledge, and expand focus with actionable seminars. Topics are matched to your training goals and team's specific interests.</p>
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-foreground mb-3" data-editable="" data-key="services.card-1-section">Popular Topics</h4>
                  <ul className="space-y-2">
                    {["Intuitive Leadership Series", "Confident Communication", "Mental Health for Professionals", "Workflow & Organization"].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 shrink-0" /><span data-editable="" data-key={`services.card-1-bullet-${i}`}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-0 pb-6 border-t border-border/50 mt-auto bg-muted/20 relative z-10">
                  <div className="pt-4 w-full text-sm text-muted-foreground italic" data-editable="" data-key="services.card-1-note">Offered as 1-3 day formats or 5 half-day sessions.</div>
                </CardFooter>
              </Card>
            </FadeIn>

            <FadeIn delay={0.3} className="flex h-full md:col-span-2 lg:col-span-1">
              <Card className="flex flex-col h-full border-border/60 shadow-md hover:shadow-xl hover:border-accent/50 transition-all duration-500 overflow-hidden group w-full">
                <div className="h-1.5 w-full bg-gradient-to-r from-accent to-accent/50" />
                <CardHeader className="pb-4">
                  <div className="h-13 w-13 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-300 text-accent p-2.5">
                    <FileEdit size={26} />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-serif" data-editable="" data-key="services.card-2-title">Proofreading & Editing</CardTitle>
                  <CardDescription className="text-base pt-1" data-editable="" data-key="services.card-2-subtitle">Polish Your Presence</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground mb-5 text-base leading-relaxed" data-editable="" data-key="services.card-2-desc">Ensure your company's written communication is flawless. Any professional document will be edited to perfection—accuracy of grammar, punctuation, usage, and context.</p>
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-foreground mb-3" data-editable="" data-key="services.card-2-section">Documents Covered</h4>
                  <ul className="space-y-2">
                    {["Blogs, Newsletters & Emails", "Proposals & Contracts", "Professional Posts", "Essays & Articles"].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" /><span data-editable="" data-key={`services.card-2-bullet-${i}`}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-0 pb-6 border-t border-border/50 mt-auto bg-muted/20">
                  <div className="pt-4 w-full text-sm text-muted-foreground italic" data-editable="" data-key="services.card-2-note">Pricing by word count or by project.</div>
                </CardFooter>
              </Card>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Social Proof — rich purple, redesigned cards ── */}
      <section id="social-proof" className="py-16 md:py-28 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #6b3fbf 0%, #8B5FE6 50%, #7a52d4 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(54,166,221,0.25) 0%, transparent 55%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(202,167,71,0.15) 0%, transparent 55%)' }} />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 md:mb-14 gap-6">
            <FadeIn className="max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-serif font-semibold mb-3 text-white"
                data-editable="" data-key="testimonials.heading">Trusted by professionals.</h2>
              <p className="text-lg md:text-xl text-white/70"
                data-editable="" data-key="testimonials.subtext">Real words from real clients about working with Epic Learning Pro.</p>
            </FadeIn>
            <FadeIn delay={0.2} direction="left">
              <div className="flex items-center gap-4 bg-white/15 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/25 shrink-0">
                <div className="text-4xl font-bold text-white">30+</div>
                <div className="text-sm font-medium text-white/80 leading-tight">Years of<br />Experience</div>
              </div>
            </FadeIn>
          </div>

          {/* Infinite marquee track */}
          <FadeIn delay={0.1}>
            <div
              className="overflow-hidden cursor-grab active:cursor-grabbing"
              data-editable-list="testimonials" data-key="testimonials.items"
              style={{
                maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
              }}
              onMouseEnter={pauseMarquee}
              onMouseLeave={resumeMarquee}
              onMouseDown={e => handleMarqueeDrag(e.clientX)}
              onTouchStart={e => handleMarqueeDrag(e.touches[0].clientX)}
            >
              <div
                ref={marqueeTrackRef}
                className="flex gap-5 pointer-events-none"
                style={{
                  width: 'max-content',
                  animation: 'marquee-scroll 40s linear infinite',
                }}
              >
                {[...testimonials, ...testimonials].map((t, i) => (
                  <div key={i} className="w-[300px] sm:w-[350px] flex-shrink-0">
                    <div className="bg-white rounded-2xl p-7 h-full flex flex-col shadow-xl">
                      {/* Top: stars + source */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, j) => <Star key={j} size={15} className="text-[#CAA747] fill-[#CAA747]" />)}
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
                          {...(i < testimonials.length ? {'data-key': `testimonials.item-${i}-source`} : {})}>Alignable</span>
                      </div>

                      {/* Quote */}
                      <div className="flex-grow mb-6 relative">
                        <Quote size={28} className="text-primary/15 absolute -top-1 -left-1 pointer-events-none" />
                        <p className="text-foreground text-base font-serif italic leading-relaxed pl-5"
                          {...(i < testimonials.length ? {'data-key': `testimonials.item-${i}-text`} : {})}>
                          {t.text}
                        </p>
                      </div>

                      {/* Reviewer */}
                      <div className="flex items-center gap-3 pt-5 border-t border-border/50">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-white"
                          style={{ background: 'linear-gradient(135deg, #5B2DA8, #8B5FE6)' }}>
                          {t.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-tight"
                            {...(i < testimonials.length ? {'data-key': `testimonials.item-${i}-name`} : {})}>{t.name}</p>
                          <p className="text-xs text-muted-foreground">Verified Client Review</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-center text-white/45 text-sm mt-6 tracking-wide">drag or hover to control</p>
          </FadeIn>
        </div>
      </section>

      {/* ── About — purple-tinted warm gradient ── */}
      <section id="about" className="py-16 md:py-28"
        style={{ background: 'linear-gradient(160deg, #fdf7ee 0%, #ede8ff 50%, #e4daff 100%)' }}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-16 md:mb-24">
            <FadeIn direction="right">
              <h2 className="text-sm font-bold tracking-wider text-primary uppercase mb-3">About Us</h2>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold mb-5"
                data-editable="" data-key="about.heading">Imagine. Believe. Achieve.</h3>
              <p className="text-xl font-medium text-foreground mb-5 border-l-4 border-accent pl-4"
                data-editable="" data-key="about.slogan">
                Epic Learning Pro is all about making good lives great!
              </p>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed"
                data-editable="" data-key="about.description">
                Our certified educators have over 30 years of experience in enlightening minds, providing accurate information, and transforming dreams into reality. Whatever you can imagine, we'll help you achieve!
              </p>
              <div className="bg-white/70 backdrop-blur-sm border border-primary/15 p-6 rounded-2xl shadow-sm relative">
                <div className="absolute top-4 left-4 text-5xl leading-none text-primary/15 font-serif select-none">"</div>
                <p className="text-lg font-serif italic text-foreground relative z-10 text-center px-4"
                  data-editable="" data-key="about.quote">Whatever the mind can think and perceive, it can achieve.</p>
                <p className="text-sm text-muted-foreground text-center mt-3"
                  data-editable="" data-key="about.quote-attribution">— Napoleon Hill</p>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} direction="left" className="order-first lg:order-last">
              <img src={logoPath} alt="Epic Learning Pro" className="w-full max-w-xs sm:max-w-sm mx-auto rounded-full shadow-2xl bg-white p-4"
                data-editable-image="" data-key="about.logo" />
            </FadeIn>
          </div>

          <FadeIn>
            <h3 className="text-2xl sm:text-3xl font-serif font-semibold mb-10 md:mb-14 text-center"
              data-editable="" data-key="about.team-heading">Meet the Team</h3>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto"
            data-editable-list="team" data-key="team.members">
            {[
              { name: "Olivia D Barlow",  title: "Owner & Educator",                   suffix: "BS, MEd", img: oliviaPath  },
              { name: "Octavia Barlow",   title: "Scheduling & Operations Coordinator", suffix: "",        img: octaviaPath },
              { name: "Mikelle Barlow",   title: "Office Manager",                      suffix: "",        img: mikellePath },
            ].map((member, i) => (
              <FadeIn key={i} delay={0.15 + i * 0.1} direction="up">
                <div className="group text-center">
                  <div className="relative mb-5 inline-block">
                    <div className="absolute inset-0 bg-primary rounded-full transform translate-y-2 translate-x-2 opacity-0 group-hover:opacity-20 transition-all duration-300" />
                    <img src={member.img} alt={member.name}
                      className="w-40 h-40 sm:w-48 sm:h-48 md:w-60 md:h-60 lg:w-64 lg:h-64 object-cover object-center rounded-full shadow-md border-4 border-white relative z-10"
                      data-testid={`img-team-${member.name.split(' ')[0].toLowerCase()}`}
                      data-editable-image="" data-key={`team.member-${i}-photo`} />
                  </div>
                  <h4 className="text-lg sm:text-xl font-serif font-semibold" data-key={`team.member-${i}-name`}>
                    {member.name}
                    {member.suffix && <span className="text-sm font-sans text-muted-foreground font-normal">, {member.suffix}</span>}
                  </h4>
                  <p className="text-primary font-medium mt-1 text-sm sm:text-base" data-key={`team.member-${i}-title`}>{member.title}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ — warm brand gradient ── */}
      <section id="faq" className="py-16 md:py-28 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f5f0ff 0%, #ede5ff 50%, #e4daff 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(139,95,230,0.08) 0%, transparent 60%)' }} />

        <div className="container mx-auto px-4 sm:px-6 max-w-3xl relative z-10">
          <FadeIn className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-5xl font-serif font-semibold mb-4 text-foreground"
              data-editable="" data-key="faq.heading">Common Questions</h2>
            <p className="text-lg md:text-xl text-muted-foreground"
              data-editable="" data-key="faq.subtext">Everything you need to know about working with us.</p>
          </FadeIn>

          <FadeIn delay={0.2}>
            {/* data-editable-list="faqs" → yellow outline, panel only. Never blue in-place. */}
            <Accordion type="single" collapsible className="w-full space-y-3"
              data-editable-list="faqs" data-key="faqs.items">
              {[
                { q: "What types of coaching do you offer?",
                  a: "We offer coaching for both individuals and businesses. For individuals, we specialize in GED preparation, homeschooling guidance, and supporting parents of children with special needs. For businesses, we provide leadership coaching, HR professional coaching, and custom training program development." },
                { q: "How are your seminars structured and priced?",
                  a: "Seminars are flexible to fit your team's schedule. They can be structured as 1-day, 2-day, or 3-day formats, or broken into 5 half-day sessions. After discussing your goals, we submit a tailored proposal for your review before any commitment is made." },
                { q: "Do you work with individuals as well as businesses?",
                  a: "Absolutely. While we develop extensive corporate training and seminars for teams, we are deeply committed to individual success through one-on-one coaching bundles and educational support." },
                { q: "How does proofreading and editing pricing work?",
                  a: "We offer flexible pricing structures to suit your needs. Depending on the size and frequency of the work, pricing is negotiated either by word count or as a flat fee per project." },
                { q: "How do I get started?",
                  a: "The first step is a simple conversation. Fill out the form below or reach out to us directly. From there, we'll discuss your needs and craft a written proposal outlining the strategy, timeline, and pricing — with no pressure and no commitment until you're ready." },
              ].map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="bg-white/80 backdrop-blur-sm border border-primary/10 rounded-xl px-5 py-1 shadow-sm">
                  <AccordionTrigger className="text-lg sm:text-xl font-medium hover:no-underline text-foreground hover:text-primary transition-colors text-left py-4 [&>svg]:text-muted-foreground">
                    {/* data-key only — no data-editable; FAQ is yellow panel-only, never blue in-place */}
                    <span data-key={`faq.item-${i}-q`}>{item.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base sm:text-lg pt-1 pb-4 leading-relaxed">
                    <span data-key={`faq.item-${i}-a`}>{item.a}</span>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="py-16 md:py-28 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #5B2DA8 0%, #8B5FE6 55%, #A472F0 100%)' }}>
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(202,167,71,0.25) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <FadeIn className="text-center mb-10 md:mb-14">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold text-white mb-4"
                data-editable="" data-key="contact.heading">Let's work together.</h2>
              <p className="text-xl sm:text-2xl text-white/85 max-w-xl mx-auto font-light leading-relaxed"
                data-editable="" data-key="contact.subtext">
                Ready to transform your team or take the next step in your personal journey? We'd love to hear from you.
              </p>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="bg-white/10 backdrop-blur-sm border border-white/25 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl">
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                      <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-5">
                        <CheckCircle2 size={32} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-serif font-semibold text-white mb-3">Message Sent!</h3>
                      <p className="text-white/80 max-w-md mx-auto mb-6 leading-relaxed">
                        Thank you for reaching out! We'll be in touch with you soon.
                      </p>
                      <button onClick={() => { setSubmitted(false); setForm({ firstName: '', lastName: '', email: '', phone: '', service: '', message: '' }); }}
                        className="text-white/70 hover:text-white text-sm underline underline-offset-4 transition-colors">
                        Send another message
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form key="form" onSubmit={handleSubmit} noValidate className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-white text-sm font-medium mb-1.5" htmlFor="firstName">First Name <span className="text-[#CAA747]">*</span></label>
                          <input id="firstName" name="firstName" type="text" autoComplete="given-name" placeholder="First name"
                            value={form.firstName} onChange={handleChange} data-testid="input-contact-firstname"
                            className={`${inputBase} ${formErrors.firstName ? inputError : ''}`} />
                          {formErrors.firstName && <p className="text-red-200 text-xs mt-1">{formErrors.firstName}</p>}
                        </div>
                        <div>
                          <label className="block text-white text-sm font-medium mb-1.5" htmlFor="lastName">Last Name <span className="text-[#CAA747]">*</span></label>
                          <input id="lastName" name="lastName" type="text" autoComplete="family-name" placeholder="Last name"
                            value={form.lastName} onChange={handleChange} data-testid="input-contact-lastname"
                            className={`${inputBase} ${formErrors.lastName ? inputError : ''}`} />
                          {formErrors.lastName && <p className="text-red-200 text-xs mt-1">{formErrors.lastName}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-white text-sm font-medium mb-1.5" htmlFor="email">Email Address <span className="text-[#CAA747]">*</span></label>
                          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com"
                            value={form.email} onChange={handleChange} data-testid="input-contact-email"
                            className={`${inputBase} ${formErrors.email ? inputError : ''}`} />
                          {formErrors.email && <p className="text-red-200 text-xs mt-1">{formErrors.email}</p>}
                        </div>
                        <div>
                          <label className="block text-white text-sm font-medium mb-1.5" htmlFor="phone">
                            <span className="inline-flex items-center gap-1"><Phone size={13} /> Phone</span>
                          </label>
                          <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(555) 000-0000"
                            value={form.phone} onChange={handleChange} data-testid="input-contact-phone" className={inputBase} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-white text-sm font-medium mb-1.5" htmlFor="service">Service of Interest <span className="text-[#CAA747]">*</span></label>
                        <select id="service" name="service" value={form.service} onChange={handleChange}
                          data-testid="select-contact-service"
                          className={`${inputBase} ${formErrors.service ? inputError : ''} appearance-none cursor-pointer`}>
                          <option value="" className="text-foreground bg-white">Select a service…</option>
                          {serviceOptions.map(opt => <option key={opt} value={opt} className="text-foreground bg-white">{opt}</option>)}
                        </select>
                        {formErrors.service && <p className="text-red-200 text-xs mt-1">{formErrors.service}</p>}
                      </div>

                      <div>
                        <label className="block text-white text-sm font-medium mb-1.5" htmlFor="message">Message <span className="text-[#CAA747]">*</span></label>
                        <textarea id="message" name="message" rows={5}
                          placeholder="Tell us a little about your goals or what you're looking for…"
                          value={form.message} onChange={handleChange} data-testid="textarea-contact-message"
                          className={`${inputBase} resize-none ${formErrors.message ? inputError : ''}`} />
                        {formErrors.message && <p className="text-red-200 text-xs mt-1">{formErrors.message}</p>}
                      </div>

                      {submitError && (
                        <div className="bg-red-500/20 border border-red-300/40 rounded-xl px-4 py-3 text-white/90 text-sm">{submitError}</div>
                      )}

                      <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                        <button type="submit" disabled={submitting} data-testid="button-contact-submit"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-13 px-8 rounded-full bg-white text-primary font-semibold text-base hover:bg-white/90 hover:scale-105 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                          {submitting ? 'Sending…' : 'Send Message'}
                          <Send size={16} />
                        </button>
                        <p className="text-white/60 text-xs text-center sm:text-left leading-snug">We typically respond within 24 hours.</p>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>

            <FadeIn delay={0.3} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              {/* Contact section links — separate keys from footer (guide §3) */}
              <button onClick={copyEmail} data-editable-contact="" data-key="contact.section.link-1"
                data-href="mailto:contact@epiclearningpro.com"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors">
                {copiedEmail ? <CheckCircle2 size={16} /> : <Mail size={16} />}
                {copiedEmail ? 'Copied!' : 'contact@epiclearningpro.com'}
              </button>
              <span className="hidden sm:block text-white/30">·</span>
              <a href="https://www.alignable.com/paulden-az/epic-learning-pro" target="_blank" rel="noopener noreferrer"
                data-editable-contact="" data-key="contact.section.link-2"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors">
                Connect on Alignable
              </a>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 sm:py-12" style={{ background: 'linear-gradient(135deg, #ede8ff 0%, #e4daff 100%)' }}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 mb-7">
            {/* Logo + brand name — shared data-key="logo" keeps nav + footer in sync */}
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-3 outline-none hover:opacity-80 transition-opacity" data-testid="button-footer-home">
              <img src={logoPath} alt="Logo" className="h-9 w-9 rounded-full bg-white shadow-sm p-1"
                data-editable-image="" data-key="logo" />
              <span className="font-serif font-semibold text-lg tracking-tight text-foreground"
                data-editable="" data-key="brand.name">Epic Learning Pro</span>
            </button>
            <div className="flex items-center gap-5 text-sm text-muted-foreground">
              {/* Footer links — separate keys from contact section (guide §3) */}
              <a href="https://www.alignable.com/paulden-az/epic-learning-pro" target="_blank" rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
                data-editable-contact="" data-key="footer.link-1">Alignable</a>
              <button onClick={copyEmail} className="hover:text-primary transition-colors"
                data-editable-contact="" data-key="footer.link-2"
                data-href="mailto:contact@epiclearningpro.com">
                {copiedEmail ? 'Copied!' : 'Email'}
              </button>
            </div>
          </div>
          <div className="border-t border-primary/15 pt-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <p data-editable="" data-key="footer.copyright">Copyright 2026 © Epic Learning Pro. All rights reserved.</p>
            {/* "Website Design by…" is NOT editable per guide — no data attributes */}
            <p>Website Design by{' '}
              <a href="https://cliquestudios.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/70 transition-colors">Clique Studios IO</a>
              <span id="ap-gear-anchor"></span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
