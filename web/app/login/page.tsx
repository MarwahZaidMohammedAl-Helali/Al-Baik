'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLogin && password !== confirmPassword) {
      alert('كلمات المرور غير متطابقة')
      return
    }

    // Demo login logic
    if (isLogin) {
      // Login logic
      if (email === 'admin@store.com' && password === '123456') {
        alert('تم تسجيل الدخول كمدير')
        window.location.href = '/admin'
      } else if (email === 'staff@store.com' && password === '123456') {
        alert('تم تسجيل الدخول كموظف')
        window.location.href = '/admin'
      } else if (email === 'customer@store.com' && password === '123456') {
        alert('تم تسجيل الدخول كعميل')
        window.location.href = '/'
      } else {
        alert('بيانات الدخول غير صحيحة')
      }
    } else {
      // Signup logic
      alert('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول')
      setIsLogin(true)
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div style={{minHeight: '100vh', backgroundColor: 'var(--background-light)', direction: 'rtl'}}>
      {/* Header */}
      <header className="header">
        <div className="header-main">
          <div className="container">
            <Link href="/" className="logo">
              <div className="logo-icon">
                <img src="/logo.png" alt="Al-Baik Logo" />
              </div>
              Al-Baik
            </Link>
          </div>
        </div>
      </header>

      {/* Login/Signup Form */}
      <div style={{
        maxWidth: '400px',
        margin: '2rem auto',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px var(--shadow-medium)'
      }}>
        {/* Logo */}
        <div style={{textAlign: 'center', marginBottom: '2rem'}}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1rem',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: 'var(--primary-red-light)'
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
            color: 'var(--primary-red)',
            marginBottom: '0.5rem'
          }}>
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h1>
        </div>

        {/* Toggle Buttons */}
        <div style={{
          display: 'flex',
          marginBottom: '2rem',
          backgroundColor: 'var(--background-light)',
          borderRadius: '8px',
          padding: '4px'
        }}>
          <button
            onClick={() => setIsLogin(true)}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: isLogin ? 'var(--primary-red)' : 'transparent',
              color: isLogin ? 'white' : 'var(--text-medium)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => setIsLogin(false)}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: !isLogin ? 'var(--primary-red)' : 'transparent',
              color: !isLogin ? 'white' : 'var(--text-medium)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            إنشاء حساب
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{marginBottom: '1rem'}}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text-dark)'
              }}>
                الاسم الكامل
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid var(--border-light)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  textAlign: 'right'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-red)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                placeholder="أدخل اسمك الكامل"
              />
            </div>
          )}

          <div style={{marginBottom: '1rem'}}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: 'var(--text-dark)'
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
                border: '2px solid var(--border-light)',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s',
                textAlign: 'right'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-red)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
              placeholder="أدخل بريدك الإلكتروني"
            />
          </div>

          <div style={{marginBottom: '1rem'}}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: 'var(--text-dark)'
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
                border: '2px solid var(--border-light)',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s',
                textAlign: 'right'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-red)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
              placeholder="أدخل كلمة المرور"
            />
          </div>

          {!isLogin && (
            <div style={{marginBottom: '1rem'}}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text-dark)'
              }}>
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={!isLogin}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid var(--border-light)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  textAlign: 'right'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-red)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                placeholder="أعد إدخال كلمة المرور"
              />
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: 'var(--primary-red)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              marginBottom: '1rem'
            }}
            onMouseOver={(e) => {
              const target = e.target as HTMLElement
              target.style.backgroundColor = 'var(--primary-red-dark)'
            }}
            onMouseOut={(e) => {
              const target = e.target as HTMLElement
              target.style.backgroundColor = 'var(--primary-red)'
            }}
          >
            {isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'}
          </button>
        </form>

        {/* Demo Accounts */}
        {isLogin && (
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--background-light)',
            borderRadius: '8px',
            marginTop: '1rem'
          }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: 'var(--text-dark)'
            }}>
              حسابات تجريبية:
            </h4>
            <div style={{fontSize: '12px', color: 'var(--text-medium)', lineHeight: '1.5'}}>
              <div><strong>مدير:</strong> admin@store.com</div>
              <div><strong>موظف:</strong> staff@store.com</div>
              <div><strong>عميل:</strong> customer@store.com</div>
              <div style={{marginTop: '0.5rem'}}><strong>كلمة المرور:</strong> 123456</div>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div style={{textAlign: 'center', marginTop: '1.5rem'}}>
          <Link 
            href="/"
            style={{
              color: 'var(--primary-red)',
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