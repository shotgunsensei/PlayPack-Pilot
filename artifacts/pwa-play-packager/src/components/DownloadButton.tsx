import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadFile } from '@/lib/export-helpers';
import { useToast } from '@/hooks/use-toast';

interface DownloadButtonProps {
  filename: string;
  content: string;
  contentType?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function DownloadButton({ filename, content, contentType = 'text/plain', label = 'Download', variant = 'secondary', size = 'default', className }: DownloadButtonProps) {
  const { toast } = useToast();

  const handleDownload = () => {
    downloadFile(filename, content, contentType);
    toast({ title: "Download Started", description: `Downloading ${filename}` });
  };

  return (
    <Button variant={variant} size={size} onClick={handleDownload} className={className}>
      <Download className="w-4 h-4 mr-2" /> {label}
    </Button>
  );
}
