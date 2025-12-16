'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Upload } from 'lucide-react';
import {
  CollectionResponse,
  DocumentResponse,
  EntityResponse,
  RelationshipResponse,
} from 'r2r-js';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';

import {
  BulkActionsBar,
  BulkAction,
} from '@/components/explorer/BulkActionsBar';
import { CollectionActionDialog } from '@/components/explorer/CollectionActionDialog';
import { CreateCollectionDialog } from '@/components/explorer/CreateCollectionDialog';
import { DeleteConfirmDialog } from '@/components/explorer/DeleteConfirmDialog';
import { DocumentDetailsDialog } from '@/components/explorer/DocumentDetailsDialog';
import { EmptyState } from '@/components/explorer/EmptyState';
import { ExplorerBreadcrumb } from '@/components/explorer/ExplorerBreadcrumb';
import { ExplorerSidebar } from '@/components/explorer/ExplorerSidebar';
import { FileGridView } from '@/components/explorer/FileGridView';
import { FileTableView, SortConfig } from '@/components/explorer/FileTableView';
import { RenameDocumentDialog } from '@/components/explorer/RenameDocumentDialog';
import { SearchBar } from '@/components/explorer/SearchBar';
import { SyncIndicator } from '@/components/explorer/SyncIndicator';
import { UploadConfigForm } from '@/components/explorer/UploadConfigForm';
import { UploadDocumentsDialog } from '@/components/explorer/UploadDocumentsDialog';
import { ViewModeToggle } from '@/components/explorer/ViewModeToggle';
import { Navbar } from '@/components/shared/NavBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useUserContext } from '@/context/UserContext';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useDocumentPolling } from '@/hooks/useDocumentPolling';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { IngestionStatus, KGExtractionStatus } from '@/types';
import { UploadQuality } from '@/types/explorer';

