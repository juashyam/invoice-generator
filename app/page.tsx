'use client';

import { useState, useEffect, useRef } from 'react';
import { Customer, Product, Invoice, LineItem, MerchantConfig } from '@/types';
import {
  getDraftInvoice,
  saveDraftInvoice,
  clearDraftInvoice,
  getMostFrequentCustomers,
  getCustomers,
  saveCustomer,
  incrementCustomerUsage,
  getProductsSortedByUsage,
  getAllProducts,
  saveProduct,
  incrementProductUsage,
  saveInvoice,
  getMerchantConfig,
  saveMerchantConfig,
} from '@/lib/storage';
import { calculateSubtotal, calculateTotal, generateId } from '@/lib/utils';
import { generateInvoicePDF } from '@/lib/pdf';

type Screen = 'customer-selection' | 'items' | 'add-item' | 'share' | 'settings';

export default function NewInvoicePage() {
  // State machine
  const [screen, setScreen] = useState<Screen>('customer-selection');
  
  // Core data
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [merchantConfig, setMerchantConfig] = useState<MerchantConfig | null>(null);
  
  // Reference data
  const [frequentCustomers, setFrequentCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Customer selection screen state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [showAddressField, setShowAddressField] = useState(false);
  
  // Add/Edit item screen state
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [itemProductName, setItemProductName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnit, setItemUnit] = useState('piece');
  const [itemQuantityStep, setItemQuantityStep] = useState(1); // Track increment step
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  
  // Share screen state
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  const [shareError, setShareError] = useState('');
  
  // Settings screen state
  const [editingConfig, setEditingConfig] = useState<MerchantConfig>({
    businessName: '',
    address1: '',
    address2: '',
    phone: '',
  });
  
  // Refs for auto-focus
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);

  // Load data on mount - restore draft if exists
  useEffect(() => {
    const draft = getDraftInvoice();
    
    if (draft && draft.customerId) {
      // Resume draft with customer already selected
      setInvoice(draft);
      const customers = getCustomers();
      const customer = customers.find(c => c.id === draft.customerId);
      if (customer) {
        setSelectedCustomer(customer);
        setScreen('items');
      }
    } else if (draft) {
      // Draft exists but no customer selected yet
      setInvoice(draft);
      setScreen('customer-selection');
    } else {
      // Create new draft
      const newInvoice: Invoice = {
        id: generateId(),
        customerId: '',
        customerName: '',
        lineItems: [],
        subtotal: 0,
        total: 0,
        createdAt: Date.now(),
        isDraft: true,
      };
      setInvoice(newInvoice);
      saveDraftInvoice(newInvoice);
    }

    setFrequentCustomers(getMostFrequentCustomers());
    
    // Load merchant config
    setMerchantConfig(getMerchantConfig());
    
    // Load products asynchronously (includes Google Sheets + manual)
    getAllProducts().then(allProducts => {
      setProducts(allProducts);
    }).catch(error => {
      console.error('Failed to load products:', error);
      // Fallback to manual products only
      setProducts(getProductsSortedByUsage());
    });
  }, []);

  // Auto-save on every change
  useEffect(() => {
    if (invoice) {
      saveDraftInvoice(invoice);
    }
  }, [invoice]);
  
  // Auto-focus search on customer selection screen
  useEffect(() => {
    if (screen === 'customer-selection' && customerSearchRef.current) {
      customerSearchRef.current.focus();
    }
  }, [screen]);

  // Sync editingConfig when settings screen opens
  useEffect(() => {
    if (screen === 'settings' && merchantConfig) {
      setEditingConfig(merchantConfig);
    }
  }, [screen, merchantConfig]);
  
  // Auto-focus product search on add item screen
  useEffect(() => {
    if (screen === 'add-item' && productSearchRef.current) {
      productSearchRef.current.focus();
    }
  }, [screen]);
  
  // Filter customers by search
  const filteredCustomers = customerSearch.trim()
    ? frequentCustomers.filter(c => 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
      )
    : frequentCustomers;
  
  // Detect when user is typing a new customer name
  useEffect(() => {
    if (customerSearch.trim() && filteredCustomers.length === 0) {
      setShowCustomerForm(true);
    } else {
      setShowCustomerForm(false);
    }
  }, [customerSearch, filteredCustomers.length]);

  // CUSTOMER SELECTION HANDLERS
  const selectExistingCustomer = (customer: Customer) => {
    if (!invoice) return;
    
    setSelectedCustomer(customer);
    setInvoice({
      ...invoice,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
    });
    setScreen('items');
  };
  
  const addNewCustomerInline = () => {
    if (!customerSearch.trim() || !invoice) return;

    const newCustomer: Customer = {
      id: generateId(),
      name: customerSearch.trim(),
      phone: newCustomerPhone.trim() || undefined,
      address: newCustomerAddress.trim() || undefined,
      usageCount: 0,
      lastUsed: Date.now(),
    };

    saveCustomer(newCustomer);
    selectExistingCustomer(newCustomer);
    
    // Reset form
    setCustomerSearch('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');
    setShowAddressField(false);
    setFrequentCustomers(getMostFrequentCustomers());
  };

  // ITEMS SCREEN HANDLERS
  const openAddItem = () => {
    setEditingItem(null);
    setItemProductName('');
    setItemPrice('');
    setItemQuantity('1');
    setItemUnit('piece');
    setItemQuantityStep(1);
    setProductSuggestions([]);
    setScreen('add-item');
  };
  
  const openEditItem = (item: LineItem) => {
    setEditingItem(item);
    setItemProductName(item.productName);
    setItemPrice(item.unitPrice.toString());
    setItemQuantity(item.quantity.toString());
    setItemUnit(item.unit || 'piece');
    setItemQuantityStep(1); // Default to 1 for editing
    setProductSuggestions([]);
    setScreen('add-item');
  };
  
  const deleteItem = (itemId: string) => {
    if (!invoice) return;

    const updatedLineItems = invoice.lineItems.filter(item => item.id !== itemId);
    const subtotal = calculateSubtotal(updatedLineItems);
    const total = calculateTotal(updatedLineItems);

    setInvoice({
      ...invoice,
      lineItems: updatedLineItems,
      subtotal,
      total,
    });
  };

  // ADD/EDIT ITEM SCREEN HANDLERS
  const handleProductNameChange = (value: string) => {
    setItemProductName(value);
    
    // Show autocomplete suggestions
    if (value.trim()) {
      const suggestions = products.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setProductSuggestions(suggestions);
    } else {
      setProductSuggestions([]);
    }
  };
  
  const selectProductFromCatalog = (product: Product) => {
    setItemProductName(product.name);
    setItemPrice(product.price.toString());
    setItemUnit(product.unit || 'piece');
    const defaultQty = product.defaultQuantity || 1;
    setItemQuantity(defaultQty.toString());
    setItemQuantityStep(defaultQty); // Set step to default quantity
    setProductSuggestions([]);
  };
  
  const incrementQuantity = () => {
    const current = parseFloat(itemQuantity) || 0;
    const newQty = current + itemQuantityStep;
    setItemQuantity(newQty.toString());
  };
  
  const decrementQuantity = () => {
    const current = parseFloat(itemQuantity) || 0;
    const newQty = Math.max(0.01, current - itemQuantityStep);
    setItemQuantity(newQty.toString());
  };
  
  const saveItem = () => {
    if (!invoice || !itemProductName.trim()) return;
    
    const price = parseFloat(itemPrice);
    const quantity = parseFloat(itemQuantity);
    
    if (isNaN(price) || price < 0 || isNaN(quantity) || quantity <= 0) return;

    if (editingItem) {
      // Update existing item
      const updatedLineItems = invoice.lineItems.map(item =>
        item.id === editingItem.id
          ? { ...item, productName: itemProductName.trim(), unitPrice: price, quantity, unit: itemUnit }
          : item
      );
      
      const subtotal = calculateSubtotal(updatedLineItems);
      const total = calculateTotal(updatedLineItems);

      setInvoice({
        ...invoice,
        lineItems: updatedLineItems,
        subtotal,
        total,
      });
    } else {
      // Add new item
      const lineItem: LineItem = {
        id: generateId(),
        productName: itemProductName.trim(),
        unitPrice: price,
        quantity,
        unit: itemUnit,
      };

      const updatedLineItems = [...invoice.lineItems, lineItem];
      const subtotal = calculateSubtotal(updatedLineItems);
      const total = calculateTotal(updatedLineItems);

      setInvoice({
        ...invoice,
        lineItems: updatedLineItems,
        subtotal,
        total,
      });
      
      // Save to catalog if new
      const existingProduct = products.find(p => 
        p.name.toLowerCase() === itemProductName.trim().toLowerCase()
      );
      
      if (existingProduct) {
        incrementProductUsage(existingProduct.id);
      } else {
        const newProduct: Product = {
          id: generateId(),
          name: itemProductName.trim(),
          price,
          unit: itemUnit,
          usageCount: 1,
        };
        saveProduct(newProduct);
      }
      
      // Reload all products (includes sheet + manual)
      getAllProducts().then(allProducts => {
        setProducts(allProducts);
      }).catch(() => {
        setProducts(getProductsSortedByUsage());
      });
    }

    setScreen('items');
  };
  
  const cancelAddItem = () => {
    setScreen('items');
  };

  // GENERATE & SHARE HANDLERS
  const handleGenerateInvoice = async () => {
    if (!invoice || !selectedCustomer || invoice.lineItems.length === 0) return;

    try {
      const pdfBlob = await generateInvoicePDF(invoice, merchantConfig || undefined);
      setGeneratedPdfBlob(pdfBlob);
      setShareError('');
      setScreen('share');
    } catch (error) {
      console.error('PDF generation failed:', error);
      setShareError('Couldn\'t generate invoice. Try again.');
    }
  };

  const handleShareWhatsApp = async () => {
    if (!generatedPdfBlob || !invoice || !selectedCustomer) return;

    try {
      const file = new File([generatedPdfBlob], `invoice_${invoice.id}.pdf`, {
        type: 'application/pdf',
      });

      const shareData = {
        title: 'Invoice',
        text: `Hi ${invoice.customerName},\n\nPlease find your invoice attached.\n\nTotal: ₹${invoice.total.toFixed(2)}\n\nThank you for your business!`,
        files: [file],
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        
        // Finalize and reset
        finalizeInvoiceAndReset();
      } else {
        // Fallback: download
        downloadPDF();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        setShareError('Share failed. Try again.');
      }
      // If user cancelled (AbortError), do nothing
    }
  };
  
  const handleShareOther = async () => {
    if (!generatedPdfBlob || !invoice) return;

    try {
      const file = new File([generatedPdfBlob], `invoice_${invoice.id}.pdf`, {
        type: 'application/pdf',
      });

      const shareData = {
        title: 'Invoice',
        files: [file],
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        finalizeInvoiceAndReset();
      } else {
        downloadPDF();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        downloadPDF();
      }
    }
  };
  
  const downloadPDF = () => {
    if (!generatedPdfBlob || !invoice) return;
    
    const url = URL.createObjectURL(generatedPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${invoice.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    
    finalizeInvoiceAndReset();
  };
  
  const finalizeInvoiceAndReset = async () => {
    if (!invoice || !selectedCustomer || !generatedPdfBlob) return;
    
    // Convert blob to base64 for storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      
      // Save finalized invoice
      const finalInvoice: Invoice = {
        ...invoice,
        isDraft: false,
        generatedPdfBlob: base64,
      };
      saveInvoice(finalInvoice);
      
      // Increment customer usage
      incrementCustomerUsage(selectedCustomer.id);
      
      // Clear draft
      clearDraftInvoice();
      
      // Reset to new invoice after brief delay
      setTimeout(() => {
        const newInvoice: Invoice = {
          id: generateId(),
          customerId: '',
          customerName: '',
          lineItems: [],
          subtotal: 0,
          total: 0,
          createdAt: Date.now(),
          isDraft: true,
        };
        setInvoice(newInvoice);
        setSelectedCustomer(null);
        setGeneratedPdfBlob(null);
        setCustomerSearch('');
        saveDraftInvoice(newInvoice);
        setScreen('customer-selection');
      }, 1000);
    };
    reader.readAsDataURL(generatedPdfBlob);
  };

  if (!invoice) return null;

  // Calculate line total for add/edit item screen
  const lineTotal = (() => {
    const price = parseFloat(itemPrice) || 0;
    const quantity = parseFloat(itemQuantity) || 0;
    return price * quantity;
  })();

  // SCREEN: CUSTOMER SELECTION
  if (screen === 'customer-selection') {
    return (
      <div className="flex flex-col h-screen">
        <header className="bg-white border-b border-gray-200 px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">New Invoice</h1>
              {merchantConfig?.businessName ? (
                <div className="text-sm text-gray-500 mt-0.5">{merchantConfig.businessName}</div>
              ) : (
                <div className="text-sm text-gray-400 mt-0.5">Tap settings to add your business name</div>
              )}
            </div>
            <button
              onClick={() => setScreen('settings')}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {/* Most Frequent Customers Dropdown */}
            {!customerSearch && frequentCustomers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const customer = frequentCustomers.find(c => c.id === e.target.value);
                      if (customer) selectExistingCustomer(customer);
                    }
                  }}
                  className="input-field"
                  defaultValue=""
                >
                  <option value="" disabled>Choose from {frequentCustomers.length} customers...</option>
                  {frequentCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}{customer.phone ? ` - ${customer.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {customerSearch ? 'Search Customer' : 'Or Search / Add New'}
              </label>
              <input
                ref={customerSearchRef}
                type="text"
                placeholder="Search customer or add new"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Filtered results */}
            {customerSearch && filteredCustomers.length > 0 && (
              <div className="space-y-2">
                {filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => selectExistingCustomer(customer)}
                    className="w-full card text-left active:bg-gray-50"
                  >
                    <div className="font-medium">{customer.name}</div>
                    {customer.phone && (
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Inline add customer (expanded state) */}
            {showCustomerForm && (
              <div className="card space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Add New Customer</div>
                  <div className="font-medium">{customerSearch}</div>
                </div>
                
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={newCustomerPhone}
                  onChange={e => setNewCustomerPhone(e.target.value)}
                  className="input-field"
                />
                
                {!showAddressField ? (
                  <button
                    onClick={() => setShowAddressField(true)}
                    className="text-blue-600 text-sm text-left"
                  >
                    + Add address
                  </button>
                ) : (
                  <textarea
                    placeholder="Address (optional)"
                    value={newCustomerAddress}
                    onChange={e => setNewCustomerAddress(e.target.value)}
                    className="input-field resize-none"
                    rows={3}
                  />
                )}
                
                <button onClick={addNewCustomerInline} className="btn-primary">
                  Continue
                </button>
              </div>
            )}
          </div>
        </main>
        
        <footer className="bg-white border-t border-gray-100 px-4 py-2 text-center">
          <p className="text-xs text-gray-400">
            Made with ❤️ by{' '}
            <a 
              href="https://github.com/juashyam" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 underline"
            >
              juashyam
            </a>
          </p>
        </footer>
      </div>
    );
  }

  // SCREEN: SETTINGS
  if (screen === 'settings') {
    const handleSaveConfig = async () => {
      const sheetIdChanged = editingConfig.googleSheetId !== merchantConfig?.googleSheetId;
      
      saveMerchantConfig(editingConfig);
      setMerchantConfig(editingConfig);
      
      // Reload products if sheet ID changed
      if (sheetIdChanged) {
        try {
          const allProducts = await getAllProducts();
          setProducts(allProducts);
        } catch (error) {
          console.error('Failed to reload products:', error);
        }
      }
      
      setScreen('customer-selection');
    };

    return (
      <div className="flex flex-col h-screen bg-white">
        <header className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <button onClick={() => setScreen('customer-selection')} className="text-blue-600">
            Cancel
          </button>
          <h1 className="text-lg font-semibold">Business Details</h1>
          <button onClick={handleSaveConfig} className="text-blue-600 font-semibold">
            Save
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-4 max-w-md mx-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={editingConfig.businessName}
                onChange={e => setEditingConfig({ ...editingConfig, businessName: e.target.value })}
                placeholder="Your Business Name"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={editingConfig.address1}
                onChange={e => setEditingConfig({ ...editingConfig, address1: e.target.value })}
                placeholder="Street address"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={editingConfig.address2}
                onChange={e => setEditingConfig({ ...editingConfig, address2: e.target.value })}
                placeholder="City, State - Pincode"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={editingConfig.phone}
                onChange={e => setEditingConfig({ ...editingConfig, phone: e.target.value })}
                placeholder="Contact number"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="email"
                value={editingConfig.email || ''}
                onChange={e => setEditingConfig({ ...editingConfig, email: e.target.value })}
                placeholder="your@email.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={editingConfig.gstNumber || ''}
                onChange={e => setEditingConfig({ ...editingConfig, gstNumber: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
                className="input-field"
              />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Sheet ID <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={editingConfig.googleSheetId || ''}
                onChange={e => setEditingConfig({ ...editingConfig, googleSheetId: e.target.value })}
                placeholder="1abc...xyz"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Import product catalog from Google Sheets. <a href="/example_google_sheet.csv" target="_blank" className="text-blue-600 underline">Setup guide</a>
              </p>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-gray-100 px-4 py-2 text-center">
          <p className="text-xs text-gray-400">
            Made with ❤️ by{' '}
            <a 
              href="https://github.com/juashyam" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 underline"
            >
              juashyam
            </a>
          </p>
        </footer>
      </div>
    );
  }

  // SCREEN: ITEMS (Core Working Screen)
  if (screen === 'items') {
    return (
      <div className="flex flex-col h-screen">
        {/* Header with selected customer */}
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="text-center mb-3">
            <div className="text-base font-semibold text-gray-800">{merchantConfig?.businessName || 'Invoice'}</div>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-500">Invoice for</div>
              <div className="font-semibold">{selectedCustomer?.name}</div>
            </div>
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setInvoice({ ...invoice, customerId: '', customerName: '' });
                setScreen('customer-selection');
              }}
              className="text-blue-600 text-sm"
            >
              Change
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4">
          {/* Empty state */}
          {invoice.lineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="text-gray-400 mb-6">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 mb-6">Add your first product or service</p>
              <button onClick={openAddItem} className="btn-primary max-w-xs">
                Add Item
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={openAddItem} className="btn-secondary">
                + Add Another Item
              </button>

              {invoice.lineItems.map(item => (
                <div key={item.id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <button
                      onClick={() => openEditItem(item)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-gray-500">
                        {item.quantity} {item.unit} × ₹{item.unitPrice.toFixed(2)}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-red-600 text-sm ml-4"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="text-right text-lg font-semibold">
                    ₹{(item.unitPrice * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Sticky footer with totals */}
        {invoice.lineItems.length > 0 && (
          <footer className="bg-white border-t border-gray-200 p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>₹{invoice.total.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={handleGenerateInvoice} className="btn-primary">
              Generate Invoice
            </button>
          </footer>
        )}
        
        {/* Attribution footer */}
        {invoice.lineItems.length === 0 && (
          <footer className="bg-white border-t border-gray-100 px-4 py-2 text-center">
            <p className="text-xs text-gray-400">
              Made with ❤️ by{' '}
              <a 
                href="https://github.com/juashyam" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 underline"
              >
                juashyam
              </a>
            </p>
          </footer>
        )}
      </div>
    );
  }

  // SCREEN: ADD/EDIT ITEM (Full-screen overlay)
  if (screen === 'add-item') {
    return (
      <div className="flex flex-col h-screen bg-white">
        <header className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <button onClick={cancelAddItem} className="text-blue-600">
            Cancel
          </button>
          <h1 className="text-lg font-semibold">
            {editingItem ? 'Edit Item' : 'Add Item'}
          </h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {/* Quick product selector dropdown */}
            {!itemProductName && products.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Product
                </label>
                <select
                  key={`product-select-${editingItem?.id || 'new'}`}
                  onChange={(e) => {
                    if (e.target.value) {
                      const product = products.find(p => p.id === e.target.value);
                      if (product) selectProductFromCatalog(product);
                    }
                  }}
                  className="input-field"
                  defaultValue=""
                >
                  <option value="" disabled>Choose from {products.length} products...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.defaultQuantity || 1} {product.unit}) - ₹{product.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Product name with autocomplete */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {itemProductName ? 'Product or Service' : 'Or Search / Type New'}
              </label>
              <input
                ref={productSearchRef}
                type="text"
                placeholder="Search or type product name"
                value={itemProductName}
                onChange={e => handleProductNameChange(e.target.value)}
                className="input-field"
              />
              
              {/* Autocomplete suggestions */}
              {productSuggestions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {productSuggestions.map(product => (
                    <button
                      key={product.id}
                      onClick={() => selectProductFromCatalog(product)}
                      className="w-full bg-gray-50 p-3 rounded-lg text-left active:bg-gray-100"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{product.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({product.defaultQuantity || 1} {product.unit})
                          </span>
                        </div>
                        <span className="text-gray-600">₹{product.price.toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price per Unit
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={itemPrice}
                  onChange={e => setItemPrice(e.target.value)}
                  className="input-field pl-8"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select
                value={itemUnit}
                onChange={e => setItemUnit(e.target.value)}
                className="input-field"
              >
                <option value="piece">Piece</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="lt">Liter</option>
                <option value="pack">Pack</option>
                <option value="box">Box</option>
                <option value="dozen">Dozen</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity ({itemUnit})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={decrementQuantity}
                  className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-gray-700 font-semibold text-xl"
                >
                  −
                </button>
                <input
                  type="number"
                  placeholder="1"
                  value={itemQuantity}
                  onChange={e => setItemQuantity(e.target.value)}
                  className="input-field flex-1 text-center"
                  min="0.01"
                  step="0.01"
                />
                <button
                  type="button"
                  onClick={incrementQuantity}
                  className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-gray-700 font-semibold text-xl"
                >
                  +
                </button>
              </div>
            </div>

            {/* Line total (calculated live) */}
            <div className="card bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Line Total</span>
                <span className="text-2xl font-bold">
                  ₹{lineTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-gray-200 p-4">
          <button
            onClick={saveItem}
            className="btn-primary"
            disabled={!itemProductName.trim() || !itemPrice || !itemQuantity}
          >
            {editingItem ? 'Update Item' : 'Add Item'}
          </button>
        </footer>
        
        <div className="bg-white border-t border-gray-100 px-4 py-2 text-center">
          <p className="text-xs text-gray-400">
            Made with ❤️ by{' '}
            <a 
              href="https://github.com/juashyam" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 underline"
            >
              juashyam
            </a>
          </p>
        </div>
      </div>
    );
  }
  // SCREEN: SHARE INVOICE
  if (screen === 'share') {
    return (
      <div className="flex flex-col h-screen">
        <header className="bg-white border-b border-gray-200 px-4 py-4 text-center">
          <div className="text-base font-semibold text-gray-800 mb-1">{merchantConfig?.businessName || 'Invoice'}</div>
          <h1 className="text-lg font-medium text-gray-600">Share Invoice</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-6">
            {/* Invoice Preview */}
            <div className="card">
              <div className="border-b border-gray-200 pb-3 mb-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{merchantConfig?.businessName || '(Business name)'}</div>
                    <div className="text-xs text-gray-500">{merchantConfig?.address1}</div>
                    <div className="text-xs text-gray-500">{merchantConfig?.address2}</div>
                    <div className="text-xs text-gray-500">Ph: {merchantConfig?.phone}</div>
                    {merchantConfig?.email && (
                      <div className="text-xs text-gray-500">{merchantConfig.email}</div>
                    )}
                    {merchantConfig?.gstNumber && (
                      <div className="text-xs text-gray-500">GST: {merchantConfig.gstNumber}</div>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    PDF
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-3">
                  Invoice #{invoice.id.slice(0, 8).toUpperCase()}
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-700 mb-1">Bill To:</div>
                <div className="text-sm font-medium">{invoice.customerName}</div>
                {invoice.customerPhone && (
                  <div className="text-xs text-gray-600">{invoice.customerPhone}</div>
                )}
                {invoice.customerAddress && (
                  <div className="text-xs text-gray-600">{invoice.customerAddress}</div>
                )}
              </div>

              {/* Line Items */}
              <div className="border-t border-b border-gray-200 py-2 mb-3">
                <div className="space-y-2">
                  {invoice.lineItems.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-gray-500">
                          {item.quantity} {item.unit} × ₹{item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="font-medium">
                        ₹{(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {shareError && (
              <div className="card bg-red-50 border border-red-200">
                <p className="text-red-800 text-sm">{shareError}</p>
              </div>
            )}

            {/* Success message */}
            <div className="text-center text-gray-600">
              <p>Invoice generated successfully!</p>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-gray-200 p-4 space-y-3">
          <button onClick={handleShareWhatsApp} className="btn-primary">
            Share on WhatsApp
          </button>
          <button onClick={handleShareOther} className="btn-secondary">
            Share via…
          </button>
          <button onClick={downloadPDF} className="btn-secondary">
            Download PDF
          </button>
        </footer>
        
        <div className="bg-white border-t border-gray-100 px-4 py-2 text-center">
          <p className="text-xs text-gray-400">
            Made with ❤️ by{' '}
            <a 
              href="https://github.com/juashyam" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 underline"
            >
              juashyam
            </a>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
