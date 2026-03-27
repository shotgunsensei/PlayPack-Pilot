import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Globe, Upload, PenTool, BookOpen, Crown, Lock } from 'lucide-react';

const modes = [
  {
    id: 'website',
    title: 'Analyze Website',
    description: 'Enter a live URL and automatically detect manifest, icons, metadata, and PWA readiness.',
    icon: Globe,
    color: 'from-blue-500 to-cyan-500',
    route: '/analyze/site',
    free: true,
  },
  {
    id: 'repo',
    title: 'Upload Project / Repo ZIP',
    description: 'Upload a ZIP file of your web app and detect framework, manifest, icons, and configuration.',
    icon: Upload,
    color: 'from-violet-500 to-purple-500',
    route: '/analyze/repo',
    free: false,
  },
  {
    id: 'manual',
    title: 'Start Manually',
    description: 'Enter all app details by hand. Full control over every field and setting.',
    icon: PenTool,
    color: 'from-emerald-500 to-green-500',
    route: '/projects',
    free: true,
  },
  {
    id: 'example',
    title: 'Load Example Project',
    description: 'Try a pre-configured example to explore the full workflow before setting up your own.',
    icon: BookOpen,
    color: 'from-amber-500 to-orange-500',
    route: null,
    free: true,
  },
];

export default function Intake() {
  const [, setLocation] = useLocation();
  const { loadExampleProject, isProUser } = useAppStore();

  const handleMode = (mode: typeof modes[0]) => {
    if (mode.id === 'example') {
      loadExampleProject();
      setLocation('/');
      return;
    }
    if (!mode.free && !isProUser) {
      setLocation('/pricing');
      return;
    }
    if (mode.route) {
      setLocation(mode.route);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-8 px-4"
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-3">How would you like to start?</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Choose a method to set up your Android packaging project. Analyze an existing site, upload your code, or start from scratch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {modes.map((mode, i) => {
          const Icon = mode.icon;
          const locked = !mode.free && !isProUser;
          return (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className={`relative p-6 cursor-pointer border border-border/50 hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 group ${locked ? 'opacity-80' : ''}`}
                onClick={() => handleMode(mode)}
              >
                {locked && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full">
                      <Crown className="w-3 h-3" /> Pro
                    </span>
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {locked ? <Lock className="w-6 h-6 text-white" /> : <Icon className="w-6 h-6 text-white" />}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{mode.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{mode.description}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        All analysis is performed locally or through a secure proxy. Your data is never stored on our servers.
      </p>
    </motion.div>
  );
}
