'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { ProductsTab, CategoriesTab, AnalyticsTab } from './components'

interface DashboardMetrics {
  totalProducts: number
  totalCategories: number
  lowStockProducts: number
  recentProducts: number
  inventoryValue: number
}

interface Product {
  _id: string
  name: string
  description: string
  category: string
  brand: string
  sku: string
  pricing: {
    retailPrice: number
    wholesalePrice: number
    currency: string
  }
  inventory: {
    quantity: number
    lowStockThreshold: number
  }
  images: Array<{
    url: string
    alt: string
    isPrimary: boolean
  }>
  isActive: boolean
  availableQuantity: number
  stockStatus: 'inStock' | 'lowStock' | 'outOfStock'
  primaryImage?: {
    url: string
    alt: string
  }
  createdAt: string
  updatedAt: string
}

interface User {
  email: string
  role: 'admin' | 'employee'
  firstName: string
  lastName: string
}

export default function ProfessionalAdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  
  // Dashboard data
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [stockFilter, setStockFilter] = useState('all')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('adminUser')
    
    if (token && savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setIsLoggedIn(true)
      loadDashboardData()
    } else {
      setLoading(false)
    }
  }
  const loadDashboardData = async () => {
    try {
      const [dashboardRes, productsRes, categoriesRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/products?page=1&limit=20'),
        api.get('/admin/categories')
      ])
      
      setMetrics(dashboardRes.data.metrics)
      setProducts(productsRes.data.data)
      setTotalPages(productsRes.data.pagination?.totalPages || 1)
      setCategories(categoriesRes.data.data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async (page = 1, search = '', category = '', stock = 'all') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(category && { category }),
        ...(stock !== 'all' && { stockStatus: stock })
      })
      
      const response = await api.get(`/admin/products?${params}`)
      setProducts(response.data.data)
      setCurrentPage(page)
      setTotalPages(response.data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const handleSearch = () => {
    loadProducts(1, searchTerm, selectedCategory, stockFilter)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('adminUser')
    setIsLoggedIn(false)
    setUser(null)
  }

  if (!isLoggedIn) {
    return <LoginForm onLogin={checkAuth} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src="/logo.png" alt="Al-Baik" className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Professional Management Panel</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {user?.role === 'admin' ? 'Administrator' : 'Staff Member'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: '📊' },
              { id: 'products', name: 'Products', icon: '📦' },
              { id: 'categories', name: 'Categories', icon: '📂' },
              { id: 'analytics', name: 'Analytics', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
            
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <MetricCard
                title="Total Products"
                value={metrics?.totalProducts || 0}
                icon="📦"
                color="blue"
              />
              <MetricCard
                title="Categories"
                value={metrics?.totalCategories || 0}
                icon="📂"
                color="green"
              />
              <MetricCard
                title="Low Stock"
                value={metrics?.lowStockProducts || 0}
                icon="⚠️"
                color="yellow"
              />
              <MetricCard
                title="Recent Products"
                value={metrics?.recentProducts || 0}
                icon="🆕"
                color="purple"
              />
              <MetricCard
                title="Inventory Value"
                value={`$${(metrics?.inventoryValue || 0).toLocaleString()}`}
                icon="💰"
                color="indigo"
              />
            </div>

            {/* Recent Products */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Products</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.slice(0, 6).map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            categories={categories}
            currentPage={currentPage}
            totalPages={totalPages}
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            stockFilter={stockFilter}
            onSearch={handleSearch}
            onPageChange={(page) => loadProducts(page, searchTerm, selectedCategory, stockFilter)}
            onSearchChange={setSearchTerm}
            onCategoryChange={setSelectedCategory}
            onStockFilterChange={setStockFilter}
          />
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <CategoriesTab categories={categories} onRefresh={loadDashboardData} />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}
      </div>
    </div>
  )
}
// Login Form Component
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { email, password })
      
      if (response.data.user && response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('adminUser', JSON.stringify(response.data.user))
        onLogin()
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img src="/logo.png" alt="Al-Baik" className="mx-auto h-16 w-16" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Admin Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Professional Management Access
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ title, value, icon, color }: {
  title: string
  value: string | number
  icon: string
  color: string
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  )
}

// Product Card Component
function ProductCard({ product }: { product: Product }) {
  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'inStock': return 'bg-green-100 text-green-800'
      case 'lowStock': return 'bg-yellow-100 text-yellow-800'
      case 'outOfStock': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          {product.primaryImage ? (
            <img
              src={product.primaryImage.url}
              alt={product.primaryImage.alt}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <span className="text-gray-400">📦</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{product.name}</h4>
          <p className="text-sm text-gray-500">{product.category}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-medium text-gray-900">
              ${product.pricing.retailPrice}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${getStockStatusColor(product.stockStatus)}`}>
              {product.availableQuantity} in stock
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}