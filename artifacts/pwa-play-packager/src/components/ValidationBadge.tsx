import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ValidationBadgeProps {
  isValid: boolean | null;
  label: string;
}

export function ValidationBadge({ isValid, label }: ValidationBadgeProps) {
  if (isValid === null) {
    return (
      <Badge variant="outline" className="gap-1.5 py-1 text-muted-foreground bg-muted/20">
        <AlertCircle className="w-3.5 h-3.5" />
        {label}
      </Badge>
    );
  }

  return isValid ? (
    <Badge className="gap-1.5 py-1 bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {label}
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1.5 py-1 bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20">
      <XCircle className="w-3.5 h-3.5" />
      {label}
    </Badge>
  );
}
