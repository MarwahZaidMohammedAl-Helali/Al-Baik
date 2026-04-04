'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

// Products Tab Component
export function ProductsTab({
  products,
  categories,
  currentPage,
  totalPages,
  searchTerm,
  selectedCategory,
  stockFilter,
  onSearch,
  onPageChange,
  onSearchChange,
  onCategoryChange,
  onStockFilterChange
}: any) {
  const [showAddProduct, setShowAddProduct] = useState(false)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Products Management</h2>
        <button
          onClick={() => setShowAddProduct(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search products..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat: any) => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
            <select
              value={stockFilter}
              onChange={(e) => onStockFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Products</option>
              <option value="inStock">In Stock</option>
              <option value="lowStock">Low Stock</option>
              <option value="outOfStock">Out of Stock</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={onSearch}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product: any) => (
                <ProductRow key={product._id} product={product} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <AddProductModal
          categories={categories}
          onClose={() => setShowAddProduct(false)}
          onSuccess={() => {
            setShowAddProduct(false)
            onSearch()
          }}
        />
      )}
    </div>
  )
}
// Product Row Component
function ProductRow({ product }: { product: any }) {
  const getStockStatusBadge = (status: string, quantity: number) => {
    const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
    
    switch (status) {
      case 'inStock':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'lowStock':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'outOfStock':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'inStock': return 'In Stock'
      case 'lowStock': return 'Low Stock'
      case 'outOfStock': return 'Out of Stock'
      default: return 'Unknown'
    }
  }

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {product.primaryImage ? (
              <img
                className="h-10 w-10 rounded-lg object-cover"
                src={product.primaryImage.url}
                alt={product.primaryImage.alt}
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">📦</span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{product.name}</div>
            <div className="text-sm text-gray-500">{product.sku}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{product.category}</div>
        <div className="text-sm text-gray-500">{product.brand}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          ${product.pricing.retailPrice} {product.pricing.currency}
        </div>
        <div className="text-sm text-gray-500">
          Wholesale: ${product.pricing.wholesalePrice}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {product.availableQuantity}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={getStockStatusBadge(product.stockStatus, product.availableQuantity)}>
          {getStatusText(product.stockStatus)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
        <button className="text-red-600 hover:text-red-900">Delete</button>
      </td>
    </tr>
  )
}

// Categories Tab Component
export function CategoriesTab({ categories, onRefresh }: { categories: any[], onRefresh: () => void }) {
  const [showAddCategory, setShowAddCategory] = useState(false)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Categories Management</h2>
        <button
          onClick={() => setShowAddCategory(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category.name} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">{category.icon || '📂'}</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{category.name}</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>{category.productCount} products</p>
                <p>Avg Price: ${category.avgPrice}</p>
                <p>Total Inventory: {category.totalInventory}</p>
              </div>
              <div className="mt-4 flex justify-center space-x-2">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Edit
                </button>
                <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddCategory && (
        <AddCategoryModal
          onClose={() => setShowAddCategory(false)}
          onSuccess={() => {
            setShowAddCategory(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

// Analytics Tab Component
export function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(false)

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/admin/analytics?period=${period}`)
      setAnalytics(response.data.analytics)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [period])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Product Trend Chart */}
          {analytics?.productTrend && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Creation Trend</h3>
              <div className="h-64 flex items-end space-x-2">
                {analytics.productTrend.map((item: any, index: number) => (
                  <div key={index} className="flex-1 bg-blue-200 rounded-t" style={{
                    height: `${(item.count / Math.max(...analytics.productTrend.map((i: any) => i.count))) * 100}%`
                  }}>
                    <div className="text-xs text-center p-1">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Distribution */}
          {analytics?.categoryDistribution && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Category Distribution</h3>
              <div className="space-y-3">
                {analytics.categoryDistribution.map((item: any) => (
                  <div key={item._id} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{item._id}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{item.count} products</span>
                      <span className="text-sm text-gray-600">${item.totalValue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
// Add Product Modal Component
function AddProductModal({ categories, onClose, onSuccess }: {
  categories: any[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    brand: '',
    sku: '',
    retailPrice: '',
    wholesalePrice: '',
    costPrice: '',
    currency: 'USD',
    quantity: '',
    lowStockThreshold: '10',
    tags: '',
    imageUrls: ['']
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        brand: formData.brand,
        sku: formData.sku || undefined,
        images: formData.imageUrls.filter(url => url.trim()).map(url => ({
          url: url.trim(),
          alt: formData.name,
          isPrimary: formData.imageUrls.indexOf(url) === 0
        })),
        pricing: {
          retailPrice: parseFloat(formData.retailPrice),
          wholesalePrice: parseFloat(formData.wholesalePrice),
          costPrice: parseFloat(formData.costPrice),
          currency: formData.currency
        },
        inventory: {
          quantity: parseInt(formData.quantity),
          reserved: 0,
          lowStockThreshold: parseInt(formData.lowStockThreshold),
          trackInventory: true
        },
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        specifications: {},
        isActive: true
      }

      await api.post('/products', productData)
      onSuccess()
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Failed to add product. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addImageUrl = () => {
    setFormData(prev => ({
      ...prev,
      imageUrls: [...prev.imageUrls, '']
    }))
  }

  const removeImageUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }))
  }

  const updateImageUrl = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.map((url, i) => i === index ? value : url)
    }))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add New Product</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Auto-generated if empty"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Retail Price *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.retailPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, retailPrice: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Wholesale Price *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.wholesalePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, wholesalePrice: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cost Price *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.costPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity *</label>
              <input
                type="number"
                required
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
              <input
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="Comma-separated tags"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Image URLs</label>
            {formData.imageUrls.map((url, index) => (
              <div key={index} className="flex mt-2 space-x-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateImageUrl(index, e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {formData.imageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageUrl(index)}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addImageUrl}
              className="mt-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Add Image
            </button>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add Category Modal Component
function AddCategoryModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // For now, we'll just simulate adding a category
      // In a real implementation, you'd call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      onSuccess()
    } catch (error) {
      console.error('Error adding category:', error)
      alert('Failed to add category. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add New Category</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter category name"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}