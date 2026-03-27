import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/export-helpers';
import { motion } from 'framer-motion';

interface CommandBlockProps {
  command: string;
  language?: string;
  label?: string;
}

export function CommandBlock({ command, language = 'bash', label }: CommandBlockProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    const success = await copyToClipboard(command);
    if (success) {
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Command is ready to paste in your terminal.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border/50 bg-[#0d1117] shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Terminal className="w-4 h-4" />
          {label || language}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs hover:bg-white/10 hover:text-white"
          onClick={handleCopy}
        >
          {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="p-4 overflow-x-auto">
        <motion.pre 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-mono text-blue-200 leading-relaxed"
        >
          {command}
        </motion.pre>
      </div>
    </div>
  );
}
