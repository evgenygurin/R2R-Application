'use client';

import {
  CollectionResponse,
  CommunityResponse,
  EntityResponse,
  RelationshipResponse,
  User,
} from 'r2r-js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FileManager } from '@/components/explorer/FileManager';
import {
  CommunitiesTab,
  EntitiesTab,
  ExploreTab,
  KnowledgeGraphTab,
  RelationshipsTab,
  UsersTab,
} from '@/components/explorer/tabs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserContext } from '@/context/UserContext';
import { useBatchFetch } from '@/hooks/useBatchFetch';

interface CollectionTabsProps {
  selectedCollectionId: string | null;
  collections: CollectionResponse[];
  onCollectionChange: () => void;
  onCollectionSelect: (collectionId: string | null) => void;
}

type TabValue =
  | 'documents'
  | 'users'
  | 'entities'
  | 'relationships'
  | 'communities'
  | 'knowledge-graph'
  | 'explore';

export function CollectionTabs({
  selectedCollectionId,
  collections,
  onCollectionChange,
  onCollectionSelect,
}: CollectionTabsProps) {
  const { getClient } = useUserContext();
  const [activeTab, setActiveTab] = useState<TabValue>('documents');

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="flex flex-col flex-1"
      >
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="communities">Communities</TabsTrigger>
          <TabsTrigger value="knowledge-graph">Knowledge Graph</TabsTrigger>
          <TabsTrigger value="explore">Explore</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="flex-1">
          <FileManager
            selectedCollectionId={selectedCollectionId}
            collections={collections}
            onCollectionChange={onCollectionChange}
            onCollectionSelect={onCollectionSelect}
          />
        </TabsContent>

        <TabsContent value="users" className="flex-1 overflow-auto">
          <div className="p-4">Users tab - placeholder</div>
        </TabsContent>

        <TabsContent value="entities" className="flex-1 overflow-auto">
          <div className="p-4">Entities tab - placeholder</div>
        </TabsContent>

        <TabsContent value="relationships" className="flex-1 overflow-auto">
          <div className="p-4">Relationships tab - placeholder</div>
        </TabsContent>

        <TabsContent value="communities" className="flex-1 overflow-auto">
          <div className="p-4">Communities tab - placeholder</div>
        </TabsContent>

        <TabsContent value="knowledge-graph" className="flex-1 overflow-auto">
          <div className="p-4">Knowledge Graph tab - placeholder</div>
        </TabsContent>

        <TabsContent value="explore" className="flex-1 overflow-auto">
          <div className="p-4">Explore tab - placeholder</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