// File Manager Component
function FileManager({
  selectedCollectionId,
  collections,
  onCollectionChange,
  onCollectionSelect,
}: {
  selectedCollectionId: string | null;
  collections: CollectionResponse[];
  onCollectionChange: () => void;
  onCollectionSelect: (collectionId: string | null) => void;
}) {
  const { getClient, authState } = useUserContext();
  const { toast } = useToast();
  const [files, setFiles] = useState<DocumentResponse[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<{
    ingestionStatus: string[];
    extractionStatus: string[];
  }>({
    ingestionStatus: [],
    extractionStatus: [],
  });

  const DEFAULT_INGESTION_STATUSES = [
    'pending',
    'parsing',
    'extracting',
    'chunking',
    'embedding',
    'augmenting',
    'storing',
    'enriching',
    'failed',
    'success',
  ];

  const DEFAULT_EXTRACTION_STATUSES = [
    'success',
    'failed',
    'pending',
    'processing',
  ];

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadActiveTab, setUploadActiveTab] = useState<'file' | 'url'>(
    'file'
  );
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] =
    useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<DocumentResponse | null>(null);
  const [selectedCollectionForAction, setSelectedCollectionForAction] =
    useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');

  const [newFileName, setNewFileName] = useState('');
  const [uploadCollectionIds, setUploadCollectionIds] = useState<string[]>([]);
  const [uploadQuality, setUploadQuality] = useState<string>('hi-res'); // Default to maximum quality
  const [uploadMetadata, setUploadMetadata] = useState<Record<string, string>>(
    {}
  );

  // Update upload collections when selectedCollectionId changes
  useEffect(() => {
    if (selectedCollectionId) {
      setUploadCollectionIds([selectedCollectionId]);
    } else {
      setUploadCollectionIds([]);
    }
  }, [selectedCollectionId]);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const client = await getClient();
      if (!client) return;

      let response;
      if (selectedCollectionId) {
        // Fetch documents from specific collection
        response = await client.collections.listDocuments({
          id: selectedCollectionId,
          limit: 100,
          offset: 0,
        });
      } else {
        // Fetch all documents
        response = await client.documents.list({ limit: 100, offset: 0 });
      }
      setFiles(response?.results || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [getClient, selectedCollectionId, toast]);

  useEffect(() => {
    if (!authState.isAuthenticated) return;
    fetchFiles();
  }, [authState.isAuthenticated, fetchFiles]);

  // Auto-refresh document statuses via polling
  const pendingDocumentIds = useMemo(() => {
    return files
      .filter((file) => {
        const ingestionPending =
          file.ingestionStatus !== IngestionStatus.SUCCESS &&
          file.ingestionStatus !== IngestionStatus.FAILED;
        const extractionPending =
          file.extractionStatus !== KGExtractionStatus.SUCCESS &&
          file.extractionStatus !== KGExtractionStatus.FAILED;
        return ingestionPending || extractionPending;
      })
      .map((file) => file.id);
  }, [files]);

  const { isPolling } = useDocumentPolling(pendingDocumentIds, {
    interval: 5000, // Poll every 5 seconds
    onlyPending: true,
    onUpdate: (updatedDocs) => {
      // Update files state with new data
      setFiles((prevFiles) => {
        return prevFiles.map((file) => {
          const updated = updatedDocs.find((doc) => doc.id === file.id);
          return updated || file;
        });
      });
    },
  });

  // Bulk actions hook
  const {
    isProcessing,
    bulkDelete,
    bulkExtract,
    bulkMove,
    bulkCopy,
    bulkDownload,
  } = useBulkActions(files, selectedFiles, {
    onSuccess: () => {
      setSelectedFiles([]);
      fetchFiles();
    },
  });

  // File upload hook
  const {
    files: uploadFiles,
    uploadStatus: fileUploadStatus,
    isUploading,
    progress: uploadProgress,
    addFiles,
    removeFile: removeUploadFile,
    clearFiles: clearUploadFiles,
    upload: performUpload,
    cancelUpload,
  } = useFileUpload({
    onSuccess: () => {
      fetchFiles();
      setUploadModalOpen(false);
    },
  });

  // Unified search hook
  const { searchResults, isSearching } = useUnifiedSearch({
    searchQuery,
    isSearchFocused,
    files,
    collections,
  });

  const filteredFiles = useMemo(() => {
    let filtered = [...files];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (file) =>
          file.title?.toLowerCase().includes(query) ||
          file.id?.toLowerCase().includes(query)
      );
    }

    // Apply ingestion status filter
    if (filters.ingestionStatus.length > 0) {
      filtered = filtered.filter((file) =>
        filters.ingestionStatus.includes(file.ingestionStatus)
      );
    }

    // Apply extraction status filter
    if (filters.extractionStatus.length > 0) {
      filtered = filtered.filter((file) =>
        filters.extractionStatus.includes(file.extractionStatus)
      );
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'name':
            aValue = (a.title || a.id).toLowerCase();
            bValue = (b.title || b.id).toLowerCase();
            break;
          case 'size':
            aValue = (a as any).sizeInBytes || (a as any).size_in_bytes || 0;
            bValue = (b as any).sizeInBytes || (b as any).size_in_bytes || 0;
            break;
          case 'modified':
            aValue = new Date(a.updatedAt || a.createdAt).getTime();
            bValue = new Date(b.updatedAt || b.createdAt).getTime();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [files, searchQuery, filters, sortConfig]);

  const toggleSelection = (id: string) => {
    setSelectedFiles((prev) =>
      prev.includes(id) ? prev.filter((fileId) => fileId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedFiles.length === filteredFiles.length &&
      filteredFiles.length > 0
    ) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map((file) => file.id));
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === 0) {
      // Return to "All Documents" (clear collection selection)
      onCollectionSelect(null);
      setSearchQuery(''); // Clear search when going home
    }
    setSelectedFiles([]);
  };

  const currentCollection = useMemo(() => {
    if (!selectedCollectionId) return null;
    return collections.find((c) => c.id === selectedCollectionId) || null;
  }, [selectedCollectionId, collections]);

  const breadcrumbPath = useMemo(() => {
    if (!selectedCollectionId) return ['All docs'];
    return [
      'All docs',
      currentCollection?.name || currentCollection?.id || 'Collection',
    ];
  }, [selectedCollectionId, currentCollection]);

  const handleFileAction = (action: string, file: DocumentResponse) => {
    setActiveFile(file);

    switch (action) {
      case 'open':
      case 'preview':
        // Open document info dialog
        setPreviewModalOpen(true);
        break;
      case 'rename':
        setNewFileName(file.title || file.id);
        setRenameModalOpen(true);
        break;
      case 'move':
        setMoveModalOpen(true);
        break;
      case 'delete':
        setDeleteModalOpen(true);
        break;
      case 'download':
        handleDownload(file);
        break;
      default:
        break;
    }
  };

  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'delete':
        setDeleteModalOpen(true);
        break;
      case 'move':
        setMoveModalOpen(true);
        break;
      case 'copy':
        setCopyModalOpen(true);
        break;
      case 'createCollection':
        setCreateCollectionModalOpen(true);
        break;
      case 'download':
        bulkDownload();
        break;
      case 'extract':
        bulkExtract();
        break;
      default:
        break;
    }
  };

  const handleCreateCollectionAndMove = async () => {
    if (!newCollectionName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Collection name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFiles.length === 0) return;

    try {
      const client = await getClient();
      if (!client) {
        throw new Error('Failed to get authenticated client');
      }

      // Create new collection
      const newCollection = await client.collections.create({
        name: newCollectionName.trim(),
      });

      const collectionId = newCollection.results.id;

      // Add documents to new collection
      const addPromises = selectedFiles.map((fileId) =>
        client.collections.addDocument({
          id: collectionId,
          documentId: fileId,
        })
      );

      await Promise.all(addPromises);

      // If moving from a collection, remove from source collection
      if (selectedCollectionId) {
        const removePromises = selectedFiles.map((fileId) =>
          client.collections.removeDocument({
            id: selectedCollectionId,
            documentId: fileId,
          })
        );
        await Promise.all(removePromises);
      }

      toast({
        title: 'Success',
        description: `Collection "${newCollectionName}" created and ${selectedFiles.length} document${selectedFiles.length !== 1 ? 's' : ''} moved successfully.`,
      });

      setCreateCollectionModalOpen(false);
      setNewCollectionName('');
      setSelectedFiles([]);
      onCollectionChange(); // Refresh collections list
      fetchFiles();
    } catch (error: any) {
      console.error('Error creating collection and moving files:', error);
      toast({
        title: 'Error',
        description:
          error?.message || 'Failed to create collection and move documents.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (file: DocumentResponse) => {
    try {
      const client = await getClient();
      if (!client) {
        throw new Error('Failed to get authenticated client');
      }

      const blob = await client.documents.download({ id: file.id });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = file.title || file.id;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Download Successful',
        description: 'The file has been downloaded successfully.',
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Download Failed',
        description: error?.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const deleteFiles = async () => {
    try {
      const client = await getClient();
      if (!client) {
        throw new Error('Failed to get authenticated client');
      }

      const filesToDelete =
        selectedFiles.length > 0
          ? selectedFiles
          : activeFile
            ? [activeFile.id]
            : [];

      await Promise.all(
        filesToDelete.map((fileId) => client.documents.delete({ id: fileId }))
      );

      toast({
        title: 'Success',
        description: `${filesToDelete.length} document${filesToDelete.length !== 1 ? 's' : ''} deleted successfully.`,
      });

      // Refresh files list
      const response = selectedCollectionId
        ? await client.collections.listDocuments({
            id: selectedCollectionId,
            limit: 100,
            offset: 0,
          })
        : await client.documents.list({ limit: 100, offset: 0 });
      setFiles(response?.results || []);

      setSelectedFiles([]);
      setActiveFile(null);
      setDeleteModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting files:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete documents.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-full mx-auto explorer-card">
      {/* Header inside card */}
      <div className="flex flex-col gap-3 p-4 border-b bg-background">
        {/* First row: Breadcrumbs and Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm min-w-0 flex-1 overflow-hidden">
            <SidebarTrigger className="shrink-0 h-7 w-7" />
            <Separator orientation="vertical" className="h-4 shrink-0" />
            <ExplorerBreadcrumb
              pathSegments={breadcrumbPath}
              onNavigate={navigateToBreadcrumb}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto mr-4">
            <SyncIndicator
              isPolling={isPolling}
              count={pendingDocumentIds.length}
            />
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              isFocused={isSearchFocused}
              searchResults={searchResults}
              isSearching={isSearching}
              onDocumentClick={(title) => setSearchQuery(title)}
              onCollectionClick={(id) => {
                onCollectionSelect(id);
                setSearchQuery('');
                setIsSearchFocused(false);
              }}
              onClear={() => {
                setSearchQuery('');
                setIsSearchFocused(false);
                onCollectionSelect(null);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>

            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsBar
        selectedCount={selectedFiles.length}
        onDeselect={() => setSelectedFiles([])}
        onAction={(action) => handleBulkAction(action)}
        isProcessing={isProcessing}
      />

      <CardContent className="p-0 bg-background">
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as 'list' | 'grid')}
        >
          <TabsContent value="list" className="m-0">
            <FileTableView
              files={filteredFiles}
              selectedFiles={selectedFiles}
              loading={loading}
              sortConfig={sortConfig}
              availableIngestionStatuses={DEFAULT_INGESTION_STATUSES}
              availableExtractionStatuses={DEFAULT_EXTRACTION_STATUSES}
              selectedIngestionStatuses={filters.ingestionStatus}
              selectedExtractionStatuses={filters.extractionStatus}
              onFileSelect={toggleSelection}
              onSelectAll={toggleSelectAll}
              onSort={handleSort}
              onFileAction={handleFileAction}
              onIngestionStatusChange={(statuses) =>
                setFilters((prev) => ({ ...prev, ingestionStatus: statuses }))
              }
              onExtractionStatusChange={(statuses) =>
                setFilters((prev) => ({ ...prev, extractionStatus: statuses }))
              }
              onClearIngestionFilter={() =>
                setFilters((prev) => ({ ...prev, ingestionStatus: [] }))
              }
              onClearExtractionFilter={() =>
                setFilters((prev) => ({ ...prev, extractionStatus: [] }))
              }
              emptyState={{
                searchQuery,
                hasFilters:
                  filters.ingestionStatus.length > 0 ||
                  filters.extractionStatus.length > 0,
                onUpload: () => setUploadModalOpen(true),
                onClearFilters: () =>
                  setFilters({ ingestionStatus: [], extractionStatus: [] }),
              }}
            />
          </TabsContent>

          <TabsContent value="grid" className="m-0">
            <FileGridView
              files={filteredFiles}
              selectedFiles={selectedFiles}
              loading={loading}
              onFileSelect={toggleSelection}
              onFileAction={handleFileAction}
              emptyState={{
                searchQuery,
                onUpload: () => setUploadModalOpen(true),
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Upload Modal */}
      <UploadDocumentsDialog
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          clearUploadFiles();
          setUploadMetadata({});
          setUploadQuality('hi-res');
          setUploadActiveTab('file');
          // Reset collections - will be set by useEffect if collection is selected
          if (selectedCollectionId) {
            setUploadCollectionIds([selectedCollectionId]);
          } else {
            setUploadCollectionIds([]);
          }
        }}
        activeTab={uploadActiveTab}
        onTabChange={(tab) => setUploadActiveTab(tab)}
        uploadFiles={uploadFiles}
        uploadStatus={fileUploadStatus}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        onAddFiles={addFiles}
        onRemoveFile={removeUploadFile}
        onClearFiles={clearUploadFiles}
        onUpload={() =>
          performUpload(
            uploadCollectionIds,
            uploadQuality as UploadQuality,
            uploadMetadata
          )
        }
        onCancelUpload={cancelUpload}
        renderConfigForm={
          <UploadConfigForm
            collections={collections}
            selectedCollectionIds={uploadCollectionIds}
            uploadQuality={uploadQuality}
            metadata={uploadMetadata}
            onCollectionsChange={setUploadCollectionIds}
            onQualityChange={setUploadQuality}
            onMetadataChange={setUploadMetadata}
            onCreateCollection={async (name: string) => {
              try {
                const client = await getClient();
                if (!client) {
                  throw new Error('Failed to get authenticated client');
                }

                const newCollection = await client.collections.create({
                  name: name,
                });

                const collectionId = newCollection.results.id;
                const collectionName =
                  newCollection.results.name || collectionId;

                // Refresh collections list
                onCollectionChange();

                toast({
                  title: 'Success',
                  description: `Collection "${collectionName}" created successfully.`,
                });

                return { id: collectionId, name: collectionName };
              } catch (error: any) {
                console.error('Error creating collection:', error);
                toast({
                  title: 'Error',
                  description: error?.message || 'Failed to create collection.',
                  variant: 'destructive',
                });
                return null;
              }
            }}
            disabled={isUploading}
          />
        }
      />

      {/* Rename Modal */}
      <RenameDocumentDialog
        open={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setActiveFile(null);
          setNewFileName('');
        }}
        onConfirm={(newName) => {
          if (!activeFile) return;
          // TODO: Implement rename via API
          setFiles((prev) =>
            prev.map((file) =>
              file.id === activeFile.id ? { ...file, title: newName } : file
            )
          );
          setRenameModalOpen(false);
          setActiveFile(null);
          setNewFileName('');
        }}
        currentFileName={newFileName}
      />

      {/* Delete Modal */}
      <DeleteConfirmDialog
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setActiveFile(null);
        }}
        onConfirm={async () => {
          if (selectedFiles.length > 0) {
            await bulkDelete();
            setDeleteModalOpen(false);
          } else {
            deleteFiles();
          }
        }}
        selectedCount={selectedFiles.length}
        activeFile={activeFile}
      />

      {/* Move Modal */}
      <CollectionActionDialog
        open={moveModalOpen}
        onClose={() => {
          setMoveModalOpen(false);
          setSelectedCollectionForAction(null);
        }}
        onConfirm={async (collectionId) => {
          await bulkMove(collectionId, selectedCollectionId);
          setMoveModalOpen(false);
          setSelectedCollectionForAction(null);
        }}
        actionType="move"
        collections={collections}
        selectedCollectionId={selectedCollectionForAction}
        onCollectionSelect={setSelectedCollectionForAction}
        selectedCount={selectedFiles.length}
      />

      {/* Copy Modal */}
      <CollectionActionDialog
        open={copyModalOpen}
        onClose={() => {
          setCopyModalOpen(false);
          setSelectedCollectionForAction(null);
        }}
        onConfirm={async (collectionId) => {
          await bulkCopy(collectionId);
          setCopyModalOpen(false);
          setSelectedCollectionForAction(null);
        }}
        actionType="copy"
        collections={collections}
        selectedCollectionId={selectedCollectionForAction}
        onCollectionSelect={setSelectedCollectionForAction}
        selectedCount={selectedFiles.length}
      />

      {/* Create Collection and Move Modal */}
      <CreateCollectionDialog
        open={createCollectionModalOpen}
        onClose={() => {
          setCreateCollectionModalOpen(false);
          setNewCollectionName('');
        }}
        onConfirm={handleCreateCollectionAndMove}
        selectedCount={selectedFiles.length}
      />

      {/* Preview Modal - Detailed Document Info */}
      {activeFile && (
        <DocumentDetailsDialog
          document={activeFile}
          open={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setActiveFile(null);
          }}
        />
      )}
    </Card>
  );
}

// Main Page
export default function ExplorerPage() {
  const { getClient, authState } = useUserContext();
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [collections, setCollections] = useState<CollectionResponse[]>([]);

  const fetchCollections = useCallback(async () => {
    if (!authState.isAuthenticated) return;

    try {
      const client = await getClient();
      if (!client) return;

      const response = await client.collections.list({
        limit: 100,
        offset: 0,
      });
      setCollections(response?.results || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  }, [authState.isAuthenticated, getClient]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <SidebarProvider defaultOpen={true}>
        <ExplorerSidebar
          collapsible="icon"
          selectedCollectionId={selectedCollectionId}
          onCollectionSelect={setSelectedCollectionId}
        />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <FileManager
              selectedCollectionId={selectedCollectionId}
              collections={collections}
              onCollectionChange={fetchCollections}
              onCollectionSelect={setSelectedCollectionId}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
