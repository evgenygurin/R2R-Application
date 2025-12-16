import { DocumentResponse } from 'r2r-js';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: string[];
  activeFile: DocumentResponse | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteModal({
  open,
  onOpenChange,
  selectedFiles,
  activeFile,
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            {selectedFiles.length > 0
              ? `Are you sure you want to delete ${selectedFiles.length} selected item${selectedFiles.length !== 1 ? 's' : ''}?`
              : `Are you sure you want to delete "${activeFile?.title || activeFile?.id}"?`}
            <br />
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
