import { Loader2 } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SyncIndicatorProps {
  isPolling: boolean;
  pendingCount: number;
}

export function SyncIndicator({ isPolling, pendingCount }: SyncIndicatorProps) {
  if (!isPolling || pendingCount === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
            <span className="text-xs text-blue-500 font-medium">
              Syncing {pendingCount}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Auto-updating {pendingCount} document
            {pendingCount !== 1 ? 's' : ''} with pending status
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
