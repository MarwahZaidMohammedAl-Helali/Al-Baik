export default function TestStyles() {
  return (
    <div style={{minHeight: '100vh', background: 'var(--background-light)', padding: '2rem'}}>
      <div className="container">
        <h1 style={{textAlign: 'center', marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-dark)'}}>
          تصميم Al-Baik - اختبار الأنماط
        </h1>
        
        {/* Color Palette */}
        <div style={{background: 'white', borderRadius: '8px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px var(--shadow-light)'}}>
          <h2 style={{marginBottom: '1rem', color: 'var(--text-dark)'}}>لوحة الألوان</h2>
          <div className="grid-5">
            <div style={{textAlign: 'center'}}>
              <div style={{width: '100%', height: '80px', background: 'var(--primary-red)', borderRadius: '8px', marginBottom: '8px'}}></div>
              <p style={{fontSize: '12px'}}>Primary Red</p>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{width: '100%', height: '80px', background: 'var(--secondary-orange)', borderRadius: '8px', marginBottom: '8px'}}></div>
              <p style={{fontSize: '12px'}}>Secondary Orange</p>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{width: '100%', height: '80px', background: 'var(--accent-yellow)', borderRadius: '8px', marginBottom: '8px'}}></div>
              <p style={{fontSize: '12px'}}>Accent Yellow</p>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{width: '100%', height: '80px', background: 'var(--success-green)', borderRadius: '8px', marginBottom: '8px'}}></div>
              <p style={{fontSize: '12px'}}>Success Green</p>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{width: '100%', height: '80px', background: 'var(--text-dark)', borderRadius: '8px', marginBottom: '8px'}}></div>
              <p style={{fontSize: '12px'}}>Text Dark</p>
            </div>
          </div>
        </div>

        {/* Product Cards Demo */}
        <div style={{background: 'white', borderRadius: '8px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px var(--shadow-light)'}}>
          <h2 style={{marginBottom: '1rem', color: 'var(--text-dark)'}}>بطاقات المنتجات</h2>
          <div className="product-grid">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="product-card">
                <div className="product-image-container">
                  <div style={{width: '100%', height: '100%', background: 'var(--background-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)'}}>
                    <span style={{fontSize: '48px'}}>📱</span>
                  </div>
                  <div className="product-badge">-{20 + i * 5}%</div>
                </div>
                <div className="product-info">
                  <h3 className="product-title">منتج تجريبي رقم {i}</h3>
                  <div className="product-price">{99 + i * 50}.99 د.أ</div>
                  <div className="product-meta">
                    <div className="product-rating">
                      <div className="star-rating">
                        {Array.from({length: 5}, (_, j) => (
                          <div key={j} className={`star ${j < 4 ? '' : 'empty'}`}>⭐</div>
                        ))}
                      </div>
                      <span style={{marginRight: '4px', fontSize: '10px'}}>4.{i}</span>
                    </div>
                    <div className="product-sold">تم البيع {50 + i * 20}</div>
                  </div>
                  <button className="add-to-cart-btn">إضافة للسلة</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Demo */}
        <div style={{background: 'white', borderRadius: '8px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px var(--shadow-light)'}}>
          <h2 style={{marginBottom: '1rem', color: 'var(--text-dark)'}}>الأقسام</h2>
          <div className="categories-grid">
            {[
              {icon: '📱', name: 'كهربائيات', active: true},
              {icon: '🎧', name: 'إكسسوارات الهواتف'},
              {icon: '💻', name: 'إكسسوارات اللابتوب'},
              {icon: '🏠', name: 'أدوات منزلية'},
              {icon: '🎮', name: 'العاب'},
              {icon: '🔌', name: 'الكابلات والشواحن'},
              {icon: '📱', name: 'الأكفار والحافظات'},
              {icon: '⌚', name: 'ساعات ذكية'}
            ].map((cat, i) => (
              <div key={i} className={`category-item ${cat.active ? 'active' : ''}`}>
                <div className="category-icon">{cat.icon}</div>
                <div className="category-name">{cat.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons Demo */}
        <div style={{background: 'white', borderRadius: '8px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px var(--shadow-light)'}}>
          <h2 style={{marginBottom: '1rem', color: 'var(--text-dark)'}}>الأزرار</h2>
          <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
            <button style={{background: 'var(--primary-red)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer'}}>
              زر أساسي
            </button>
            <button style={{background: 'var(--secondary-orange)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer'}}>
              زر ثانوي
            </button>
            <button style={{background: 'white', color: 'var(--primary-red)', border: '2px solid var(--primary-red)', padding: '10px 24px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer'}}>
              زر مخطط
            </button>
            <button style={{background: 'var(--text-light)', color: 'var(--text-medium)', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: '600', cursor: 'not-allowed'}} disabled>
              زر معطل
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <a href="/" style={{color: 'var(--primary-red)', textDecoration: 'underline', fontWeight: '500'}}>
            ← العودة للصفحة الرئيسية
          </a>
        </div>
      </div>
    </div>
  )
}