import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  Folder,
  Link2,
  Loader2,
  Network,
  Send,
  Users,
  X,
} from 'lucide-react';
import { CollectionResponse, DocumentResponse } from 'r2r-js';

import { Input } from '@/components/ui/input';
import { useUnifiedSearch, SearchResultItem } from '@/hooks/useUnifiedSearch';

interface ExplorerSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearchFocused: boolean;
  onSearchFocusChange: (focused: boolean) => void;
  files: DocumentResponse[];
  collections: CollectionResponse[];
  onCollectionSelect: (collectionId: string | null) => void;
}

export function ExplorerSearchBar({
  searchQuery,
  onSearchChange,
  isSearchFocused,
  onSearchFocusChange,
  files,
  collections,
  onCollectionSelect,
}: ExplorerSearchBarProps) {
  const { searchResults, isSearching } = useUnifiedSearch({
    searchQuery,
    isSearchFocused,
    files,
    collections,
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4 flex-shrink-0" />;
      case 'collection':
        return <Folder className="h-4 w-4 flex-shrink-0" />;
      case 'entity':
        return <Network className="h-4 w-4 flex-shrink-0" />;
      case 'relationship':
        return <Link2 className="h-4 w-4 flex-shrink-0" />;
      case 'community':
        return <Users className="h-4 w-4 flex-shrink-0" />;
      default:
        return <FileText className="h-4 w-4 flex-shrink-0" />;
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

  const handleClear = () => {
    onSearchChange('');
    onSearchFocusChange(false);
    onCollectionSelect(null);
  };

  const handleResultClick = (result: SearchResultItem) => {
    if (result.type === 'document') {
      onSearchChange(result.title);
    } else if (result.type === 'collection') {
      onCollectionSelect(result.id);
      onSearchChange('');
    }
    onSearchFocusChange(false);
  };

  return (
    <div className="relative w-64">
      <Input
        type="text"
        placeholder="Search files..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => onSearchFocusChange(true)}
        onBlur={() => setTimeout(() => onSearchFocusChange(false), 200)}
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
                handleClear();
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
        {isSearchFocused && (searchResults.length > 0 || isSearching) && (
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
              <ul>
                {searchResults.map((result: SearchResultItem) => (
                  <motion.li
                    key={`${result.type}-${result.id}`}
                    className="px-3 py-2.5 flex items-center justify-between hover:bg-muted cursor-pointer group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={getEntityColor(result.type)}>
                        {getEntityIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {result.title}
                        </p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {getTypeLabel(result.type)}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
