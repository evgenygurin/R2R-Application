import { DocumentResponse } from 'r2r-js';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import DocumentsTable from '@/components/ChatDemo/DocumentsTable';
import Layout from '@/components/Layout';
import { useUserContext } from '@/context/UserContext';
import { IngestionStatus } from '@/types';

const ITEMS_PER_PAGE = 10;

const Index: React.FC = () => {
  const { getClient } = useUserContext();
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [pendingDocuments, setPendingDocuments] = useState<string[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      title: true,
      id: true,
      ownerId: true,
      collectionIds: false,
      ingestionStatus: true,
      extractionStatus: true,
      documentType: false,
      metadata: false,
      version: false,
      createdAt: true,
      updatedAt: false,
    }
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({
    ingestionStatus: [
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
    ],
    extractionStatus: ['success', 'failed', 'pending', 'processing'],
  });
  const [currentPage, setCurrentPage] = useState<number>(1);

  /*** Fetching Documents with Server-Side Pagination ***/
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const client = await getClient();
      if (!client) {
        throw new Error('Failed to get authenticated client');
      }

      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const response = await client.documents.list({
        offset: offset,
        limit: ITEMS_PER_PAGE,
      });

      setDocuments(response.results);
      setTotalEntries(response.totalEntries);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setLoading(false);
    }
  }, [getClient, currentPage]);

  const refetchDocuments = useCallback(async () => {
    await fetchDocuments();
    setSelectedDocumentIds([]);
  }, [fetchDocuments]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  /*** Handle Pending Documents ***/
  useEffect(() => {
    const pending = documents
      .filter(
        (doc) =>
          doc.ingestionStatus !== IngestionStatus.SUCCESS &&
          doc.ingestionStatus !== IngestionStatus.FAILED
      )
      .map((doc) => doc.id);
    setPendingDocuments(pending);
  }, [documents]);

  /*** Client-Side Filtering for Current Page ***/
  // Note: When filters or search are active, we need to handle pagination differently
  // For now, we apply client-side filtering to current page results
  // TODO: Implement server-side filtering for better performance
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];

    // Apply status filters
    Object.entries(filters).forEach(([key, value]) => {
      if (
        value &&
        value.length > 0 &&
        (key === 'ingestionStatus' || key === 'extractionStatus')
      ) {
        filtered = filtered.filter((doc) => {
          const status = doc[key];
          return Array.isArray(value) && value.includes(status);
        });
      }
    });

    // Apply search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((doc) => {
        const title = doc.title ? String(doc.title).toLowerCase() : '';
        const id = doc.id ? String(doc.id).toLowerCase() : '';
        return title.includes(query) || id.includes(query);
      });
    }

    return filtered;
  }, [documents, filters, searchQuery]);

  // Check if any filters or search are active
  const hasActiveFilters = useMemo(() => {
    const hasStatusFilters = Object.entries(filters).some(
      ([key, value]) =>
        (key === 'ingestionStatus' || key === 'extractionStatus') &&
        Array.isArray(value) &&
        value.length > 0 &&
        // Check if not all options are selected (default state)
        !(
          (key === 'ingestionStatus' && value.length === 10) ||
          (key === 'extractionStatus' && value.length === 4)
        )
    );
    const hasSearch = searchQuery && searchQuery.trim().length > 0;
    return hasStatusFilters || hasSearch;
  }, [filters, searchQuery]);

  /*** Handle Selection ***/
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedDocumentIds(filteredDocuments.map((doc) => doc.id));
      } else {
        setSelectedDocumentIds([]);
      }
    },
    [filteredDocuments]
  );

  const handleSelectItem = useCallback((itemId: string, selected: boolean) => {
    setSelectedDocumentIds((prev) => {
      if (selected) {
        return [...prev, itemId];
      } else {
        return prev.filter((id) => id !== itemId);
      }
    });
  }, []);

  /*** Handle Filters and Search ***/
  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to page 1 when filters change
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to page 1 when search changes
  };

  /*** Handle Column Visibility ***/
  const handleToggleColumn = useCallback(
    (columnKey: string, isVisible: boolean) => {
      setVisibleColumns((prev) => ({ ...prev, [columnKey]: isVisible }));
    },
    []
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSearchQueryChange(e.target.value);
    },
    [handleSearchQueryChange]
  );

  return (
    <Layout pageTitle="Documents" includeFooter={false}>
      <main className="w-full flex flex-col container h-screen-[calc(100%-4rem)]">
        <div className="relative flex-grow bg-zinc-900 mt-[4rem] sm:mt-[4rem]">
          <div className="mx-auto max-w-6xl mb-12 mt-4 p-4 h-full">
            <DocumentsTable
              documents={filteredDocuments}
              loading={loading}
              onRefresh={refetchDocuments}
              pendingDocuments={pendingDocuments}
              setPendingDocuments={setPendingDocuments}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
              selectedItems={selectedDocumentIds}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
              totalEntries={
                hasActiveFilters ? filteredDocuments.length : totalEntries
              }
              currentPage={currentPage}
              onPageChange={handlePageChange}
              itemsPerPage={ITEMS_PER_PAGE}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              searchQuery={searchQuery}
              onSearchQueryChange={handleSearchQueryChange}
              // pass search bar to format correctly
              middleContent={
                <div className="w-full px-2">
                  <input
                    type="text"
                    placeholder="Search by Title or Document ID"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    className="w-full bg-black border border-zinc-800 text-white rounded-md px-4 py-2 focus:outline-none"
                  />
                </div>
              }
            />
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Index;
