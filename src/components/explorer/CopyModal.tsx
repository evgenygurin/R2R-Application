import { Folder } from 'lucide-react';
import { CollectionResponse } from 'r2r-js';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CopyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: string[];
  collections: CollectionResponse[];
  onCopy: (targetCollectionId: string) => Promise<void>;
}

export function CopyModal({
  open,
  onOpenChange,
  selectedFiles,
  collections,
  onCopy,
}: CopyModalProps) {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );

  const handleCopy = async () => {
    if (selectedCollection) {
      await onCopy(selectedCollection);
      setSelectedCollection(null);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedCollection(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Copy {selectedFiles.length} item
            {selectedFiles.length !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Select a destination collection to copy documents to.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] rounded-md border p-4">
          <div className="space-y-2">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className={`flex items-center space-x-2 p-2 rounded-md hover:bg-muted cursor-pointer ${
                  selectedCollection === collection.id
                    ? 'bg-primary/10 border border-primary'
                    : ''
                }`}
                onClick={() => setSelectedCollection(collection.id)}
              >
                <Folder className="h-5 w-5 text-blue-500" />
                <span className="flex-1">{collection.name}</span>
                {selectedCollection === collection.id && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
            ))}
            {collections.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No collections available
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={!selectedCollection}>
            Copy Here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
