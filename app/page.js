'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import ChartView from '@/components/ChartView';

export default function Home() {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [filterExpression, setFilterExpression] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [uploadCollectionName, setUploadCollectionName] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [filterMode, setFilterMode] = useState('gui'); // 'gui' or 'json'
  const [guiFilters, setGuiFilters] = useState([{ field: '', operator: '$eq', value: '' }]);
  const [filterFields, setFilterFields] = useState([]);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [mongoUri, setMongoUri] = useState('');
  const [mongoDb, setMongoDb] = useState('');
  
  // View collection state
  const [viewCollection, setViewCollection] = useState('');
  const [viewData, setViewData] = useState([]);
  const [viewColumns, setViewColumns] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  
  // Field management state
  const [fieldCollection, setFieldCollection] = useState('');
  const [fieldColumns, setFieldColumns] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [fieldToDelete, setFieldToDelete] = useState('');
  
  // Collection management state
  const [collectionToDelete, setCollectionToDelete] = useState('');
  
  // Update field state
  const [updateCollection, setUpdateCollection] = useState('');
  const [updateFields, setUpdateFields] = useState([]);
  const [updateFilter, setUpdateFilter] = useState('');
  const [fieldUpdates, setFieldUpdates] = useState([{ field: '', value: '' }]);
  
  // AI Insights state
  const [insightsCollection, setInsightsCollection] = useState('');
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Duplicate Detection state
  const [dupCollection, setDupCollection] = useState('');
  const [dupFields, setDupFields] = useState([]);
  const [dupSelectedFields, setDupSelectedFields] = useState([]);
  const [duplicates, setDuplicates] = useState(null);

  useEffect(() => {
    // Load MongoDB settings from localStorage
    const savedUri = localStorage.getItem('mongoUri');
    const savedDb = localStorage.getItem('mongoDb');
    if (savedUri) setMongoUri(savedUri);
    if (savedDb) setMongoDb(savedDb);
    
    // Fetch collections using the saved values directly
    if (savedUri && savedDb) {
      fetchCollectionsWithSettings(savedUri, savedDb);
    }
  }, []);

  const getHeaders = (uri, db) => {
    const headers = { 'Content-Type': 'application/json' };
    const uriToUse = uri || mongoUri;
    const dbToUse = db || mongoDb;
    if (uriToUse) headers['X-MongoDB-URI'] = uriToUse;
    if (dbToUse) headers['X-MongoDB-DB'] = dbToUse;
    return headers;
  };

  const getMongoHeaders = () => {
    return getHeaders(mongoUri, mongoDb);
  };

  const fetchCollectionsWithSettings = async (uri, db) => {
    try {
      const res = await fetch('/api/collections', { headers: getHeaders(uri, db) });
      const data = await res.json();
      
      if (data.error) {
        console.error('Error fetching collections:', data.error);
        return;
      }
      
      setCollections(data.collections || []);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    }
  };

  const fetchCollections = async () => {
    // Don't fetch if settings aren't configured
    if (!mongoUri || !mongoDb) {
      return;
    }
    
    await fetchCollectionsWithSettings(mongoUri, mongoDb);
  };

  const handleTestConnection = async () => {
    if (!mongoUri || !mongoDb) {
      alert('Please enter both MongoDB URI and database name');
      return;
    }

    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ mongoUri, mongoDb })
      });

      const result = await res.json();

      if (result.success) {
        alert(`✓ ${result.message}\nFound ${result.collectionsCount} collection(s) in database.`);
        return true;
      } else {
        alert(`✗ Connection failed:\n${result.error}`);
        return false;
      }
    } catch (error) {
      alert(`✗ Connection test failed:\n${error.message}`);
      return false;
    }
  };

  const handleSaveSettings = async () => {
    if (!mongoUri || !mongoDb) {
      alert('Please enter both MongoDB URI and database name');
      return;
    }

    // Test connection before saving
    const isValid = await handleTestConnection();
    
    if (!isValid) {
      const proceed = confirm('Connection test failed. Do you still want to save these settings?');
      if (!proceed) return;
    }

    localStorage.setItem('mongoUri', mongoUri);
    localStorage.setItem('mongoDb', mongoDb);
    alert('✓ Settings saved! The page will reload to apply changes.');
    
    // Reload the page to ensure all state is properly updated
    window.location.reload();
  };

  const handleRemoveSettings = () => {
    if (confirm('Are you sure you want to remove MongoDB connection settings?')) {
      localStorage.removeItem('mongoUri');
      localStorage.removeItem('mongoDb');
      setMongoUri('');
      setMongoDb('');
      alert('✓ Settings removed. Using default connection.');
      setShowSettings(false);
      fetchCollections();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!uploadCollectionName.trim()) {
      alert('Please enter a collection name first');
      return;
    }

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: getMongoHeaders(),
          body: JSON.stringify({ collectionName: uploadCollectionName, data: results.data })
        });

        const result = await res.json();
        alert(`✓ Uploaded ${result.insertedCount} records to ${uploadCollectionName}`);
        fetchCollections();
        setUploadCollectionName('');
      }
    });
  };

  const buildFilterFromGUI = () => {
    const filter = {};
    const validFilters = guiFilters.filter(f => f.field && f.value !== '');
    
    validFilters.forEach(f => {
      if (f.operator === '$eq') {
        filter[f.field] = f.value;
      } else {
        filter[f.field] = { [f.operator]: isNaN(f.value) ? f.value : Number(f.value) };
      }
    });
    
    return filter;
  };

  const handleFilter = async () => {
    if (!mongoUri || !mongoDb) {
      alert('Please configure MongoDB connection in Settings (⚙️) first');
      return;
    }
    
    try {
      let filter = {};
      
      if (filterMode === 'json') {
        filter = filterExpression ? JSON.parse(filterExpression) : {};
      } else {
        filter = buildFilterFromGUI();
      }
      
      const res = await fetch('/api/filter', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: selectedCollection, filter })
      });

      const data = await res.json();
      
      if (data.error) {
        alert('Error: ' + data.error);
        return;
      }
      
      setFilteredData(data.results || []);
    } catch (error) {
      alert('Invalid filter expression: ' + error.message);
    }
  };

  const fetchFilterFields = async () => {
    if (!selectedCollection) return;
    
    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: selectedCollection })
      });

      const data = await res.json();
      setFilterFields(data.fields || []);
    } catch (error) {
      console.error('Error fetching fields:', error);
    }
  };

  const addGuiFilter = () => {
    setGuiFilters([...guiFilters, { field: '', operator: '$eq', value: '' }]);
  };

  const removeGuiFilter = (index) => {
    setGuiFilters(guiFilters.filter((_, i) => i !== index));
  };

  const updateGuiFilter = (index, key, value) => {
    const newFilters = [...guiFilters];
    newFilters[index][key] = value;
    setGuiFilters(newFilters);
  };

  const handleSaveCollection = async () => {
    if (!newCollectionName || filteredData.length === 0) {
      alert('Please provide a collection name and filter data first');
      return;
    }

    const res = await fetch('/api/save-collection', {
      method: 'POST',
      headers: getMongoHeaders(),
      body: JSON.stringify({ collectionName: newCollectionName, data: filteredData })
    });

    const result = await res.json();
    alert(`✓ Saved ${result.insertedCount} records to ${newCollectionName}`);
    fetchCollections();
    setNewCollectionName('');
  };

  const handleViewCollection = async () => {
    if (!viewCollection) {
      alert('Please select a collection');
      return;
    }

    try {
      const res = await fetch('/api/filter', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: viewCollection, filter: {} })
      });

      const data = await res.json();
      const results = data.results || [];
      setViewData(results);
      
      if (results.length > 0) {
        const cols = Object.keys(results[0]).filter(key => key !== '_id');
        setViewColumns(cols);
      } else {
        setViewColumns([]);
      }
    } catch (error) {
      alert('Error fetching collection data: ' + error.message);
    }
  };

  const fetchFieldsForManagement = async () => {
    if (!fieldCollection) {
      alert('Please select a collection');
      return;
    }

    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: fieldCollection })
      });

      const data = await res.json();
      setFieldColumns(data.fields || []);
    } catch (error) {
      alert('Error fetching fields: ' + error.message);
    }
  };

  const handleAddField = async () => {
    if (!fieldCollection || !newFieldName.trim()) {
      alert('Please select a collection and enter a field name');
      return;
    }

    try {
      const res = await fetch('/api/add-field', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({
          collectionName: fieldCollection,
          fieldName: newFieldName,
          defaultValue: newFieldValue || null
        })
      });

      const result = await res.json();
      alert(`✓ Added field "${newFieldName}" to ${result.modifiedCount} documents`);
      setNewFieldName('');
      setNewFieldValue('');
      fetchFieldsForManagement();
    } catch (error) {
      alert('Error adding field: ' + error.message);
    }
  };

  const handleAddFieldAndSaveAs = async () => {
    if (!fieldCollection || !newFieldName.trim()) {
      alert('Please select a collection and enter a field name');
      return;
    }

    const newCollName = prompt('Enter name for the new collection:');
    if (!newCollName || !newCollName.trim()) {
      return;
    }

    try {
      // First, get all data from the original collection
      const fetchRes = await fetch('/api/filter', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: fieldCollection, filter: {} })
      });

      const fetchData = await fetchRes.json();
      const originalData = fetchData.results || [];

      if (originalData.length === 0) {
        alert('No data found in the collection');
        return;
      }

      // Add the new field to all documents
      const modifiedData = originalData.map(doc => ({
        ...doc,
        [newFieldName]: newFieldValue || null
      }));

      // Save as new collection
      const saveRes = await fetch('/api/save-collection', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: newCollName, data: modifiedData })
      });

      const result = await saveRes.json();
      alert(`✓ Created new collection "${newCollName}" with ${result.insertedCount} documents including the new field "${newFieldName}"`);
      setNewFieldName('');
      setNewFieldValue('');
      fetchCollections();
    } catch (error) {
      alert('Error creating new collection: ' + error.message);
    }
  };

  const handleDeleteField = async () => {
    if (!fieldCollection || !fieldToDelete) {
      alert('Please select a collection and field to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete the field "${fieldToDelete}" from all documents?`)) {
      return;
    }

    try {
      const res = await fetch('/api/delete-field', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({
          collectionName: fieldCollection,
          fieldName: fieldToDelete
        })
      });

      const result = await res.json();
      alert(`✓ Deleted field "${fieldToDelete}" from ${result.modifiedCount} documents`);
      setFieldToDelete('');
      fetchFieldsForManagement();
    } catch (error) {
      alert('Error deleting field: ' + error.message);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionToDelete) {
      alert('Please select a collection to delete');
      return;
    }

    if (!confirm(`⚠️ WARNING: This will permanently delete the collection "${collectionToDelete}" and all its data. This action cannot be undone. Are you sure?`)) {
      return;
    }

    try {
      const res = await fetch('/api/delete-collection', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: collectionToDelete })
      });

      await res.json();
      alert(`✓ Collection "${collectionToDelete}" has been deleted`);
      setCollectionToDelete('');
      fetchCollections();
    } catch (error) {
      alert('Error deleting collection: ' + error.message);
    }
  };

  const fetchFieldsForUpdate = async () => {
    if (!updateCollection) {
      alert('Please select a collection');
      return;
    }

    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: updateCollection })
      });

      const data = await res.json();
      setUpdateFields(data.fields || []);
    } catch (error) {
      alert('Error fetching fields: ' + error.message);
    }
  };

  const addUpdateField = () => {
    setFieldUpdates([...fieldUpdates, { field: '', value: '' }]);
  };

  const removeUpdateField = (index) => {
    setFieldUpdates(fieldUpdates.filter((_, i) => i !== index));
  };

  const updateFieldValue = (index, key, value) => {
    const newUpdates = [...fieldUpdates];
    newUpdates[index][key] = value;
    setFieldUpdates(newUpdates);
  };

  const handleUpdateFields = async () => {
    if (!updateCollection) {
      alert('Please select a collection');
      return;
    }

    const validUpdates = fieldUpdates.filter(u => u.field && u.value !== '');
    if (validUpdates.length === 0) {
      alert('Please provide at least one field and value to update');
      return;
    }

    const updates = {};
    validUpdates.forEach(u => {
      updates[u.field] = u.value;
    });

    try {
      const res = await fetch('/api/update-field', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({
          collectionName: updateCollection,
          filter: updateFilter || '{}',
          updates
        })
      });

      const result = await res.json();
      alert(`✓ Updated ${result.modifiedCount} document(s) (matched ${result.matchedCount})`);
      setFieldUpdates([{ field: '', value: '' }]);
      setUpdateFilter('');
    } catch (error) {
      alert('Error updating fields: ' + error.message);
    }
  };

  const handleUpdateFieldsAndSaveAs = async () => {
    if (!updateCollection) {
      alert('Please select a collection');
      return;
    }

    const validUpdates = fieldUpdates.filter(u => u.field && u.value !== '');
    if (validUpdates.length === 0) {
      alert('Please provide at least one field and value to update');
      return;
    }

    const newCollName = prompt('Enter name for the new collection:');
    if (!newCollName || !newCollName.trim()) {
      return;
    }

    const updates = {};
    validUpdates.forEach(u => {
      updates[u.field] = u.value;
    });

    try {
      // Fetch data with filter
      const filterQuery = updateFilter ? JSON.parse(updateFilter) : {};
      const fetchRes = await fetch('/api/filter', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: updateCollection, filter: filterQuery })
      });

      const fetchData = await fetchRes.json();
      const originalData = fetchData.results || [];

      if (originalData.length === 0) {
        alert('No documents matched the filter');
        return;
      }

      // Apply updates to the data
      const updatedData = originalData.map(doc => ({
        ...doc,
        ...updates
      }));

      // Save as new collection
      const saveRes = await fetch('/api/save-collection', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: newCollName, data: updatedData })
      });

      const result = await saveRes.json();
      alert(`✓ Created new collection "${newCollName}" with ${result.insertedCount} updated documents`);
      setFieldUpdates([{ field: '', value: '' }]);
      setUpdateFilter('');
      fetchCollections();
    } catch (error) {
      alert('Error creating new collection: ' + error.message);
    }
  };

  // AI Insights handlers
  const handleGetInsights = async () => {
    if (!insightsCollection) {
      alert('Please select a collection');
      return;
    }

    setLoadingInsights(true);
    try {
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: insightsCollection })
      });

      const data = await res.json();
      setInsights(data);
    } catch (error) {
      alert('Error getting insights: ' + error.message);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Duplicate Detection handlers
  const handleLoadDupFields = async () => {
    if (!dupCollection) return;
    
    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ collectionName: dupCollection })
      });

      const data = await res.json();
      setDupFields(data.fields || []);
    } catch (error) {
      alert('Error loading fields: ' + error.message);
    }
  };

  const handleFindDuplicates = async () => {
    if (!dupCollection || dupSelectedFields.length === 0) {
      alert('Please select a collection and at least one field');
      return;
    }

    try {
      const res = await fetch('/api/duplicate-detection', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ 
          collectionName: dupCollection,
          fields: dupSelectedFields
        })
      });

      const data = await res.json();
      setDuplicates(data);
    } catch (error) {
      alert('Error finding duplicates: ' + error.message);
    }
  };

  const toggleDupField = (field) => {
    if (dupSelectedFields.includes(field)) {
      setDupSelectedFields(dupSelectedFields.filter(f => f !== field));
    } else {
      setDupSelectedFields([...dupSelectedFields, field]);
    }
  };

  // Export handler
  const handleExport = async (format) => {
    if (!viewCollection) {
      alert('Please load a collection first in the View tab');
      return;
    }

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: getMongoHeaders(),
        body: JSON.stringify({ 
          collectionName: viewCollection,
          format,
          filter: {}
        })
      });

      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${viewCollection}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        alert('✓ CSV exported successfully!');
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${viewCollection}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        alert('✓ JSON exported successfully!');
      }
    } catch (error) {
      alert('Error exporting: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Settings Button */}
        <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 sm:p-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-all shadow-lg"
            title="Settings"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        <div className="text-center mb-6 sm:mb-12 pt-12 sm:pt-0">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-3 tracking-tight px-2">
            Data Chhani
          </h1>
          <p className="text-purple-200 text-sm sm:text-base md:text-lg px-4">
            Upload, View, Filter & Manage Your Data Collections
          </p>
        </div>

        {!mongoUri || !mongoDb ? (
          <div className="mb-4 sm:mb-8 text-center px-2">
            <div className="inline-flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm px-3 sm:px-6 py-2 sm:py-3 rounded-full border border-yellow-500/30">
              <span className="text-yellow-300 text-lg sm:text-2xl">⚠️</span>
              <span className="text-yellow-200 font-medium text-xs sm:text-sm md:text-base">
                MongoDB not configured. Click Settings (⚙️) to get started!
              </span>
            </div>
          </div>
        ) : collections.length > 0 ? (
          <div className="mb-4 sm:mb-8 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-6 py-2 sm:py-3 rounded-full border border-white/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium text-xs sm:text-sm md:text-base">
                {collections.length} Collection{collections.length !== 1 ? 's' : ''} Available
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex justify-center mb-4 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <div className="inline-flex bg-white/10 backdrop-blur-sm p-1 rounded-xl border border-white/20 min-w-max">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm md:text-base ${
                activeTab === 'upload' ? 'bg-white text-purple-900 shadow-lg' : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden sm:inline">📤 Upload</span>
              <span className="sm:hidden">📤</span>
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm md:text-base ${
                activeTab === 'view' ? 'bg-white text-purple-900 shadow-lg' : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden sm:inline">📊 View</span>
              <span className="sm:hidden">📊</span>
            </button>
            <button
              onClick={() => setActiveTab('filter')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm md:text-base ${
                activeTab === 'filter' ? 'bg-white text-purple-900 shadow-lg' : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden sm:inline">🔍 Filter</span>
              <span className="sm:hidden">🔍</span>
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm md:text-base ${
                activeTab === 'fields' ? 'bg-white text-purple-900 shadow-lg' : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden sm:inline">⚙️ Fields</span>
              <span className="sm:hidden">⚙️</span>
            </button>
            <button
              onClick={() => setActiveTab('update')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm md:text-base ${
                activeTab === 'update' ? 'bg-white text-purple-900 shadow-lg' : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden sm:inline">✏️ Update</span>
              <span className="sm:hidden">✏️</span>
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm md:text-base ${
                activeTab === 'manage' ? 'bg-white text-purple-900 shadow-lg' : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden sm:inline">🗂️ Manage</span>
              <span className="sm:hidden">🗂️</span>
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm md:text-base ${
                activeTab === 'insights' ? 'bg-white text-purple-900 shadow-lg' : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden sm:inline">🧠 Insights</span>
              <span className="sm:hidden">🧠</span>
            </button>
            <button
              onClick={() => setActiveTab('duplicates')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-xs sm:text-sm md:text-base ${
                activeTab === 'duplicates' ? 'bg-white text-purple-900 shadow-lg' : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden sm:inline">🔍 Duplicates</span>
              <span className="sm:hidden">🔍</span>
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          
          {activeTab === 'upload' && (
            <div className="p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Upload CSV File</h2>
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-purple-200 mb-2">Collection Name</label>
                <input
                  type="text"
                  placeholder="Enter collection name"
                  value={uploadCollectionName}
                  onChange={(e) => setUploadCollectionName(e.target.value)}
                  className="w-full p-3 sm:p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>
              <div className="border-2 border-dashed border-white/30 rounded-xl p-6 sm:p-12 text-center hover:border-purple-400 transition-colors bg-white/5">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <label className="cursor-pointer">
                  <span className="mt-2 block text-sm sm:text-lg font-medium text-white mb-2">Drop your CSV file here or click to browse</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                  <span className="inline-block mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm sm:text-base">Choose File</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'view' && (
            <div className="p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">View Collection Data</h2>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <select value={viewCollection} onChange={(e) => setViewCollection(e.target.value)} className="flex-1 p-3 sm:p-4 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base">
                    <option value="" className="bg-slate-800">Select a collection...</option>
                    {collections.map(col => (<option key={col} value={col} className="bg-slate-800">{col}</option>))}
                  </select>
                  <button onClick={handleViewCollection} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg text-sm sm:text-base whitespace-nowrap">Load Data</button>
                </div>
                {viewData.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-green-500/20 border border-green-500/30 rounded-xl p-3 sm:p-4 gap-3">
                      <span className="text-green-300 font-medium text-sm sm:text-base">✓ Loaded {viewData.length} record{viewData.length !== 1 ? 's' : ''}</span>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setViewMode('table')} className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${viewMode === 'table' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                          <span className="hidden sm:inline">📋 Table</span>
                          <span className="sm:hidden">📋</span>
                        </button>
                        <button onClick={() => setViewMode('graph')} className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${viewMode === 'graph' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                          <span className="hidden sm:inline">📈 Graph</span>
                          <span className="sm:hidden">📈</span>
                        </button>
                        <button onClick={() => handleExport('csv')} className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-xs sm:text-sm">
                          <span className="hidden sm:inline">📥 CSV</span>
                          <span className="sm:hidden">📥</span>
                        </button>
                        <button onClick={() => handleExport('json')} className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-xs sm:text-sm">
                          <span className="hidden sm:inline">📥 JSON</span>
                          <span className="sm:hidden">📥</span>
                        </button>
                      </div>
                    </div>
                    {viewMode === 'table' ? (
                      <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto max-h-[60vh] sm:max-h-[70vh]">
                          <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-purple-900/50 sticky top-0">
                              <tr>{viewColumns.map((col, idx) => (<th key={idx} className="px-2 sm:px-4 py-2 sm:py-3 text-left text-purple-200 font-semibold border-b border-white/10 whitespace-nowrap">{col}</th>))}</tr>
                            </thead>
                            <tbody>
                              {viewData.map((row, rowIdx) => (
                                <tr key={rowIdx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  {viewColumns.map((col, colIdx) => (<td key={colIdx} className="px-2 sm:px-4 py-2 sm:py-3 text-purple-100">{typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}</td>))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (<ChartView data={viewData} columns={viewColumns} />)}
                  </div>
                )}
                {viewData.length === 0 && viewCollection && (<div className="text-center py-12 text-purple-300">No data found in this collection</div>)}
              </div>
            </div>
          )}

          {activeTab === 'filter' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Filter Data</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <select value={selectedCollection} onChange={(e) => { setSelectedCollection(e.target.value); if(e.target.value) fetchFilterFields(); }} className="flex-1 p-4 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                    <option value="" className="bg-slate-800">Choose a collection...</option>
                    {collections.map(col => (<option key={col} value={col} className="bg-slate-800">{col}</option>))}
                  </select>
                </div>

                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Filter Mode</h3>
                    <div className="flex gap-2">
                      <button onClick={() => setFilterMode('gui')} className={`px-4 py-2 rounded-lg font-medium transition-all ${filterMode === 'gui' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}> GUI</button>
                      <button onClick={() => setFilterMode('json')} className={`px-4 py-2 rounded-lg font-medium transition-all ${filterMode === 'json' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}> JSON</button>
                    </div>
                  </div>

                  {filterMode === 'gui' ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-purple-200 text-sm">Build your filter visually</p>
                        <button onClick={addGuiFilter} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">+ Add Condition</button>
                      </div>
                      {guiFilters.map((filter, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <select value={filter.field} onChange={(e) => updateGuiFilter(index, 'field', e.target.value)} className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none" disabled={filterFields.length === 0}>
                            <option value="" className="bg-slate-800">{filterFields.length > 0 ? 'Select field...' : 'Load collection first'}</option>
                            {filterFields.map(field => (<option key={field} value={field} className="bg-slate-800">{field}</option>))}
                          </select>
                          <select value={filter.operator} onChange={(e) => updateGuiFilter(index, 'operator', e.target.value)} className="w-32 p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none">
                            <option value="$eq" className="bg-slate-800">Equals</option>
                            <option value="$ne" className="bg-slate-800">Not Equals</option>
                            <option value="$gt" className="bg-slate-800">Greater Than</option>
                            <option value="$gte" className="bg-slate-800">Greater or Equal</option>
                            <option value="$lt" className="bg-slate-800">Less Than</option>
                            <option value="$lte" className="bg-slate-800">Less or Equal</option>
                          </select>
                          <input type="text" placeholder="Value" value={filter.value} onChange={(e) => updateGuiFilter(index, 'value', e.target.value)} className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 outline-none" />
                          {guiFilters.length > 1 && (
                            <button onClick={() => removeGuiFilter(index)} className="p-3 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">Filter Expression (MongoDB JSON)</label>
                      <input type="text" placeholder='{"age": {"$gt": 25}} or leave empty for all' value={filterExpression} onChange={(e) => setFilterExpression(e.target.value)} className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                    </div>
                  )}
                </div>

                <button onClick={handleFilter} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-medium text-lg shadow-lg">Apply Filter</button>
                {filteredData.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                      <span className="text-green-300 font-medium">✓ Found {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                      <div className="max-h-96 overflow-auto p-4">
                        <pre className="text-sm text-purple-200 font-mono">{JSON.stringify(filteredData, null, 2)}</pre>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <input type="text" placeholder="New collection name" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} className="flex-1 p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                      <button onClick={handleSaveCollection} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg">Save Collection</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'fields' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Manage Fields</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <select value={fieldCollection} onChange={(e) => setFieldCollection(e.target.value)} className="flex-1 p-4 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                    <option value="" className="bg-slate-800">Select a collection...</option>
                    {collections.map(col => (<option key={col} value={col} className="bg-slate-800">{col}</option>))}
                  </select>
                  <button onClick={fetchFieldsForManagement} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg">Load Fields</button>
                </div>

                {fieldColumns.length > 0 && (
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 font-medium mb-2">Current Fields:</p>
                    <div className="flex flex-wrap gap-2">
                      {fieldColumns.map(field => (<span key={field} className="px-3 py-1 bg-blue-600/30 text-blue-200 rounded-lg text-sm">{field}</span>))}
                    </div>
                  </div>
                )}

                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-4">➕ Add New Field</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">Field Name</label>
                      <input type="text" placeholder="" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">Default Value (optional)</label>
                      <input type="text" placeholder="" value={newFieldValue} onChange={(e) => setNewFieldValue(e.target.value)} className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button onClick={handleAddField} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg">Add Field to Current</button>
                      <button onClick={handleAddFieldAndSaveAs} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg">Add & Save as New</button>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-4">🗑️ Delete Field</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">Select Field to Delete</label>
                      <select value={fieldToDelete} onChange={(e) => setFieldToDelete(e.target.value)} className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" disabled={fieldColumns.length === 0}>
                        <option value="" className="bg-slate-800">{fieldColumns.length > 0 ? 'Select field...' : 'Load fields first'}</option>
                        {fieldColumns.map(field => (<option key={field} value={field} className="bg-slate-800">{field}</option>))}
                      </select>
                    </div>
                    <button onClick={handleDeleteField} className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 rounded-xl hover:from-red-700 hover:to-rose-700 transition-all font-medium shadow-lg">Delete Field</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'update' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Update Field Data</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <select value={updateCollection} onChange={(e) => setUpdateCollection(e.target.value)} className="flex-1 p-4 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                    <option value="" className="bg-slate-800">Select a collection...</option>
                    {collections.map(col => (<option key={col} value={col} className="bg-slate-800">{col}</option>))}
                  </select>
                  <button onClick={fetchFieldsForUpdate} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg">Load Fields</button>
                </div>

                {updateFields.length > 0 && (
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 font-medium mb-2">Available Fields:</p>
                    <div className="flex flex-wrap gap-2">
                      {updateFields.map(field => (<span key={field} className="px-3 py-1 bg-blue-600/30 text-blue-200 rounded-lg text-sm">{field}</span>))}
                    </div>
                  </div>
                )}

                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-4">🎯 Filter Documents (Optional)</h3>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Filter Expression (MongoDB JSON)</label>
                    <input 
                      type="text" 
                      placeholder='{"age": {"$gt": 25}} or leave empty to update all documents' 
                      value={updateFilter} 
                      onChange={(e) => setUpdateFilter(e.target.value)} 
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" 
                    />
                    <p className="text-purple-300/70 text-xs mt-2">Leave empty to update all documents in the collection</p>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">✏️ Field Updates</h3>
                    <button onClick={addUpdateField} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm">+ Add Field</button>
                  </div>
                  
                  <div className="space-y-3">
                    {fieldUpdates.map((update, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1">
                          <select 
                            value={update.field} 
                            onChange={(e) => updateFieldValue(index, 'field', e.target.value)} 
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            disabled={updateFields.length === 0}
                          >
                            <option value="" className="bg-slate-800">{updateFields.length > 0 ? 'Select field...' : 'Load fields first'}</option>
                            {updateFields.map(field => (<option key={field} value={field} className="bg-slate-800">{field}</option>))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <input 
                            type="text" 
                            placeholder="New value" 
                            value={update.value} 
                            onChange={(e) => updateFieldValue(index, 'value', e.target.value)} 
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" 
                          />
                        </div>
                        {fieldUpdates.length > 1 && (
                          <button onClick={() => removeUpdateField(index)} className="p-3 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                    <button onClick={handleUpdateFields} className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-4 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all font-medium shadow-lg">
                      Update Current Collection
                    </button>
                    <button onClick={handleUpdateFieldsAndSaveAs} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg">
                      Update & Save as New
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 text-xl">💡</span>
                    <div className="text-yellow-200/90 text-sm">
                      <p className="font-medium mb-1">Tips:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>You can update multiple fields at once by adding more field-value pairs</li>
                        <li>Use the filter to target specific documents, or leave empty to update all</li>
                        <li>The update will show how many documents were matched and modified</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Manage Collections</h2>
              <div className="space-y-6">
                
                {collections.length > 0 && (
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 font-medium mb-3">Available Collections:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {collections.map(col => (
                        <div key={col} className="px-4 py-3 bg-blue-600/30 text-blue-200 rounded-lg text-sm font-medium flex items-center justify-between">
                          <span>📁 {col}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-red-900/20 border-2 border-red-500/50 p-6 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-3xl">⚠️</div>
                    <div>
                      <h3 className="text-xl font-semibold text-red-300 mb-2">Danger Zone - Delete Collection</h3>
                      <p className="text-red-200/80 text-sm">
                        Deleting a collection will permanently remove all data. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-red-200 mb-2">Select Collection to Delete</label>
                      <select 
                        value={collectionToDelete} 
                        onChange={(e) => setCollectionToDelete(e.target.value)} 
                        className="w-full p-4 bg-red-950/50 border border-red-500/30 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      >
                        <option value="" className="bg-slate-800">Select a collection to delete...</option>
                        {collections.map(col => (
                          <option key={col} value={col} className="bg-slate-800">{col}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={handleDeleteCollection} 
                      className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white px-6 py-4 rounded-xl hover:from-red-800 hover:to-red-950 transition-all font-bold shadow-lg border-2 border-red-500/50"
                    >
                      🗑️ Delete Collection Permanently
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">AI Insights</h2>
              <div className="space-y-6">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <p className="text-purple-200 text-sm">
                    🧠 Get AI-powered insights about your data including statistics, patterns, and recommendations
                  </p>
                </div>

                <div className="flex gap-4">
                  <select 
                    value={insightsCollection} 
                    onChange={(e) => setInsightsCollection(e.target.value)} 
                    className="flex-1 p-4 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  >
                    <option value="" className="bg-slate-800">Select a collection...</option>
                    {collections.map(col => (
                      <option key={col} value={col} className="bg-slate-800">{col}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleGetInsights} 
                    disabled={loadingInsights}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingInsights ? '⏳ Analyzing...' : '🔍 Get Insights'}
                  </button>
                </div>

                {insights && (
                  <div className="space-y-4">
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                      <p className="text-green-300 font-medium">✓ Analysis Complete</p>
                    </div>

                    <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                      <h3 className="text-xl font-semibold text-white mb-4">📊 Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-500/20 p-4 rounded-lg">
                          <p className="text-blue-300 text-sm mb-1">Total Records</p>
                          <p className="text-white text-2xl font-bold">{insights.totalRecords}</p>
                        </div>
                        <div className="bg-purple-500/20 p-4 rounded-lg">
                          <p className="text-purple-300 text-sm mb-1">Total Fields</p>
                          <p className="text-white text-2xl font-bold">{insights.totalFields}</p>
                        </div>
                        <div className="bg-green-500/20 p-4 rounded-lg">
                          <p className="text-green-300 text-sm mb-1">Numeric Fields</p>
                          <p className="text-white text-2xl font-bold">{insights.numericFields}</p>
                        </div>
                        <div className="bg-orange-500/20 p-4 rounded-lg">
                          <p className="text-orange-300 text-sm mb-1">Text Fields</p>
                          <p className="text-white text-2xl font-bold">{insights.textFields}</p>
                        </div>
                      </div>
                    </div>

                    {insights.fieldStats && Object.keys(insights.fieldStats).length > 0 && (
                      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                        <h3 className="text-xl font-semibold text-white mb-4">📈 Field Analysis</h3>
                        <div className="space-y-3">
                          {Object.entries(insights.fieldStats).map(([field, stats]) => (
                            <div key={field} className="bg-slate-800/50 p-4 rounded-lg">
                              <p className="text-purple-300 font-medium mb-2">{field}</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                {stats.unique && <p className="text-gray-300">Unique: {stats.unique}</p>}
                                {stats.min !== undefined && <p className="text-gray-300">Min: {stats.min}</p>}
                                {stats.max !== undefined && <p className="text-gray-300">Max: {stats.max}</p>}
                                {stats.avg !== undefined && <p className="text-gray-300">Avg: {stats.avg.toFixed(2)}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.recommendations && insights.recommendations.length > 0 && (
                      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                        <h3 className="text-xl font-semibold text-white mb-4">💡 Recommendations</h3>
                        <ul className="space-y-2">
                          {insights.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-purple-200">
                              <span className="text-yellow-400 mt-1">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'duplicates' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Duplicate Detection</h2>
              <div className="space-y-6">
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <p className="text-orange-200 text-sm">
                    🔍 Find duplicate records based on one or more fields
                  </p>
                </div>

                <div className="flex gap-4">
                  <select 
                    value={dupCollection} 
                    onChange={(e) => {
                      setDupCollection(e.target.value);
                      setDupSelectedFields([]);
                      setDuplicates(null);
                    }} 
                    className="flex-1 p-4 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  >
                    <option value="" className="bg-slate-800">Select a collection...</option>
                    {collections.map(col => (
                      <option key={col} value={col} className="bg-slate-800">{col}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleLoadDupFields} 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg"
                  >
                    Load Fields
                  </button>
                </div>

                {dupFields.length > 0 && (
                  <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Select Fields to Check for Duplicates</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {dupFields.map(field => (
                        <button
                          key={field}
                          onClick={() => toggleDupField(field)}
                          className={`p-3 rounded-lg font-medium transition-all ${
                            dupSelectedFields.includes(field)
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/10 text-purple-200 hover:bg-white/20'
                          }`}
                        >
                          {dupSelectedFields.includes(field) && '✓ '}
                          {field}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={handleFindDuplicates}
                      disabled={dupSelectedFields.length === 0}
                      className="w-full mt-4 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🔍 Find Duplicates
                    </button>
                  </div>
                )}

                {duplicates && (
                  <div className="space-y-4">
                    <div className={`${duplicates.duplicateGroups.length > 0 ? 'bg-orange-500/20 border-orange-500/30' : 'bg-green-500/20 border-green-500/30'} border rounded-xl p-4`}>
                      <p className={`${duplicates.duplicateGroups.length > 0 ? 'text-orange-300' : 'text-green-300'} font-medium`}>
                        {duplicates.duplicateGroups.length > 0 
                          ? `⚠️ Found ${duplicates.totalDuplicates} duplicate record(s) in ${duplicates.duplicateGroups.length} group(s)`
                          : '✓ No duplicates found!'
                        }
                      </p>
                    </div>

                    {duplicates.duplicateGroups.length > 0 && (
                      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                        <h3 className="text-xl font-semibold text-white mb-4">Duplicate Groups</h3>
                        <div className="space-y-4">
                          {duplicates.duplicateGroups.map((group, idx) => (
                            <div key={idx} className="bg-slate-800/50 p-4 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-purple-300 font-medium">Group {idx + 1}</p>
                                <span className="px-3 py-1 bg-orange-600/30 text-orange-200 rounded-full text-sm">
                                  {group.count} duplicates
                                </span>
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded">
                                <p className="text-gray-300 text-sm font-mono">
                                  {JSON.stringify(group.value, null, 2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl p-4 sm:p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">⚙️ Settings</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 sm:p-4">
                <p className="text-blue-200 text-xs sm:text-sm">
                  💡 Configure your MongoDB connection. Leave empty to use default (localhost:27017)
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-purple-200 mb-2">
                  MongoDB Connection URI
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={mongoUri}
                  onChange={(e) => setMongoUri(e.target.value)}
                  className="w-full p-3 sm:p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
                <p className="text-purple-300/70 text-xs mt-2">
                  Example: mongodb://localhost:27017 or mongodb+srv://user:pass@cluster.mongodb.net
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-purple-200 mb-2">
                  Database Name
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={mongoDb}
                  onChange={(e) => setMongoDb(e.target.value)}
                  className="w-full p-3 sm:p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
                <p className="text-purple-300/70 text-xs mt-2">
                  The database name to use for storing collections
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleTestConnection}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg"
                >
                  🔌 Test Connection
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveSettings}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg"
                  >
                    💾 Save Settings
                  </button>
                  <button
                    onClick={handleRemoveSettings}
                    className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 rounded-xl hover:from-red-700 hover:to-rose-700 transition-all font-medium shadow-lg"
                  >
                    🗑️ Remove Settings
                  </button>
                </div>
              </div>

              {(mongoUri || mongoDb) && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-green-200 text-sm font-medium mb-2">Current Settings:</p>
                  <p className="text-green-300/80 text-xs">URI: {mongoUri || 'Default (localhost:27017)'}</p>
                  <p className="text-green-300/80 text-xs">Database: {mongoDb || 'Default (csvdatamanager)'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

