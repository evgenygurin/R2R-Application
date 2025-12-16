import { DocumentResponse } from 'r2r-js';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface RenameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFile: DocumentResponse | null;
  onRename: (newName: string) => Promise<void>;
}

export function RenameModal({
  open,
  onOpenChange,
  activeFile,
  onRename,
}: RenameModalProps) {
  const [newFileName, setNewFileName] = useState('');

  // Update filename when activeFile changes
  useEffect(() => {
    if (activeFile) {
      setNewFileName(activeFile.title || activeFile.id);
    }
  }, [activeFile]);

  const handleRename = async () => {
    if (newFileName.trim()) {
      await onRename(newFileName);
      setNewFileName('');
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setNewFileName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
          <DialogDescription>
            Enter a new name for &quot;{activeFile?.title || activeFile?.id}
            &quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 pb-4">
          <div className="space-y-2">
            <Input
              placeholder="File Name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={!newFileName.trim()}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
