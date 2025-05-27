import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InventoryItem, NewInventoryItem, SortConfig, ItemsPerPage } from './types';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import InventoryTable from './components/InventoryTable';
import Modal from './components/Modal';
import ItemForm from './components/ItemForm';
import Button from './components/Button';
import { PlusIcon, PackageIcon, TagIcon, DollarSignIcon, AlertTriangleIcon, FilterIcon, ListBulletIcon, DeleteIcon } from './components/Icons'; // Added DeleteIcon
import DashboardStatsCard from './components/DashboardStatsCard';
import Pagination from './components/Pagination'; 
import CategoryFilter from './components/CategoryFilter'; 

// Sample initial data (can be removed if localStorage always has data)
const initialItems: InventoryItem[] = [
  { id: '1', name: 'Laptop Pro 15"', quantity: 5, price: 1200.00, category: 'Electronics', sku: 'LP15-001', lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '2', name: 'Wireless Mouse', quantity: 150, price: 25.99, category: 'Accessories', sku: 'WM-002', lastUpdated: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', name: 'Mechanical Keyboard', quantity: 8, price: 79.50, category: 'Accessories', sku: 'MK-003', lastUpdated: new Date().toISOString() },
  { id: '4', name: 'Office Chair Ergonomic', quantity: 30, price: 250.00, category: 'Furniture', sku: 'OC-004', lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: '5', name: '27" 4K Monitor', quantity: 15, price: 350.00, category: 'Electronics', sku: 'MON27-4K', lastUpdated: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: '6', name: 'USB-C Hub', quantity: 60, price: 35.00, category: 'Accessories', sku: 'USBC-HUB-01', lastUpdated: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: '7', name: 'Standing Desk', quantity: 12, price: 450.00, category: 'Furniture', sku: 'STD-DSK-001', lastUpdated: new Date(Date.now() - 86400000 * 10).toISOString() },
];

const LOW_STOCK_THRESHOLD = 10;

const App: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // New states for features
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastUpdated', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(10);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);


  // Load initial data and theme
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call or local storage load
    setTimeout(() => {
      try {
        const storedItems = localStorage.getItem('inventoryItems');
        if (storedItems) {
          setInventoryItems(JSON.parse(storedItems));
        } else {
          setInventoryItems(initialItems); // Fallback to initial data
        }
      } catch (error) {
        console.error("Failed to parse inventory items from localStorage:", error);
        setInventoryItems(initialItems); // Fallback in case of parsing error
      } finally {
        setIsLoading(false);
      }
    }, 500); // Shorter delay for better UX

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const localTheme = localStorage.getItem('theme');
    if (localTheme === 'dark' || (!localTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Save items to localStorage
  useEffect(() => {
    if (!isLoading) { // Only save after initial load and if not loading
      localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    }
  }, [inventoryItems, isLoading]);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prevMode => {
      const newMode = !prevMode;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newMode;
    });
  }, []);

  // Item CRUD operations
  const handleItemFormSubmit = (itemData: NewInventoryItem | InventoryItem) => {
    if ('id' in itemData) { // Editing existing item (InventoryItem)
        setInventoryItems(prevItems =>
            prevItems.map(item =>
              item.id === itemData.id
                ? { ...itemData, lastUpdated: new Date().toISOString() }
                : item
            )
          );
    } else { // Adding new item (NewInventoryItem)
        const newItem: InventoryItem = {
            ...(itemData as NewInventoryItem), // Cast to NewInventoryItem
            id: Date.now().toString(), 
            lastUpdated: new Date().toISOString(),
          };
          setInventoryItems(prevItems => [newItem, ...prevItems]);
    }
    setIsModalOpen(false);
    setEditingItem(undefined);
  };


 const handleDeleteRequest = (itemId: string, itemName: string) => {
    setItemToDelete({ id: itemId, name: itemName });
    setIsDeleteConfirmModalOpen(true);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      setInventoryItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
    }
    setIsDeleteConfirmModalOpen(false);
    setItemToDelete(null);
  };


  // Modal handling
  const openAddModal = () => {
    setEditingItem(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(undefined); // Ensure editingItem is cleared
  }

  // Filtering, Sorting, Pagination Logic
  const filteredAndSortedItems = useMemo(() => {
    let items = [...inventoryItems];

    // Filter by search term
    if (searchTerm) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      items = items.filter(item => item.category === selectedCategory);
    }

    // Sort items
    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        }
        // Add more type comparisons if needed (e.g., dates, though lastUpdated is string)

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return items;
  }, [inventoryItems, searchTerm, selectedCategory, sortConfig]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);


  const requestSort = (key: keyof InventoryItem) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page on category change
  };

  // Dashboard Stats
  const totalItemsInStock = useMemo(() => inventoryItems.reduce((sum, item) => sum + item.quantity, 0), [inventoryItems]);
  const uniqueProductSKUs = inventoryItems.length;
  const totalInventoryValue = useMemo(() => inventoryItems.reduce((sum, item) => sum + item.quantity * item.price, 0), [inventoryItems]);
  const lowStockItemsCount = useMemo(() => inventoryItems.filter(item => item.quantity <= LOW_STOCK_THRESHOLD).length, [inventoryItems]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(inventoryItems.map(item => item.category));
    return Array.from(uniqueCategories).sort();
  }, [inventoryItems]);

  return (
    <div className={`min-h-screen flex flex-col bg-secondary-50 dark:bg-secondary-950 ${darkMode ? 'dark' : ''}`}>
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Stats Section */}
        <section className="mb-6 md:mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <DashboardStatsCard title="Total Items in Stock" value={totalItemsInStock.toLocaleString()} icon={<PackageIcon />} colorClass="text-blue-600 bg-blue-100 dark:bg-blue-900/60 dark:text-blue-300"/>
          <DashboardStatsCard title="Unique Product SKUs" value={uniqueProductSKUs.toLocaleString()} icon={<TagIcon />} colorClass="text-teal-600 bg-teal-100 dark:bg-teal-900/60 dark:text-teal-300"/>
          <DashboardStatsCard title="Total Inventory Value" value={`$${totalInventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} icon={<DollarSignIcon />} colorClass="text-green-600 bg-green-100 dark:bg-green-900/60 dark:text-green-300"/>
          <DashboardStatsCard title="Low Stock Items" value={lowStockItemsCount.toLocaleString()} icon={<AlertTriangleIcon />} colorClass="text-warning-600 bg-warning-100 dark:bg-warning-900/60 dark:text-warning-300" subValue={lowStockItemsCount > 0 ? "Needs attention" : "All good!"}/>
        </section>

        {/* Controls and Table Section */}
        <div className="bg-white dark:bg-secondary-800 shadow-xl rounded-xl border border-secondary-200 dark:border-secondary-700/70">
          <div className="p-5 border-b border-secondary-200 dark:border-secondary-700 flex flex-col md:flex-row justify-between items-center gap-4 flex-wrap">
            <div className="flex gap-4 w-full md:w-auto flex-wrap md:flex-nowrap">
              <div className="flex-grow md:flex-initial md:w-72">
                <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
              </div>
              <div className="flex-grow md:flex-initial md:w-56">
                <CategoryFilter
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={handleCategoryChange}
                />
              </div>
            </div>
            <Button onClick={openAddModal} variant="primary" size="md" leftIcon={<PlusIcon className="w-4 h-4"/>}>
              Add New Item
            </Button>
          </div>
          
          <InventoryTable
            items={paginatedItems}
            onEdit={openEditModal}
            onDeleteRequest={handleDeleteRequest}
            isLoading={isLoading}
            sortConfig={sortConfig}
            requestSort={requestSort}
            lowStockThreshold={LOW_STOCK_THRESHOLD}
          />

          {filteredAndSortedItems.length > 0 && !isLoading && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredAndSortedItems.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(newSize) => {
                setItemsPerPage(newSize as ItemsPerPage);
                setCurrentPage(1); // Reset to first page
              }}
              totalItems={filteredAndSortedItems.length}
            />
          )}
        </div>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingItem ? 'Edit Item Details' : 'Add New Item to Inventory'}
        size="lg"
      >
        <ItemForm
          onSubmit={handleItemFormSubmit}
          initialData={editingItem}
          onClose={closeModal}
        />
      </Modal>

      <Modal
        isOpen={isDeleteConfirmModalOpen}
        onClose={() => setIsDeleteConfirmModalOpen(false)}
        title="Confirm Deletion"
        size="sm"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsDeleteConfirmModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDeleteItem} leftIcon={<DeleteIcon className="w-4 h-4"/>}>Delete Item</Button>
          </div>
        }
      >
        <div className="text-center">
            <AlertTriangleIcon className="w-16 h-16 text-warning-500 mx-auto mb-4"/>
            <h3 className="text-lg font-medium text-secondary-800 dark:text-secondary-100 mb-2">Are you sure?</h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              You are about to delete the item: <strong className="text-secondary-700 dark:text-secondary-200">{itemToDelete?.name || 'this item'}</strong>. 
              This action cannot be undone.
            </p>
        </div>
      </Modal>
      
      <footer className="py-8 text-center text-sm text-secondary-500 dark:text-secondary-400 border-t border-secondary-200 dark:border-secondary-700/30 mt-8">
        © {new Date().getFullYear()} Advanced Inventory System. Modernized & Feature-Rich.
      </footer>
    </div>
  );
};

export default App;