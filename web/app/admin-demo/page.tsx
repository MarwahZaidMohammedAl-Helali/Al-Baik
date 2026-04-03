'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { 
  PlusIcon, 
  TagIcon,
  ChartBarIcon,
  CubeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface Product {
  _id: string
  name: string
  description: string
  category: string
  brand: string
  sku: string
  images: Array<{
    url: string
    alt: string
    isPrimary: boolean
  }>
  pricing: {
    retailPrice: number
    wholesalePrice: number
    currency: string
  }
  inventory: {
    quantity: number
    reserved: number
  }
  availableQuantity?: number
  isActive: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface Category {
  name: string
  count: number
}

export default function AdminDemoPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [demoMode, setDemoMode] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, modeRes] = await Promise.all([
        api.get('/products?limit=50'),
        api.get('/products/categories'),
        api.get('/admin/mode')
      ])
      
      setProducts(productsRes.data.data || [])
      setCategories(categoriesRes.data.data || [])
      setDemoMode(modeRes.data.demoMode)
    } catch (error) {
      console.error('Error fetching data:', error)
      // Set empty arrays as fallback
      setProducts([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const toggleDemoMode = async () => {
    try {
      const response = await api.post('/admin/toggle-demo')
      setDemoMode(response.data.demoMode)
      // Refresh data after mode change
      fetchData()
    } catch (error) {
      console.error('Error toggling demo mode:', error)
    }
  }

  const getProductImage = (product: Product) => {
    const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0]
    return primaryImage?.url || null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-red-600 font-semibold">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-red-600 flex items-center">
                <div className="bg-red-500 text-white rounded-lg p-2 ml-2">
                  <TagIcon className="h-6 w-6" />
                </div>
                Al-Baik Admin Demo
              </Link>
            </div>
            
            <div className="flex items-center space-x-4 space-x-reverse">
              <Link href="/" className="text-gray-600 hover:text-red-600 transition-colors">
                العودة للمتجر
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Toggle */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">وضع النظام</h2>
              <p className="text-gray-600">
                {demoMode 
                  ? 'وضع العرض التوضيحي - يعرض بيانات تجريبية' 
                  : 'وضع الإنتاج - يعرض البيانات الحقيقية'}
              </p>
            </div>
            <button
              onClick={toggleDemoMode}
              className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                demoMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              <ArrowPathIcon className="h-5 w-5 ml-2" />
              {demoMode ? 'تبديل للوضع الحقيقي' : 'تبديل للوضع التجريبي'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-blue-500 text-white rounded-lg p-3">
                <CubeIcon className="h-6 w-6" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">إجمالي المنتجات</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-green-500 text-white rounded-lg p-3">
                <ChartBarIcon className="h-6 w-6" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">الأقسام</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-purple-500 text-white rounded-lg p-3">
                <TagIcon className="h-6 w-6" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">المنتجات المتوفرة</p>
                <p className="text-2xl font-bold text-gray-900">
                  {products.filter(p => (p.availableQuantity || p.inventory?.quantity || 0) > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Explanation */}
        <div className={`rounded-xl p-6 mb-8 ${
          demoMode 
            ? 'bg-blue-50 border border-blue-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          <h3 className={`text-lg font-bold mb-2 ${
            demoMode ? 'text-blue-900' : 'text-green-900'
          }`}>
            {demoMode ? '🎭 وضع العرض التوضيحي' : '🏭 وضع الإنتاج'}
          </h3>
          <p className={`${demoMode ? 'text-blue-800' : 'text-green-800'}`}>
            {demoMode 
              ? 'يتم عرض 6 منتجات تجريبية و 4 أقسام للاختبار. هذه البيانات ثابتة ولا يمكن تعديلها.'
              : 'يتم عرض البيانات الحقيقية فقط. ابدأ بإضافة منتجات لرؤيتها في التطبيق.'}
          </p>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">المنتجات</h2>
            {!demoMode && (
              <button className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center">
                <PlusIcon className="h-5 w-5 ml-2" />
                إضافة منتج جديد
              </button>
            )}
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <CubeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات</h3>
              <p className="text-gray-600 mb-4">
                {demoMode 
                  ? 'قم بالتبديل للوضع التجريبي لرؤية منتجات العرض'
                  : 'ابدأ بإضافة منتجات لرؤيتها هنا'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 relative overflow-hidden">
                    {getProductImage(product) ? (
                      <img
                        src={getProductImage(product)!}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <TagIcon className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-red-600 font-bold">
                      ${product.pricing?.retailPrice || 0}
                    </span>
                    <span className="text-sm text-gray-500">
                      المخزون: {product.inventory?.quantity || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Categories Section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">الأقسام</h2>
          
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أقسام</h3>
              <p className="text-gray-600">
                {demoMode 
                  ? 'قم بالتبديل للوضع التجريبي لرؤية أقسام العرض'
                  : 'ابدأ بإضافة أقسام لتنظيم منتجاتك'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category, index) => (
                <div key={category.name} className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">
                    {index === 0 ? '📱' : index === 1 ? '💻' : index === 2 ? '🎧' : '⌚'}
                  </div>
                  <h3 className="font-bold">{category.name}</h3>
                  <p className="text-sm text-red-100">{category.count} منتج</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}