'use client';

import { CollectionResponse } from 'r2r-js';
import React, { useCallback, useEffect, useState } from 'react';

import { ExplorerSidebar } from '@/components/explorer/ExplorerSidebar';
import { FileManager } from '@/components/explorer/FileManager';
import { Navbar } from '@/components/shared/NavBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useUserContext } from '@/context/UserContext';

/**
 * ExplorerPage - Главная страница файлового менеджера
 *
 * Ответственность:
 * - Layout и маршрутизация
 * - Управление списком коллекций
 * - Sidebar для навигации по коллекциям
 */
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
