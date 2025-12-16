'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRightToLine,
  Calendar,
  ChevronRight,
  Copy,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Folder,
  FolderPlus,
  Grid,
  List,
  Loader2,
  MoreVertical,
  Move,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  User,
  X,
  Network,
  Users,
  Link2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
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
import { useDropzone } from 'react-dropzone';

import {
  BulkActionsBar,
  BulkAction,
} from '@/components/explorer/BulkActionsBar';
import { DocumentDetailsDialog } from '@/components/explorer/DocumentDetailsDialog';
import { ExplorerSidebar } from '@/components/explorer/ExplorerSidebar';
import { UrlUploadTab } from '@/components/explorer/UrlUploadTab';
import { Navbar } from '@/components/shared/NavBar';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { useUserContext } from '@/context/UserContext';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useDocumentPolling } from '@/hooks/useDocumentPolling';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useUnifiedSearch, SearchResultItem } from '@/hooks/useUnifiedSearch';
import {
  formatFileSize,
  formatDateLocal,
  getFileIcon,
  getStatusBadge,
} from '@/lib/explorer-utils';
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
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
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
  const [metadataFields, setMetadataFields] = useState<
    Array<{
      id: string;
      key: string;
      value: string;
      placeholder: string;
      showPresets: boolean;
    }>
  >([]);

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
  const { searchResults, isSearching, debouncedSearchQuery } = useUnifiedSearch(
    {
      searchQuery,
      isSearchFocused,
      files,
      collections,
    }
  );

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

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const filtered = acceptedFiles.filter((newFile) => {
        return !uploadFiles.some(
          (existing) =>
            existing.name === newFile.name && existing.size === newFile.size
        );
      });
      addFiles(filtered);
    },
    multiple: true,
  });

  const renameFile = () => {
    if (!activeFile || newFileName.trim() === '') return;
    // TODO: Implement rename via API
    setFiles((prev) =>
      prev.map((file) =>
        file.id === activeFile.id ? { ...file, title: newFileName } : file
      )
    );
    setRenameModalOpen(false);
    setActiveFile(null);
    setNewFileName('');
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
            <Breadcrumb className="flex-1">
              <BreadcrumbList>
                {breadcrumbPath.map((path, index) => (
                  <React.Fragment key={index}>
                    <BreadcrumbItem>
                      {index === breadcrumbPath.length - 1 ? (
                        <BreadcrumbPage className="flex items-center gap-2">
                          {index === 0 ? (
                            <FileText className="h-4 w-4 shrink-0" />
                          ) : (
                            <>
                              <Folder className="h-4 w-4 shrink-0" />
                              <span className="truncate max-w-[200px]">
                                {path}
                              </span>
                            </>
                          )}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          onClick={() => navigateToBreadcrumb(index)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {index === 0 ? (
                            <FileText className="h-4 w-4 shrink-0" />
                          ) : (
                            <>
                              <Folder className="h-4 w-4 shrink-0" />
                              <span className="truncate max-w-[200px]">
                                {path}
                              </span>
                            </>
                          )}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbPath.length - 1 && (
                      <BreadcrumbSeparator>
                        <ChevronRight className="h-4 w-4" />
                      </BreadcrumbSeparator>
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2 ml-auto mr-4">
            {/* Sync indicator */}
            {isPolling && pendingDocumentIds.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                      <span className="text-xs text-blue-500 font-medium">
                        Syncing {pendingDocumentIds.length}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Auto-updating {pendingDocumentIds.length} document
                      {pendingDocumentIds.length !== 1 ? 's' : ''} with pending
                      status
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="relative w-64">
              <Input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className={`pl-3 ${searchQuery.length > 0 ? 'pr-20' : 'pr-9'} py-1.5 h-9 text-sm rounded-lg`}
              />
              {searchQuery.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <AnimatePresence mode="popLayout">
                    <motion.button
                      key="clear"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                        setIsSearchFocused(false);
                        // Switch to "All Documents" when clearing search
                        onCollectionSelect(null);
                      }}
                      className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-colors"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      aria-label="Clear search"
                    >
                      <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </motion.button>
                    <motion.div
                      key="send"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Send className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {isSearchFocused &&
                  (searchResults.length > 0 || isSearching) && (
                    <motion.div
                      className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-sm overflow-hidden bg-background z-50 max-h-[400px] overflow-y-auto"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isSearching ? (
                        <div className="px-3 py-4 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                          <span className="text-sm text-muted-foreground">
                            Searching...
                          </span>
                        </div>
                      ) : (
                        <>
                          <ul>
                            {searchResults.map((result: SearchResultItem) => {
                              // Get icon and color for each entity type
                              const getEntityIcon = (type: string) => {
                                switch (type) {
                                  case 'document':
                                    return (
                                      <FileText className="h-4 w-4 flex-shrink-0" />
                                    );
                                  case 'collection':
                                    return (
                                      <Folder className="h-4 w-4 flex-shrink-0" />
                                    );
                                  case 'entity':
                                    return (
                                      <Network className="h-4 w-4 flex-shrink-0" />
                                    );
                                  case 'relationship':
                                    return (
                                      <Link2 className="h-4 w-4 flex-shrink-0" />
                                    );
                                  case 'community':
                                    return (
                                      <Users className="h-4 w-4 flex-shrink-0" />
                                    );
                                  default:
                                    return (
                                      <FileText className="h-4 w-4 flex-shrink-0" />
                                    );
                                }
                              };

                              const getEntityColor = (type: string) => {
                                switch (type) {
                                  case 'document':
                                    return 'text-blue-500';
                                  case 'collection':
                                    return 'text-purple-500';
                                  case 'entity':
                                    return 'text-green-500';
                                  case 'relationship':
                                    return 'text-orange-500';
                                  case 'community':
                                    return 'text-pink-500';
                                  default:
                                    return 'text-muted-foreground';
                                }
                              };

                              const getTypeLabel = (type: string) => {
                                switch (type) {
                                  case 'document':
                                    return 'Document';
                                  case 'collection':
                                    return 'Collection';
                                  case 'entity':
                                    return 'Entity';
                                  case 'relationship':
                                    return 'Relationship';
                                  case 'community':
                                    return 'Community';
                                  default:
                                    return 'Item';
                                }
                              };

                              return (
                                <motion.li
                                  key={`${result.type}-${result.id}`}
                                  className="px-3 py-2.5 flex items-center justify-between hover:bg-muted cursor-pointer group"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.15 }}
                                  onClick={() => {
                                    if (result.type === 'document') {
                                      setSearchQuery(result.title);
                                    } else if (result.type === 'collection') {
                                      onCollectionSelect(result.id);
                                      setSearchQuery('');
                                    }
                                    setIsSearchFocused(false);
                                  }}
                                >
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <div
                                      className={getEntityColor(result.type)}
                                    >
                                      {getEntityIcon(result.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium truncate">
                                          {result.title}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-xs px-1.5 py-0 h-5"
                                        >
                                          {getTypeLabel(result.type)}
                                        </Badge>
                                      </div>
                                      {result.description && (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                          {result.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {result.metadata?.score && (
                                    <div className="ml-2 text-xs text-muted-foreground">
                                      {(result.metadata.score * 100).toFixed(0)}
                                      %
                                    </div>
                                  )}
                                </motion.li>
                              );
                            })}
                          </ul>
                          {searchResults.length >= 8 && (
                            <div className="px-3 py-2 border-t text-xs text-muted-foreground text-center bg-muted/30">
                              Showing top {searchResults.length} results
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-r-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
                <span className="sr-only">List view</span>
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-l-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
                <span className="sr-only">Grid view</span>
              </Button>
            </div>
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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          selectedFiles.length === filteredFiles.length &&
                          filteredFiles.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                        disabled={filteredFiles.length === 0}
                      />
                    </TableHead>
                    <TableHead
                      className="w-[300px] cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Name
                        {sortConfig?.key === 'name' &&
                          (sortConfig.direction === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          ))}
                        {sortConfig?.key !== 'name' && (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort('size')}
                    >
                      <div className="flex items-center gap-2">
                        Size
                        {sortConfig?.key === 'size' &&
                          (sortConfig.direction === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          ))}
                        {sortConfig?.key !== 'size' && (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort('modified')}
                    >
                      <div className="flex items-center gap-2">
                        Modified
                        {sortConfig?.key === 'modified' &&
                          (sortConfig.direction === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          ))}
                        {sortConfig?.key !== 'modified' && (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px] !px-2 !py-1">
                      <div className="flex items-center gap-2">
                        <span>Ingestion</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 relative"
                            >
                              <Filter
                                className={`h-4 w-4 ${
                                  filters.ingestionStatus.length > 0
                                    ? 'text-primary'
                                    : 'opacity-50'
                                }`}
                              />
                              {filters.ingestionStatus.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                                  {filters.ingestionStatus.length}
                                </span>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <div className="p-2">
                              <div className="text-xs font-semibold mb-2 px-2">
                                Ingestion Status
                              </div>
                              <div className="space-y-1">
                                {DEFAULT_INGESTION_STATUSES.map((status) => (
                                  <div
                                    key={status}
                                    className="flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer"
                                    onClick={() => {
                                      setFilters((prev) => {
                                        const current = prev.ingestionStatus;
                                        const isSelected =
                                          current.includes(status);
                                        return {
                                          ...prev,
                                          ingestionStatus: isSelected
                                            ? current.filter(
                                                (s) => s !== status
                                              )
                                            : [...current, status],
                                        };
                                      });
                                    }}
                                  >
                                    <Checkbox
                                      checked={filters.ingestionStatus.includes(
                                        status
                                      )}
                                      onCheckedChange={() => {
                                        setFilters((prev) => {
                                          const current = prev.ingestionStatus;
                                          const isSelected =
                                            current.includes(status);
                                          return {
                                            ...prev,
                                            ingestionStatus: isSelected
                                              ? current.filter(
                                                  (s) => s !== status
                                                )
                                              : [...current, status],
                                          };
                                        });
                                      }}
                                    />
                                    <label className="text-sm cursor-pointer flex-1">
                                      {status}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              {filters.ingestionStatus.length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-7 text-xs"
                                    onClick={() => {
                                      setFilters((prev) => ({
                                        ...prev,
                                        ingestionStatus: [],
                                      }));
                                    }}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Clear
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px] !px-2 !py-1">
                      <div className="flex items-center gap-2">
                        <span>Extraction</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 relative"
                            >
                              <Filter
                                className={`h-4 w-4 ${
                                  filters.extractionStatus.length > 0
                                    ? 'text-primary'
                                    : 'opacity-50'
                                }`}
                              />
                              {filters.extractionStatus.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                                  {filters.extractionStatus.length}
                                </span>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <div className="p-2">
                              <div className="text-xs font-semibold mb-2 px-2">
                                Extraction Status
                              </div>
                              <div className="space-y-1">
                                {DEFAULT_EXTRACTION_STATUSES.map((status) => (
                                  <div
                                    key={status}
                                    className="flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer"
                                    onClick={() => {
                                      setFilters((prev) => {
                                        const current = prev.extractionStatus;
                                        const isSelected =
                                          current.includes(status);
                                        return {
                                          ...prev,
                                          extractionStatus: isSelected
                                            ? current.filter(
                                                (s) => s !== status
                                              )
                                            : [...current, status],
                                        };
                                      });
                                    }}
                                  >
                                    <Checkbox
                                      checked={filters.extractionStatus.includes(
                                        status
                                      )}
                                      onCheckedChange={() => {
                                        setFilters((prev) => {
                                          const current = prev.extractionStatus;
                                          const isSelected =
                                            current.includes(status);
                                          return {
                                            ...prev,
                                            extractionStatus: isSelected
                                              ? current.filter(
                                                  (s) => s !== status
                                                )
                                              : [...current, status],
                                          };
                                        });
                                      }}
                                    />
                                    <label className="text-sm cursor-pointer flex-1">
                                      {status}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              {filters.extractionStatus.length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-7 text-xs"
                                    onClick={() => {
                                      setFilters((prev) => ({
                                        ...prev,
                                        extractionStatus: [],
                                      }));
                                    }}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Clear
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map((file) => (
                      <TableRow
                        key={file.id}
                        className={`table-row-hover ${
                          selectedFiles.includes(file.id)
                            ? 'bg-primary/10 dark:bg-primary/20'
                            : ''
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedFiles.includes(file.id)}
                            onCheckedChange={() => toggleSelection(file.id)}
                            aria-label={`Select ${file.title || file.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center space-x-2 cursor-pointer"
                            onClick={() => handleFileAction('open', file)}
                          >
                            {getFileIcon(file)}
                            <span className="font-medium font-mono text-sm">
                              {file.title || file.id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatFileSize(
                              (file as any).sizeInBytes ||
                                (file as any).size_in_bytes
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDateLocal(file.updatedAt || file.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="w-[200px] min-w-[180px]">
                          <div className="flex justify-start">
                            {getStatusBadge(file.ingestionStatus, 'ingestion')}
                          </div>
                        </TableCell>
                        <TableCell className="w-[200px] min-w-[180px]">
                          <div className="flex justify-start">
                            {getStatusBadge(
                              file.extractionStatus,
                              'extraction'
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleFileAction('preview', file)
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleFileAction('download', file)
                                }
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleFileAction('rename', file)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleFileAction('move', file)}
                              >
                                <Move className="h-4 w-4 mr-2" />
                                Move
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleFileAction('delete', file)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="rounded-full bg-muted p-3">
                            <Folder className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="mt-4 text-lg font-semibold">
                            No files found
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                            {searchQuery
                              ? `No results found for "${searchQuery}". Try a different search term.`
                              : filters.ingestionStatus.length > 0 ||
                                  filters.extractionStatus.length > 0
                                ? 'No files match the selected filters. Try changing the filter criteria.'
                                : 'This folder is empty. Upload a file to get started.'}
                          </p>
                          {(filters.ingestionStatus.length > 0 ||
                            filters.extractionStatus.length > 0) && (
                            <div className="mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    ingestionStatus: [],
                                    extractionStatus: [],
                                  }));
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Clear Filters
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="grid" className="m-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : filteredFiles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`relative group rounded-lg border bg-card p-2 transition-all hover:shadow-md ${
                      selectedFiles.includes(file.id)
                        ? 'ring-2 ring-primary'
                        : ''
                    }`}
                  >
                    <div className="absolute top-2 right-2">
                      <Checkbox
                        checked={selectedFiles.includes(file.id)}
                        onCheckedChange={() => toggleSelection(file.id)}
                        aria-label={`Select ${file.title || file.id}`}
                      />
                    </div>

                    <div
                      className="flex flex-col items-center p-4 cursor-pointer"
                      onClick={() => handleFileAction('open', file)}
                    >
                      <div className="mb-2">{getFileIcon(file)}</div>
                      <div className="text-center">
                        <p className="font-medium font-mono text-sm truncate w-full max-w-[120px]">
                          {file.title || file.id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.documentType || 'document'}
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleFileAction('preview', file)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleFileAction('download', file)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleFileAction('rename', file)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleFileAction('move', file)}
                          >
                            <Move className="h-4 w-4 mr-2" />
                            Move
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleFileAction('delete', file)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-3">
                  <Folder className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No files found</h3>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery
                    ? `No results found for "${searchQuery}". Try a different search term.`
                    : 'This folder is empty. Upload a file to get started.'}
                </p>
                <div className="mt-4 flex space-x-2">
                  <Button size="sm" onClick={() => setUploadModalOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Upload Modal */}
      <Dialog
        open={uploadModalOpen}
        onOpenChange={(open) => {
          setUploadModalOpen(open);
          if (open) {
            // When opening dialog, set default collection if one is selected
            if (selectedCollectionId) {
              setUploadCollectionIds([selectedCollectionId]);
            } else {
              setUploadCollectionIds([]);
            }
            // Reset to file upload tab
            setUploadActiveTab('file');
          } else {
            // When closing dialog, reset everything
            clearUploadFiles();
            setUploadMetadata({});
            setUploadQuality('hi-res'); // Reset to default
            setMetadataFields([]);
            setUploadActiveTab('file'); // Reset tab selection
            // Reset collections - will be set by useEffect if collection is selected
            if (selectedCollectionId) {
              setUploadCollectionIds([selectedCollectionId]);
            } else {
              setUploadCollectionIds([]);
            }
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>
              Upload files from your computer or provide a URL to fetch content.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={uploadActiveTab}
            onValueChange={(value) =>
              setUploadActiveTab(value as 'file' | 'url')
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                URL Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-6 py-4">
              {/* File Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                  {isDragActive ? (
                    <p className="text-sm font-medium">Drop files here...</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-1">
                        Drag and drop files here, or click to select
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports PDF, DOCX, TXT, JPG, PNG, and more
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Selected Files List */}
              {uploadFiles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Selected Files ({uploadFiles.length})
                  </label>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    <div className="space-y-1">
                      {uploadFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUploadFile(file.name);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Collection Selection - MultiSelect */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Collections</label>
                <MultiSelect
                  id="upload-collections"
                  options={[
                    ...collections.map((collection) => ({
                      value: collection.id,
                      label: collection.name || collection.id,
                    })),
                  ]}
                  value={uploadCollectionIds}
                  onChange={setUploadCollectionIds}
                  onCreateNew={async (name: string) => {
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
                        description:
                          error?.message || 'Failed to create collection.',
                        variant: 'destructive',
                      });
                      return null;
                    }
                  }}
                />
                {uploadCollectionIds.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    If no collection is selected, documents will be added to
                    "All Documents"
                  </p>
                )}
              </div>

              {/* Quality Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Quality</label>
                <Select value={uploadQuality} onValueChange={setUploadQuality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hi-res">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <span>Maximum Quality (hi-res)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="fast">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-blue-500" />
                        <span>Fast (fast)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4 text-purple-500" />
                        <span>Custom (custom)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {uploadQuality === 'hi-res' &&
                    'Maximum quality ensures best extraction and embedding results'}
                  {uploadQuality === 'fast' &&
                    'Faster processing with slightly lower quality'}
                  {uploadQuality === 'custom' &&
                    'Custom ingestion configuration'}
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium">Metadata</label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle
                            className="h-3.5 w-3.5 text-muted-foreground cursor-help"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            Add custom metadata to help organize and filter your
                            documents. Metadata applies to all selected files
                            and can be used for filtering, searching, and
                            categorization. For example, you can tag files with
                            project names, departments, or any other relevant
                            information.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className="text-xs text-muted-foreground ml-2">
                      Add key-value pairs to organize and filter documents.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 border-2 border-primary text-primary bg-transparent hover:bg-primary/10 font-semibold"
                    onClick={() => {
                      const newFieldId = crypto.randomUUID();
                      setMetadataFields((prev) => [
                        ...prev,
                        {
                          id: newFieldId,
                          key: '',
                          value: '',
                          placeholder: '',
                          showPresets: false,
                        },
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add metadata
                  </Button>
                </div>

                {/* Existing metadata entries */}
                {Object.entries(uploadMetadata).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(uploadMetadata).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 p-2 border rounded-md bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-muted-foreground mb-0.5">
                            {key}
                          </div>
                          <div className="text-sm truncate">{value}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => {
                            const newMetadata = { ...uploadMetadata };
                            delete newMetadata[key];
                            setUploadMetadata(newMetadata);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Editable metadata fields */}
                {metadataFields.length > 0 && (
                  <div className="space-y-2">
                    {metadataFields.map((field) => (
                      <div
                        key={field.id}
                        className="p-2 border rounded-md bg-muted/20"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Popover
                              open={field.showPresets}
                              onOpenChange={(open) => {
                                setMetadataFields((prev) =>
                                  prev.map((f) =>
                                    f.id === field.id
                                      ? { ...f, showPresets: open }
                                      : f
                                  )
                                );
                              }}
                            >
                              <PopoverAnchor asChild>
                                <div className="w-full" data-popover-anchor>
                                  <Input
                                    placeholder="Key (e.g., project, department)"
                                    value={field.key}
                                    onChange={(e) => {
                                      setMetadataFields((prev) =>
                                        prev.map((f) =>
                                          f.id === field.id
                                            ? {
                                                ...f,
                                                key: e.target.value,
                                                showPresets: false,
                                              }
                                            : f
                                        )
                                      );
                                    }}
                                    onFocus={() => {
                                      setMetadataFields((prev) =>
                                        prev.map((f) =>
                                          f.id === field.id
                                            ? { ...f, showPresets: true }
                                            : f
                                        )
                                      );
                                    }}
                                    className={`flex-1 w-full ${field.showPresets ? 'border-primary' : ''}`}
                                  />
                                </div>
                              </PopoverAnchor>
                              <PopoverContent
                                className="p-0"
                                align="start"
                                side="bottom"
                                sideOffset={4}
                                style={{
                                  width:
                                    'var(--radix-popover-anchor-width, 100%)',
                                  minWidth: 'var(--radix-popover-anchor-width)',
                                }}
                              >
                                <Command>
                                  <CommandList>
                                    <CommandGroup heading="Quick presets">
                                      {[
                                        {
                                          key: 'project',
                                          label: 'Project',
                                          example: 'My Project',
                                        },
                                        {
                                          key: 'department',
                                          label: 'Department',
                                          example: 'Engineering',
                                        },
                                        {
                                          key: 'category',
                                          label: 'Category',
                                          example: 'Documentation',
                                        },
                                        {
                                          key: 'version',
                                          label: 'Version',
                                          example: '1.0.0',
                                        },
                                        {
                                          key: 'author',
                                          label: 'Author',
                                          example: 'John Doe',
                                        },
                                        {
                                          key: 'tags',
                                          label: 'Tags',
                                          example: 'important, draft',
                                        },
                                        {
                                          key: 'source',
                                          label: 'Source',
                                          example: 'Internal',
                                        },
                                      ].map((preset) => (
                                        <CommandItem
                                          key={preset.key}
                                          value={`${preset.label} ${preset.example}`}
                                          onSelect={() => {
                                            setMetadataFields((prev) =>
                                              prev.map((f) =>
                                                f.id === field.id
                                                  ? {
                                                      ...f,
                                                      key: preset.key,
                                                      value: '',
                                                      placeholder:
                                                        preset.example,
                                                      showPresets: false,
                                                    }
                                                  : f
                                              )
                                            );
                                          }}
                                          className="cursor-pointer"
                                        >
                                          <span className="font-medium">
                                            {preset.label}
                                          </span>
                                          <span className="text-muted-foreground ml-2">
                                            ({preset.example})
                                          </span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Input
                            placeholder={field.placeholder || 'Value'}
                            value={field.value}
                            onChange={(e) => {
                              setMetadataFields((prev) =>
                                prev.map((f) =>
                                  f.id === field.id
                                    ? {
                                        ...f,
                                        value: e.target.value,
                                        placeholder: '',
                                      }
                                    : f
                                )
                              );
                            }}
                            onFocus={() => {
                              if (field.placeholder && !field.value) {
                                setMetadataFields((prev) =>
                                  prev.map((f) =>
                                    f.id === field.id
                                      ? { ...f, placeholder: '' }
                                      : f
                                  )
                                );
                              }
                            }}
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (
                                e.key === 'Enter' &&
                                field.key.trim() &&
                                (field.value.trim() || field.placeholder.trim())
                              ) {
                                const valueToUse =
                                  field.value.trim() ||
                                  field.placeholder.trim();
                                setUploadMetadata((prev) => ({
                                  ...prev,
                                  [field.key.trim()]: valueToUse,
                                }));
                                setMetadataFields((prev) =>
                                  prev.filter((f) => f.id !== field.id)
                                );
                              } else if (e.key === 'Escape') {
                                setMetadataFields((prev) =>
                                  prev.filter((f) => f.id !== field.id)
                                );
                              }
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 flex-shrink-0"
                            onClick={() => {
                              setMetadataFields((prev) =>
                                prev.filter((f) => f.id !== field.id)
                              );
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Progress - Detailed per-file status */}
              {isUploading && uploadFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Upload Progress</span>
                    <span className="text-muted-foreground">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />

                  {/* Per-file status */}
                  <ScrollArea className="h-40 rounded-md border p-3">
                    <div className="space-y-2">
                      {uploadFiles.map((file, index) => {
                        const status = fileUploadStatus[file.name];
                        if (!status) return null;

                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {status.status === 'success' && (
                                  <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                                )}
                                {status.status === 'error' && (
                                  <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                                )}
                                {(status.status === 'uploading' ||
                                  status.status === 'pending') && (
                                  <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
                                )}
                                <span className="truncate font-medium">
                                  {file.name}
                                </span>
                              </div>
                              <span className="text-muted-foreground flex-shrink-0 ml-2">
                                {status.status === 'success'
                                  ? 'Done'
                                  : status.status === 'error'
                                    ? 'Failed'
                                    : status.status === 'uploading'
                                      ? `${Math.round(status.progress)}%`
                                      : 'Pending'}
                              </span>
                            </div>
                            {(status.status === 'uploading' ||
                              status.status === 'pending') && (
                              <Progress
                                value={status.progress}
                                className="h-1"
                              />
                            )}
                            {status.status === 'error' && status.error && (
                              <p className="text-xs text-red-500 truncate">
                                {status.error}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadModalOpen(false);
                    clearUploadFiles();
                    setUploadMetadata({});
                    setUploadQuality('hi-res'); // Reset to default
                    setMetadataFields([]);
                    // Reset collections - will be set by useEffect if collection is selected
                    if (selectedCollectionId) {
                      setUploadCollectionIds([selectedCollectionId]);
                    } else {
                      setUploadCollectionIds([]);
                    }
                  }}
                  disabled={isUploading}
                >
                  {isUploading ? 'Close' : 'Cancel'}
                </Button>
                {isUploading ? (
                  <Button variant="destructive" onClick={cancelUpload}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel Upload
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      performUpload(
                        uploadCollectionIds,
                        uploadQuality as UploadQuality,
                        uploadMetadata
                      )
                    }
                    disabled={uploadFiles.length === 0 || isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload{' '}
                    {uploadFiles.length > 0 &&
                      `${uploadFiles.length} file${uploadFiles.length !== 1 ? 's' : ''}`}
                  </Button>
                )}
              </DialogFooter>
            </TabsContent>

            <TabsContent value="url" className="space-y-6 py-4">
              <UrlUploadTab
                onUpload={(files) => {
                  addFiles(files);
                }}
                onSwitchToFileTab={() => setUploadActiveTab('file')}
                isUploading={isUploading}
                renderCollectionsSelect={
                  /* Collection Selection - Same as File Upload */
                  <>
                    <label className="text-sm font-medium">Collections</label>
                    <MultiSelect
                      id="upload-collections-url"
                      options={[
                        ...collections.map((collection) => ({
                          value: collection.id,
                          label: collection.name || collection.id,
                        })),
                      ]}
                      value={uploadCollectionIds}
                      onChange={setUploadCollectionIds}
                      onCreateNew={async (name: string) => {
                        try {
                          const client = await getClient();
                          if (!client) {
                            throw new Error(
                              'Failed to get authenticated client'
                            );
                          }

                          const newCollection = await client.collections.create(
                            {
                              name: name,
                            }
                          );

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
                            description:
                              error?.message || 'Failed to create collection.',
                            variant: 'destructive',
                          });
                          return null;
                        }
                      }}
                    />
                    {uploadCollectionIds.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        If no collection is selected, documents will be added to
                        "All Documents"
                      </p>
                    )}
                  </>
                }
                renderQualitySelect={
                  /* Quality Selection - Same as File Upload */
                  <>
                    <label className="text-sm font-medium">
                      Upload Quality
                    </label>
                    <Select
                      value={uploadQuality}
                      onValueChange={setUploadQuality}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hi-res">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                            <span>Maximum Quality (hi-res)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="fast">
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4 text-blue-500" />
                            <span>Fast (fast)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2">
                            <Edit className="h-4 w-4 text-purple-500" />
                            <span>Custom (custom)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {uploadQuality === 'hi-res' &&
                        'Maximum quality ensures best extraction and embedding results'}
                      {uploadQuality === 'fast' &&
                        'Faster processing with slightly lower quality'}
                      {uploadQuality === 'custom' &&
                        'Custom ingestion configuration'}
                    </p>
                  </>
                }
                renderMetadataFields={
                  /* Metadata Fields - Simplified version for URL Upload */
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-sm font-medium">Metadata</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle
                                className="h-3.5 w-3.5 text-muted-foreground cursor-help"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                Add custom metadata to help organize and filter
                                your documents. Metadata applies to all fetched
                                files and can be used for filtering, searching,
                                and categorization.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <p className="text-xs text-muted-foreground ml-2">
                          Add key-value pairs to organize and filter documents.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 border-2 border-primary text-primary bg-transparent hover:bg-primary/10 font-semibold"
                        onClick={() => {
                          const newFieldId = crypto.randomUUID();
                          setMetadataFields((prev) => [
                            ...prev,
                            {
                              id: newFieldId,
                              key: '',
                              value: '',
                              placeholder: '',
                              showPresets: false,
                            },
                          ]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add metadata
                      </Button>
                    </div>

                    {/* Existing metadata entries */}
                    {Object.entries(uploadMetadata).length > 0 && (
                      <div className="space-y-2">
                        {Object.entries(uploadMetadata).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center gap-2 p-2 border rounded-md bg-muted/30"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-muted-foreground mb-0.5">
                                {key}
                              </div>
                              <div className="text-sm truncate">{value}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 flex-shrink-0"
                              onClick={() => {
                                const newMetadata = { ...uploadMetadata };
                                delete newMetadata[key];
                                setUploadMetadata(newMetadata);
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Editable metadata fields - simplified for URL */}
                    {metadataFields.length > 0 && (
                      <div className="space-y-2">
                        {metadataFields.map((field) => (
                          <div
                            key={field.id}
                            className="p-2 border rounded-md bg-muted/20"
                          >
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Key"
                                value={field.key}
                                onChange={(e) => {
                                  setMetadataFields((prev) =>
                                    prev.map((f) =>
                                      f.id === field.id
                                        ? { ...f, key: e.target.value }
                                        : f
                                    )
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const key = field.key.trim();
                                    const value = field.value.trim();
                                    if (key && value) {
                                      setUploadMetadata((prev) => ({
                                        ...prev,
                                        [key]: value,
                                      }));
                                      setMetadataFields((prev) =>
                                        prev.filter((f) => f.id !== field.id)
                                      );
                                    }
                                  }
                                }}
                                className="flex-1"
                              />
                              <Input
                                placeholder="Value"
                                value={field.value}
                                onChange={(e) => {
                                  setMetadataFields((prev) =>
                                    prev.map((f) =>
                                      f.id === field.id
                                        ? { ...f, value: e.target.value }
                                        : f
                                    )
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const key = field.key.trim();
                                    const value = field.value.trim();
                                    if (key && value) {
                                      setUploadMetadata((prev) => ({
                                        ...prev,
                                        [key]: value,
                                      }));
                                      setMetadataFields((prev) =>
                                        prev.filter((f) => f.id !== field.id)
                                      );
                                    }
                                  }
                                }}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => {
                                  setMetadataFields((prev) =>
                                    prev.filter((f) => f.id !== field.id)
                                  );
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                }
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for your file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Input
                placeholder="File Name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameModalOpen(false);
                setActiveFile(null);
                setNewFileName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={renameFile}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
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
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setActiveFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (selectedFiles.length > 0) {
                  await bulkDelete();
                  setDeleteModalOpen(false);
                } else {
                  deleteFiles();
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Modal */}
      <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Move {selectedFiles.length} item
              {selectedFiles.length !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Select a destination collection.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="space-y-2">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className={`flex items-center space-x-2 p-2 rounded-md hover:bg-muted cursor-pointer ${
                    selectedCollectionForAction === collection.id
                      ? 'bg-primary/10 border border-primary'
                      : ''
                  }`}
                  onClick={() => setSelectedCollectionForAction(collection.id)}
                >
                  <Folder className="h-5 w-5 text-blue-500" />
                  <span className="flex-1">{collection.name}</span>
                  {selectedCollectionForAction === collection.id && (
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
            <Button
              variant="outline"
              onClick={() => {
                setMoveModalOpen(false);
                setSelectedCollectionForAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (selectedCollectionForAction) {
                  await bulkMove(
                    selectedCollectionForAction,
                    selectedCollectionId
                  );
                  setMoveModalOpen(false);
                  setSelectedCollectionForAction(null);
                }
              }}
              disabled={!selectedCollectionForAction}
            >
              Move Here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Modal */}
      <Dialog open={copyModalOpen} onOpenChange={setCopyModalOpen}>
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
                    selectedCollectionForAction === collection.id
                      ? 'bg-primary/10 border border-primary'
                      : ''
                  }`}
                  onClick={() => setSelectedCollectionForAction(collection.id)}
                >
                  <Folder className="h-5 w-5 text-blue-500" />
                  <span className="flex-1">{collection.name}</span>
                  {selectedCollectionForAction === collection.id && (
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
            <Button
              variant="outline"
              onClick={() => {
                setCopyModalOpen(false);
                setSelectedCollectionForAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (selectedCollectionForAction) {
                  await bulkCopy(selectedCollectionForAction);
                  setCopyModalOpen(false);
                  setSelectedCollectionForAction(null);
                }
              }}
              disabled={!selectedCollectionForAction}
            >
              Copy Here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Collection and Move Modal */}
      <Dialog
        open={createCollectionModalOpen}
        onOpenChange={setCreateCollectionModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create Collection and Move {selectedFiles.length} item
              {selectedFiles.length !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Create a new collection and move selected documents to it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Collection Name</label>
              <Input
                placeholder="Enter collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCollectionName.trim()) {
                    handleCreateCollectionAndMove();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateCollectionModalOpen(false);
                setNewCollectionName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCollectionAndMove}
              disabled={!newCollectionName.trim()}
            >
              Create and Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
