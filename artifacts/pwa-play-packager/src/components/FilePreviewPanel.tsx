import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Download, Check, Eye, EyeOff } from 'lucide-react';
import { copyToClipboard, downloadFile } from '@/lib/export-helpers';
import { useToast } from '@/hooks/use-toast';

interface FilePreviewPanelProps {
  filename: string;
  content: string;
  contentType?: string;
  maxLines?: number;
}

export function FilePreviewPanel({ filename, content, contentType = 'text/plain', maxLines = 20 }: FilePreviewPanelProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lines = content.split('\n');
  const truncated = !expanded && lines.length > maxLines;
  const displayContent = truncated ? lines.slice(0, maxLines).join('\n') + '\n...' : content;

  const handleCopy = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      toast({ title: "Copied!", description: `${filename} content copied to clipboard` });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadFile(filename, content, contentType);
    toast({ title: "Downloaded", description: `${filename} saved` });
  };

  return (
    <Card className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <span className="text-sm font-mono text-muted-foreground">{filename}</span>
        <div className="flex gap-1">
          {lines.length > maxLines && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpanded(!expanded)}>
              {expanded ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
              {expanded ? 'Collapse' : 'Expand'}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            Copy
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5 mr-1" /> Download
          </Button>
        </div>
      </div>
      <pre className="p-4 text-sm font-mono text-blue-200 leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto">
        {displayContent}
      </pre>
    </Card>
  );
}
