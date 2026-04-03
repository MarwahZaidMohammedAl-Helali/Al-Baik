'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCartIcon, TagIcon } from '@heroicons/react/24/outline'

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

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Hide splash screen after 3 seconds
    const splashTimer = setTimeout(() => {
      setShowSplash(false)
    }, 3000)

    fetchData()

    return () => clearTimeout(splashTimer)
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products?limit=12'),
        api.get('/categories')
      ])
      
      setProducts(productsRes.data.products || [])
      setCategories(categoriesRes.data.categories || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setProducts([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`
    }
  }

  const getProductImage = (product: Product) => {
    return product.mainImage || null
  }

  const getProductPrice = (product: Product) => {
    return product.price || 0
  }

  const getCurrency = (product: Product) => {
    return product.currency || 'JOD'
  }

  const isProductInStock = (product: Product) => {
    return product.inStock && product.stockQuantity > 0
  }

  // Splash Screen Component
  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-logo">
            <img src="/logo.png" alt="Al-Baik Logo" />
          </div>
          <div className="splash-title">Al-Baik</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="text-center">
          <div className="spinner"></div>
          <p style={{color: 'var(--primary-red)', fontWeight: '600'}}>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight: '100vh', backgroundColor: 'var(--background-light)'}}>
      {/* Header - Exactly like mobile app */}
      <header className="header">
        <div className="header-main">
          <div className="container">
            <Link href="/" className="logo">
              <div className="logo-icon">
                <img src="/logo.png" alt="Al-Baik Logo" />
              </div>
              Al-Baik
            </Link>
            
            <div className="search-container">
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="ابحث عن المنتجات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-btn">
                  بحث
                </button>
              </form>
            </div>

            <div className="header-actions">
              <Link href="/cart" className="cart-link">
                <ShoppingCartIcon style={{width: '24px', height: '24px'}} />
                <span className="cart-badge">0</span>
              </Link>
              <Link href="/login" className="login-btn">
                تسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Categories Section - Only show if categories exist */}
      {categories.length > 0 && (
        <section className="categories-section">
          <div className="container">
            <div className="categories-grid">
              {categories.map((category, index) => (
                <div key={category.id} className={`category-item ${index === 0 ? 'active' : ''}`}>
                  <div className="category-icon">
                    {category.icon || '📦'}
                  </div>
                  <div className="category-name">{category.nameAr || category.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Section - Only show if products exist */}
      {products.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">
                المنتجات المميزة - كهربائيات
              </h2>
            </div>
            
            <div className="product-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <Link href={`/products/${product.id}`}>
                    <div className="product-image-container">
                      {getProductImage(product) ? (
                        <Image
                          src={getProductImage(product)!}
                          alt={product.nameAr || product.name}
                          fill
                          className="product-image"
                          style={{objectFit: 'cover'}}
                        />
                      ) : (
                        <div className="flex-center" style={{height: '100%', color: 'var(--text-light)'}}>
                          <TagIcon style={{width: '48px', height: '48px'}} />
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="product-info">
                    <Link href={`/products/${product.id}`}>
                      <h3 className="product-title">{product.nameAr || product.name}</h3>
                    </Link>
                    
                    <div className="product-price">
                      {getProductPrice(product)} {getCurrency(product)}
                    </div>
                    
                    <button 
                      className="add-to-cart-btn"
                      disabled={!isProductInStock(product)}
                    >
                      {isProductInStock(product) ? 'إضافة للسلة' : 'غير متوفر'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State - Show when no products */}
      {products.length === 0 && (
        <section className="section">
          <div className="container">
            <div style={{textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px var(--shadow-light)'}}>
              <div style={{fontSize: '4rem', marginBottom: '1rem'}}>📦</div>
              <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-dark)', marginBottom: '0.5rem'}}>
                لا توجد منتجات حالياً
              </h2>
              <p style={{color: 'var(--text-medium)', marginBottom: '1.5rem'}}>
                يرجى انتظار إضافة المنتجات من قبل الإدارة
              </p>
              <Link 
                href="/login" 
                style={{
                  display: 'inline-block',
                  background: 'var(--primary-red)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}
              >
                تسجيل الدخول كإدارة
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer - Simple like mobile app */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '16px'}}>
                <div style={{width: '32px', height: '32px', marginLeft: '12px', borderRadius: '8px', overflow: 'hidden'}}>
                  <img src="/logo.png" alt="Al-Baik" style={{width: '100%', height: '100%', objectFit: 'contain', background: 'white', padding: '4px', borderRadius: '8px'}} />
                </div>
                <h3 style={{fontSize: '20px', fontWeight: 'bold'}}>Al-Baik</h3>
              </div>
              <p style={{color: '#ccc', marginBottom: '16px', lineHeight: '1.6'}}>
                متجرك الموثوق للأجهزة الكهربائية والمنزلية عالية الجودة
              </p>
            </div>
            
            <div className="footer-section">
              <h4>روابط سريعة</h4>
              <ul>
                <li><Link href="/products">المنتجات</Link></li>
                <li><Link href="/categories">الأقسام</Link></li>
                <li><Link href="/about">من نحن</Link></li>
                <li><Link href="/contact">اتصل بنا</Link></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>خدمة العملاء</h4>
              <ul>
                <li><Link href="/support">الدعم الفني</Link></li>
                <li><Link href="/shipping">الشحن والتوصيل</Link></li>
                <li><Link href="/returns">الإرجاع والاستبدال</Link></li>
                <li><Link href="/warranty">الضمان</Link></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>تواصل معنا</h4>
              <div style={{color: '#ccc'}}>
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '8px'}}>
                  <span style={{color: 'var(--primary-red)', marginLeft: '8px', fontSize: '16px'}}>📞</span>
                  <span>+962 6 123 4567</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '8px'}}>
                  <span style={{color: 'var(--primary-red)', marginLeft: '8px', fontSize: '16px'}}>📧</span>
                  <span>info@al-baik.com</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <span style={{color: 'var(--primary-red)', marginLeft: '8px', fontSize: '16px'}}>📍</span>
                  <span>عمان، الأردن</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2024 Al-Baik. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}