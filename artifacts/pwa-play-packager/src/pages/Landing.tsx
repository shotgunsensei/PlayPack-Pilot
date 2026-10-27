import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { Rocket, Shield, Zap, Package, FileCode, GitBranch, CheckCircle2, ChevronDown, ArrowRight, Puzzle, Settings, Terminal, FileText, Download, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import './LandingQuality.css';

const features = [
  { icon: Settings, title: 'Smart Project Setup', desc: 'Clean form captures everything: app metadata, package ID, URLs, versioning.' },
  { icon: Shield, title: 'PWA Validation Engine', desc: 'Instant checks for HTTPS, manifest completeness, URL alignment, and required fields.' },
  { icon: Puzzle, title: 'Signing Planner', desc: 'Guided keystore setup with generated commands and fingerprint extraction.' },
  { icon: FileCode, title: 'Asset Links Generator', desc: 'Auto-generate assetlinks.json with your package ID and SHA-256 fingerprint.' },
  { icon: Terminal, title: 'Bubblewrap CLI Builder', desc: 'Step-by-step commands in Bash or PowerShell for local builds.' },
  { icon: GitBranch, title: 'GitHub Actions Generator', desc: 'A build workflow template with explicit signing and review prerequisites.' },
  { icon: CheckCircle2, title: 'Release Checklist', desc: 'Interactive checklist covering every step from build to Play Console submission.' },
  { icon: FileText, title: 'Documentation Suite', desc: 'Generated README, release notes, troubleshooting guide, and deployment SOP.' },
  { icon: Download, title: 'Export Everything', desc: 'Download individual files or a complete deployment package as ZIP.' },
  { icon: BarChart3, title: 'Readiness Scoring', desc: 'Real-time scoring across 5 categories so you know exactly where you stand.' },
];

const painPoints = [
  'Half the docs are outdated or incomplete',
  'Signing keys and SHA fingerprints confuse everyone',
  'Assetlinks.json breaks silently',
  'Bubblewrap setup feels fragile',
  'Play Console rejects builds with zero clarity',
];

const faqs = [
  { q: 'Does PlayPack Pilot submit apps to Google Play?', a: 'No. PlayPack Pilot generates the configs, commands, documentation, and deployment packages you need. You still upload to Play Console yourself. We never mislead about capabilities.' },
  { q: 'Do I need a backend or build server?', a: 'No. PlayPack Pilot runs entirely in your browser. Generated commands are meant to be run in your local terminal or CI/CD pipeline.' },
  { q: 'What is a TWA / Trusted Web Activity?', a: 'A TWA wraps your Progressive Web App in an Android shell using Chrome Custom Tabs. It is the recommended way to put a PWA on the Play Store without maintaining a native codebase.' },
  { q: 'Is my data stored securely?', a: 'Project information stays in this browser unless you export it. Keep signing keys, passwords, and other secrets outside project files. Site diagnostics send the public URL you choose to the application API; they are separate from local project storage.' },
  { q: 'Can I export my project and use it later?', a: 'Yes. You can export any project as a JSON file and re-import it anytime, even on a different device.' },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="pp-landing min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="pp-header max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg">PlayPack Pilot</span>
          </div>
          <nav aria-label="Main navigation" className="pp-navigation flex items-center gap-3">
            <Button variant="ghost" onClick={() => setLocation('/pricing')}>Pricing</Button>
            <Button variant="ghost" onClick={() => setLocation('/auth')}>Sign In</Button>
            <Button onClick={() => setLocation('/projects')} className="bg-gradient-to-r from-primary to-accent border-0">
              Launch Packager <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </nav>
        </div>
      </header>

      <section className="pp-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl opacity-30" />
        <div className="pp-hero-layout mx-auto px-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium mb-8">
              <Rocket className="w-3.5 h-3.5" /> A clear path from web project to release kit
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold leading-tight mb-6 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
              Prepare your PWA<br />
              <span className="text-transparent bg-gradient-to-r from-primary to-accent bg-clip-text">for Android.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Bring your app details together, generate the files you need, and work through a reviewable build checklist. You keep control of signing, testing, and publication.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" onClick={() => setLocation('/projects')} className="h-14 px-8 text-lg bg-gradient-to-r from-primary to-accent border-0 shadow-xl shadow-primary/20">
                Launch Packager <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <a href="#workflow" className="pp-secondary-link">Explore the workflow <ArrowRight className="w-4 h-4" aria-hidden="true" /></a>
            </div>
            <p className="pp-footnote text-sm text-muted-foreground mt-4">Browser-based preparation &bull; Local project files &bull; No automatic publishing</p>
          </div>
          <aside className="pp-kit" aria-label="Files in your release kit">
            <div className="pp-kit-header"><Package size={22} aria-hidden="true" /><span>Your release kit</span><span className="pp-kit-label">Prepared for review</span></div>
            {[['README.md','Your project and build instructions'],['assetlinks.json','Website-to-app association'],['android-build.yml','A workflow template for your repository'],['release-checklist.md','The acceptance checks you complete']].map(([title,detail])=><div className="pp-kit-file" key={title}><FileCode size={21} aria-hidden="true" /><div><strong>{title}</strong><span>{detail}</span></div></div>)}
            <p><Shield size={18} aria-hidden="true" /> Signing material stays under your control. Generated files still need review and a real build.</p>
          </aside>
        </div>
      </section>

      <section id="workflow" className="pp-workflow max-w-5xl mx-auto px-6 py-16" aria-label="Preparation workflow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Puzzle, title: '1. Describe your app', desc: 'Collect the public URLs, app identity, icons, and version details.' },
            { icon: Zap, title: '2. Prepare the files', desc: 'Review generated configuration, association files, documentation, and commands.' },
            { icon: Rocket, title: '3. Build and verify', desc: 'Use your own approved toolchain and signing material, then test on a real device.' },
          ].map((item, i) => (
            <div key={i}>
              <Card className="glass-card p-8 text-center hover:border-primary/30 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card/30 border-y border-border/50 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Most PWA-to-Android guides are a mess</h2>
          <p className="text-muted-foreground mb-10 text-lg">You don't need more tutorials. You need a system.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {painPoints.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-left">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-red-200/80">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold mb-3">PlayPack Pilot gives you a complete deployment cockpit</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Enter your app details once and get everything generated instantly.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i}>
              <Card className="glass-card p-6 hover:border-primary/20 transition-colors h-full">
                <f.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-bold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card/30 border-y border-border/50 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-display font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border/50 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                  aria-expanded={openFaq === i}
                  aria-controls={`playpack-faq-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-foreground pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div id={`playpack-faq-${i}`} className="px-5 pb-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Ready to package your PWA?</h2>
          <p className="text-lg text-muted-foreground mb-8">Start with your project details. Review each step before you build.</p>
          <Button size="lg" onClick={() => setLocation('/projects')} className="h-14 px-10 text-lg bg-gradient-to-r from-primary to-accent border-0 shadow-xl shadow-primary/20">
            Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Rocket className="w-4 h-4" />
            <span className="font-bold">PlayPack Pilot</span>
          </div>
          <p className="text-xs text-muted-foreground/60 text-center">
            PlayPack Pilot is a deployment preparation tool. It does not directly publish apps to Google Play or generate signed Android binaries.
          </p>
        </div>
      </footer>
    </div>
  );
}
