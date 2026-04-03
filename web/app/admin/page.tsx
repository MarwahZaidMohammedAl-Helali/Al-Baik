'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  nameAr: string
  description?: string
  descriptionAr?: string
  price: number
  currency: string
  sku?: string
  categoryId: string
  mainImage?: string
  images?: string[]
  videoUrl?: string
  specifications?: Record<string, any>
  inStock: boolean
  stockQuantity: number
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  tags?: string[]
  rating: number
  reviewCount: number
  salesCount: number
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
  nameAr: string
  description?: string
  descriptionAr?: string
  icon?: string
  color: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface User {
  email: string
  type: 'admin' | 'staff'
  name: string
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '📱'
  })
  
  // Product form state
  const [showProductForm, setShowProductForm] = useState(false)
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: '',
    brand: '',
    sku: '',
    retailPrice: '',
    wholesalePrice: '',
    currency: 'USD',
    quantity: '',
    tags: '',
    imageUrls: [''],
    videoUrls: [''],
    specifications: {} as Record<string, string>
  })

  // Business-relevant icons for categories
  const recommendedIcons = [
    '📱', '💻', '⚡', '🔌', '📺', '🎧', '⌚', '📷', '🖨️', '💡',
    '🔋', '🖱️', '⌨️', '💾', '📀', '🎮', '🔊', '📻', '📞', '🖥️'
  ]

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('adminUser')
    const savedToken = localStorage.getItem('token')
    
    if (savedUser && savedToken) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setIsLoggedIn(true)
      fetchData()
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      })
      
      if (response.data.user && response.data.token) {
        const userData = {
          email: response.data.user.email,
          type: response.data.user.role,
          name: `${response.data.user.firstName} ${response.data.user.lastName}`
        }
        
        // Store token and user data
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('adminUser', JSON.stringify(userData))
        
        setUser(userData)
        setIsLoggedIn(true)
        fetchData()
      }
    } catch (error) {
      console.error('Login error:', error)
      if (error.response?.data?.error) {
        alert(`خطأ في تسجيل الدخول: ${error.response.data.error}`)
      } else {
        alert('خطأ في تسجيل الدخول')
      }
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUser(null)
    localStorage.removeItem('adminUser')
    localStorage.removeItem('token')
    setEmail('')
    setPassword('')
  }

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ])
      
      setProducts(productsRes.data.products || [])
      setCategories(categoriesRes.data.categories || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('يرجى إدخال اسم القسم')
      return
    }

    try {
      const response = await api.post('/categories', {
        name: categoryForm.name,
        nameAr: categoryForm.name, // Using same name for Arabic
        icon: categoryForm.icon
      })
      
      if (response.data.category) {
        // Refresh categories
        const categoriesRes = await api.get('/categories')
        setCategories(categoriesRes.data.categories || [])
        
        // Reset form
        setCategoryForm({ name: '', icon: '📱' })
        setShowCategoryForm(false)
        alert('تم إضافة القسم بنجاح!')
      }
    } catch (error) {
      console.error('Error adding category:', error)
      if (error.response?.data?.error) {
        alert(`خطأ: ${error.response.data.error}`)
      } else {
        alert('خطأ في إضافة القسم')
      }
    }
  }
  const addProduct = async () => {
    if (!productForm.name.trim() || !productForm.category) {
      alert('يرجى إدخال اسم المنتج واختيار القسم')
      return
    }

    // Find the category ID from the selected category name
    const selectedCategory = categories.find(cat => cat.name === productForm.category || cat.nameAr === productForm.category)
    if (!selectedCategory) {
      alert('القسم المحدد غير موجود')
      return
    }

    const newProduct = {
      name: productForm.name,
      nameAr: productForm.name, // Using same name for Arabic
      description: productForm.description,
      descriptionAr: productForm.description, // Using same description for Arabic
      price: parseFloat(productForm.retailPrice) || 0,
      currency: productForm.currency,
      sku: productForm.sku || undefined,
      categoryId: selectedCategory.id,
      mainImage: productForm.imageUrls.find(url => url.trim()) || undefined,
      images: productForm.imageUrls.filter(url => url.trim()),
      videoUrl: productForm.videoUrls.find(url => url.trim()) || undefined,
      stockQuantity: parseInt(productForm.quantity) || 0,
      tags: productForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      specifications: productForm.specifications
    }

    try {
      const response = await api.post('/products', newProduct)
      
      if (response.data.product) {
        // Refresh data
        fetchData()
        
        // Reset form
        setProductForm({
          name: '',
          description: '',
          category: '',
          brand: '',
          sku: '',
          retailPrice: '',
          wholesalePrice: '',
          currency: 'JOD',
          quantity: '',
          tags: '',
          imageUrls: [''],
          videoUrls: [''],
          specifications: {}
        })
        setShowProductForm(false)
        alert('تم إضافة المنتج بنجاح!')
      }
    } catch (error) {
      console.error('Error adding product:', error)
      if (error.response?.data?.error) {
        alert(`خطأ: ${error.response.data.error}`)
      } else {
        alert('خطأ في إضافة المنتج')
      }
    }
  }
  // Login Form
  if (!isLoggedIn) {
    return (
      <div style={{minHeight: '100vh', backgroundColor: '#f8fafc', direction: 'rtl'}}>
        <div style={{
          maxWidth: '400px',
          margin: '3rem auto',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{textAlign: 'center', marginBottom: '2rem'}}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#fee2e2'
            }}>
              <img 
                src="/logo.png" 
                alt="Al-Baik" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  padding: '10px'
                }}
              />
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '0.5rem'
            }}>
              تسجيل دخول الإدارة
            </h1>
            <p style={{color: '#64748b', fontSize: '14px'}}>
              للمديرين والموظفين فقط
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{marginBottom: '1rem'}}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  textAlign: 'right'
                }}
                placeholder="أدخل بريدك الإلكتروني"
              />
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  textAlign: 'right'
                }}
                placeholder="أدخل كلمة المرور"
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            >
              تسجيل الدخول
            </button>
          </form>

          <div style={{textAlign: 'center', marginTop: '1.5rem'}}>
            <Link 
              href="/"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ← العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div style={{padding: '2rem', textAlign: 'center'}}>
        <div>جاري التحميل...</div>
      </div>
    )
  }
  // Admin Dashboard
  return (
    <div style={{minHeight: '100vh', backgroundColor: '#f8fafc', direction: 'rtl'}}>
      {/* Professional Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <img src="/logo.png" alt="Al-Baik" style={{width: '40px', height: '40px'}} />
            <div>
              <h1 style={{fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0}}>
                لوحة التحكم
              </h1>
              <p style={{fontSize: '14px', color: '#64748b', margin: 0}}>
                إدارة المتجر الإلكتروني
              </p>
            </div>
          </div>
          
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <div style={{textAlign: 'left'}}>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#1e293b'}}>
                {user?.name}
              </div>
              <div style={{fontSize: '12px', color: '#64748b'}}>
                {user?.type === 'admin' ? 'مدير النظام' : 'موظف'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      <div style={{maxWidth: '1200px', margin: '0 auto', padding: '2rem'}}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{fontSize: '14px', color: '#64748b', margin: 0}}>الأقسام</p>
                <p style={{fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '4px 0 0 0'}}>
                  {categories.length}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#dbeafe',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                📂
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{fontSize: '14px', color: '#64748b', margin: 0}}>المنتجات</p>
                <p style={{fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '4px 0 0 0'}}>
                  {products.length}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#dcfce7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                📦
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{fontSize: '14px', color: '#64748b', margin: 0}}>المنتجات النشطة</p>
                <p style={{fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '4px 0 0 0'}}>
                  {products.filter(p => p.inStock).length}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                ✅
              </div>
            </div>
          </div>
        </div>
        {/* Main Content */}
        {selectedCategory ? (
          // Category Products View
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <button
                  onClick={() => setSelectedCategory(null)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ← العودة
                </button>
                <div>
                  <h2 style={{fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0}}>
                    {categories.find(c => (c.nameAr || c.name) === selectedCategory)?.icon} {selectedCategory}
                  </h2>
                  <p style={{fontSize: '14px', color: '#64748b', margin: '4px 0 0 0'}}>
                    إدارة منتجات هذا القسم
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setProductForm({...productForm, category: selectedCategory})
                  setShowProductForm(true)
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>+</span>
                إضافة منتج جديد
              </button>
            </div>

            {/* Category Products */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {products.filter(p => {
                // Find category by name for filtering
                const category = categories.find(cat => cat.id === p.categoryId)
                return category && (category.name === selectedCategory || category.nameAr === selectedCategory)
              }).map(product => (
                <div key={product.id} style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden'
                }}>
                  {/* Product Image */}
                  <div style={{
                    height: '200px',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {product.mainImage ? (
                      <img 
                        src={product.mainImage} 
                        alt={product.nameAr || product.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                          if (nextElement) {
                            nextElement.style.display = 'flex'
                          }
                        }}
                      />
                    ) : null}
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: product.mainImage ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af',
                      fontSize: '48px'
                    }}>
                      📦
                    </div>
                  </div>

                  {/* Product Info */}
                  <div style={{padding: '1.5rem'}}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                      margin: '0 0 8px 0'
                    }}>
                      {product.nameAr || product.name}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#64748b',
                      margin: '0 0 12px 0',
                      lineHeight: '1.5'
                    }}>
                      {(product.descriptionAr || product.description || '').length > 100 ? 
                        (product.descriptionAr || product.description || '').substring(0, 100) + '...' : 
                        (product.descriptionAr || product.description || '')
                      }
                    </p>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#059669'
                      }}>
                        {product.price} {product.currency}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b',
                        backgroundColor: '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>
                        المخزون: {product.stockQuantity}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button
                        onClick={() => {
                          // For now, just show a message since we don't have top 10 feature in production API
                          alert('ميزة المنتجات المميزة ستكون متاحة قريباً')
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        إضافة للمميز
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Categories Overview
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem'
            }}>
              <div>
                <h2 style={{fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0}}>
                  أقسام المتجر
                </h2>
                <p style={{fontSize: '14px', color: '#64748b', margin: '4px 0 0 0'}}>
                  انقر على أي قسم لإدارة منتجاته
                </p>
              </div>
              <button
                onClick={() => setShowCategoryForm(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>+</span>
                إضافة قسم جديد
              </button>
            </div>

            {/* Categories Grid */}
            {categories.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: '4rem 2rem',
                borderRadius: '12px',
                textAlign: 'center',
                border: '2px dashed #d1d5db'
              }}>
                <div style={{fontSize: '64px', marginBottom: '1rem'}}>📂</div>
                <h3 style={{fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0'}}>
                  لا توجد أقسام
                </h3>
                <p style={{fontSize: '14px', color: '#64748b', margin: '0 0 24px 0'}}>
                  ابدأ بإضافة أقسام لتنظيم منتجاتك
                </p>
                <button
                  onClick={() => setShowCategoryForm(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  إضافة قسم جديد
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem'
              }}>
                {categories.map(category => (
                  <div
                    key={category.id}
                    onClick={() => setSelectedCategory(category.nameAr || category.name)}
                    style={{
                      backgroundColor: 'white',
                      padding: '2rem',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{fontSize: '48px', marginBottom: '1rem'}}>
                      {category.icon || '📦'}
                    </div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                      margin: '0 0 8px 0'
                    }}>
                      {category.nameAr || category.name}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#64748b',
                      margin: 0
                    }}>
                      {products.filter(p => p.categoryId === category.id).length} منتج
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h3 style={{fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0}}>
                إضافة قسم جديد
              </h3>
              <button
                onClick={() => setShowCategoryForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                اسم القسم *
              </label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  textAlign: 'right'
                }}
                placeholder="مثال: الهواتف الذكية"
              />
            </div>

            <div style={{marginBottom: '2rem'}}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                أيقونة القسم
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: '8px',
                marginBottom: '1rem'
              }}>
                {recommendedIcons.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setCategoryForm({...categoryForm, icon})}
                    style={{
                      padding: '12px',
                      border: categoryForm.icon === icon ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      backgroundColor: categoryForm.icon === icon ? '#dbeafe' : 'white',
                      cursor: 'pointer',
                      fontSize: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  textAlign: 'center'
                }}
                placeholder="أو أدخل أيقونة مخصصة"
              />
            </div>

            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
              <button
                onClick={() => setShowCategoryForm(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={addCategory}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                إضافة القسم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h3 style={{fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0}}>
                إضافة منتج جديد
              </h3>
              <button
                onClick={() => setShowProductForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            <div style={{display: 'grid', gap: '1.5rem'}}>
              {/* Product Name */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  اسم المنتج *
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    textAlign: 'right'
                  }}
                  placeholder="مثال: iPhone 15 Pro Max"
                />
              </div>

              {/* Category */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  القسم *
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    textAlign: 'right'
                  }}
                >
                  <option value="">اختر القسم</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.nameAr || category.name}>
                      {category.nameAr || category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  الوصف
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    textAlign: 'right',
                    resize: 'vertical'
                  }}
                  placeholder="وصف المنتج..."
                />
              </div>

              {/* Brand and SKU */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    العلامة التجارية
                  </label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({...productForm, brand: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      textAlign: 'right'
                    }}
                    placeholder="مثال: Apple"
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    رمز المنتج (SKU)
                  </label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      textAlign: 'right'
                    }}
                    placeholder="سيتم إنشاؤه تلقائياً"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '1rem'}}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    سعر التجزئة *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.retailPrice}
                    onChange={(e) => setProductForm({...productForm, retailPrice: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      textAlign: 'right'
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    سعر الجملة
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.wholesalePrice}
                    onChange={(e) => setProductForm({...productForm, wholesalePrice: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      textAlign: 'right'
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    العملة
                  </label>
                  <select
                    value={productForm.currency}
                    onChange={(e) => setProductForm({...productForm, currency: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  >
                    <option value="USD">USD</option>
                    <option value="JOD">JOD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  الكمية المتوفرة *
                </label>
                <input
                  type="number"
                  value={productForm.quantity}
                  onChange={(e) => setProductForm({...productForm, quantity: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    textAlign: 'right'
                  }}
                  placeholder="0"
                />
              </div>

              {/* Tags */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  الكلمات المفتاحية
                </label>
                <input
                  type="text"
                  value={productForm.tags}
                  onChange={(e) => setProductForm({...productForm, tags: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    textAlign: 'right'
                  }}
                  placeholder="مثال: هاتف, ذكي, آيفون (مفصولة بفواصل)"
                />
              </div>

              {/* Image URLs */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  روابط الصور
                </label>
                {productForm.imageUrls.map((url, index) => (
                  <div key={index} style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...productForm.imageUrls]
                        newUrls[index] = e.target.value
                        setProductForm({...productForm, imageUrls: newUrls})
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        textAlign: 'right'
                      }}
                      placeholder="https://example.com/image.jpg"
                    />
                    {productForm.imageUrls.length > 1 && (
                      <button
                        onClick={() => {
                          const newUrls = productForm.imageUrls.filter((_, i) => i !== index)
                          setProductForm({...productForm, imageUrls: newUrls})
                        }}
                        style={{
                          padding: '12px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setProductForm({...productForm, imageUrls: [...productForm.imageUrls, '']})}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  + إضافة صورة
                </button>
              </div>
            </div>

            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '2rem'}}>
              <button
                onClick={() => setShowProductForm(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={addProduct}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                إضافة المنتج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}