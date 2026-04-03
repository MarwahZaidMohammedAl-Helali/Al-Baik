const API_BASE = 'https://al-baik-api.albaik-ecommerce-api.workers.dev/api';
let currentUser = null;
let authToken = null;
let allProducts = [];
let allCategories = [];
let topProductsByCategory = {};

// Load data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadProducts();
    
    // Check if user is logged in
    authToken = localStorage.getItem('authToken');
    if (authToken) {
        getCurrentUser();
    }
    
    // Add event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });

    // Modal controls
    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('loginModal').classList.add('hidden');
    });

    // Admin panel
    document.getElementById('adminBtn').addEventListener('click', function() {
        document.getElementById('adminPanel').classList.remove('hidden');
        loadAdminData();
    });

    document.getElementById('closeAdmin').addEventListener('click', function() {
        document.getElementById('adminPanel').classList.add('hidden');
    });

    // Add product form
    document.getElementById('addProductForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addProduct();
    });

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function(e) {
        const searchTerm = e.target.value;
        if (searchTerm.length > 2) {
            searchProducts(searchTerm);
        } else if (searchTerm.length === 0) {
            displayProducts(allProducts);
        }
    });

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            filterProducts(filter);
        });
    });
}

// API Functions
async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

async function getCurrentUser() {
    try {
        const data = await apiCall('/auth/me');
        currentUser = data.user;
        updateUI();
    } catch (error) {
        localStorage.removeItem('authToken');
        authToken = null;
    }
}

async function loadCategories() {
    try {
        const data = await apiCall('/categories');
        allCategories = data.categories;
        displayCategories(allCategories);
        populateCategorySelect();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadProducts() {
    try {
        const data = await apiCall('/products?limit=100');
        allProducts = data.products;
        displayProducts(allProducts);
        organizeTopProducts();
        displayTopProductsSections();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function organizeTopProducts() {
    // Group products by category and get top 10 for each
    topProductsByCategory = {};
    
    allCategories.forEach(category => {
        const categoryProducts = allProducts
            .filter(p => p.categoryId === category.id)
            .sort((a, b) => (b.rating * b.salesCount) - (a.rating * a.salesCount))
            .slice(0, 10);
        
        if (categoryProducts.length > 0) {
            topProductsByCategory[category.id] = {
                category: category,
                products: categoryProducts
            };
        }
    });
}

function displayTopProductsSections() {
    const container = document.getElementById('topProductsContainer');
    container.innerHTML = '';
    
    Object.values(topProductsByCategory).forEach(({ category, products }) => {
        if (products.length === 0) return;
        
        const sectionHTML = `
            <section class="py-20 bg-white border-t border-gray-100">
                <div class="container mx-auto px-4">
                    <div class="text-center mb-16">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" 
                             style="background-color: ${category.color}20;">
                            <span class="text-2xl">${category.icon || '📱'}</span>
                        </div>
                        <h2 class="text-4xl font-bold mb-4">أفضل 10 منتجات - ${category.nameAr}</h2>
                        <p class="text-gray-600 text-lg">اكتشف أفضل المنتجات في قسم ${category.nameAr}</p>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        ${products.map((product, index) => createProductCard(product, index + 1)).join('')}
                    </div>
                </div>
            </section>
        `;
        
        container.innerHTML += sectionHTML;
    });
}

function createProductCard(product, rank = null) {
    return `
        <div class="product-card card-hover bg-white rounded-xl shadow-lg overflow-hidden relative">
            ${rank ? `<div class="absolute top-2 left-2 bg-accent text-gray-900 text-xs font-bold px-2 py-1 rounded-full z-10">#${rank}</div>` : ''}
            
            <div class="aspect-square bg-gray-100 relative overflow-hidden">
                <img src="${product.mainImage}" alt="${product.nameAr}" 
                     class="w-full h-full object-cover transition-transform duration-300 hover:scale-110" 
                     onerror="this.src='https://via.placeholder.com/400x400/D32F2F/FFFFFF?text=${encodeURIComponent(product.nameAr)}'">
                
                ${product.videoUrl ? `
                    <div class="absolute top-2 right-2 bg-black bg-opacity-70 rounded-full p-2">
                        <i class="fas fa-play text-white text-xs"></i>
                    </div>
                ` : ''}
                
                <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                    <button class="bg-white text-primary px-4 py-2 rounded-full font-bold transform scale-90 hover:scale-100 transition-transform">
                        <i class="fas fa-eye ml-1"></i>
                        عرض سريع
                    </button>
                </div>
            </div>
            
            <div class="p-4">
                <h3 class="font-bold text-gray-900 mb-2 line-clamp-2 hover:text-primary transition-colors cursor-pointer">
                    ${product.nameAr}
                </h3>
                
                <div class="flex items-center mb-3">
                    <div class="flex items-center ml-2">
                        ${Array.from({length: 5}, (_, i) => `
                            <i class="fas fa-star text-xs ${i < Math.floor(product.rating) ? 'text-accent' : 'text-gray-300'}"></i>
                        `).join('')}
                    </div>
                    <span class="text-sm text-gray-600">${product.rating}</span>
                    <span class="text-sm text-gray-400 mr-1">(${product.reviewCount})</span>
                </div>
                
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <span class="text-lg font-bold text-primary">${product.price} ${product.currency}</span>
                        <div class="text-xs text-gray-500">تم البيع ${product.salesCount}+</div>
                    </div>
                    <button class="text-gray-400 hover:text-red-500 transition-colors">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                
                <button onclick="addToCart('${product.id}')" 
                        class="w-full py-3 px-4 rounded-lg font-bold transition-all duration-300 ${
                            product.inStock 
                                ? 'bg-primary text-white hover:bg-red-700 hover:shadow-lg transform hover:-translate-y-1' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }" ${!product.inStock ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart ml-2"></i>
                    ${product.inStock ? 'إضافة للسلة' : 'غير متوفر'}
                </button>
            </div>
        </div>
    `;
}

function displayCategories(categories) {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = categories.map(category => `
        <div class="card-hover bg-white rounded-xl p-6 text-center shadow-lg cursor-pointer group">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-white text-2xl transition-transform group-hover:scale-110" 
                 style="background: linear-gradient(135deg, ${category.color}, ${category.color}dd);">
                ${category.icon || '📱'}
            </div>
            <h3 class="font-bold group-hover:text-primary transition-colors">${category.nameAr}</h3>
            <p class="text-sm text-gray-500 mt-1">${category.description || ''}</p>
        </div>
    `).join('');
}

function displayProducts(products) {
    const container = document.getElementById('productsContainer');
    container.innerHTML = products.map(product => createProductCard(product)).join('');
}

function updateUI() {
    const loginBtn = document.getElementById('loginBtn');
    const adminBtn = document.getElementById('adminBtn');
    
    if (currentUser) {
        loginBtn.innerHTML = `
            <i class="fas fa-user ml-1"></i>
            مرحباً، ${currentUser.firstName}
        `;
        loginBtn.onclick = logout;
        
        if (currentUser.role === 'admin') {
            adminBtn.classList.remove('hidden');
        }
    } else {
        loginBtn.innerHTML = `
            <i class="fas fa-user ml-1"></i>
            تسجيل الدخول
        `;
        loginBtn.onclick = () => document.getElementById('loginModal').classList.remove('hidden');
        adminBtn.classList.add('hidden');
    }
}

async function login(email, password) {
    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        
        document.getElementById('loginModal').classList.add('hidden');
        updateUI();
        
        showNotification('تم تسجيل الدخول بنجاح!', 'success');
    } catch (error) {
        showNotification('خطأ في تسجيل الدخول. تحقق من البيانات.', 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    updateUI();
    document.getElementById('adminPanel').classList.add('hidden');
    showNotification('تم تسجيل الخروج بنجاح!', 'success');
}

async function loadAdminData() {
    try {
        const data = await apiCall('/products?limit=100');
        displayAdminStats(data.products);
        displayAdminProducts(data.products);
        displayTopProductsManagement();
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

function displayAdminStats(products) {
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('inStockProducts').textContent = products.filter(p => p.inStock).length;
    document.getElementById('outOfStockProducts').textContent = products.filter(p => !p.inStock).length;
    document.getElementById('totalInventory').textContent = products.reduce((sum, p) => sum + p.stockQuantity, 0);
}

function displayTopProductsManagement() {
    const container = document.getElementById('topProductsManagement');
    
    const managementHTML = Object.values(topProductsByCategory).map(({ category, products }) => `
        <div class="border border-gray-200 rounded-lg p-4 mb-4">
            <h3 class="font-bold mb-2 flex items-center">
                <span class="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm mr-2" 
                      style="background-color: ${category.color};">
                    ${category.icon || '📱'}
                </span>
                ${category.nameAr} (${products.length}/10 منتجات)
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                ${products.map((product, index) => `
                    <div class="flex items-center p-2 bg-gray-50 rounded text-sm">
                        <span class="bg-accent text-gray-900 text-xs px-2 py-1 rounded-full mr-2">#${index + 1}</span>
                        <span class="flex-1 truncate">${product.nameAr}</span>
                        <button onclick="removeFromTopProducts('${product.id}', '${category.id}')" 
                                class="text-red-500 hover:text-red-700 text-xs">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = managementHTML || '<p class="text-gray-500">لا توجد منتجات مميزة حالياً</p>';
}

function populateCategorySelect() {
    const select = document.getElementById('productCategory');
    select.innerHTML = '<option value="">اختر القسم</option>' + 
        allCategories.map(cat => `<option value="${cat.id}">${cat.nameAr}</option>`).join('');
}

async function addProduct() {
    try {
        const productData = {
            name: document.getElementById('productName').value,
            nameAr: document.getElementById('productNameAr').value,
            description: document.getElementById('productDescription').value,
            descriptionAr: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            currency: 'د.أ',
            categoryId: document.getElementById('productCategory').value,
            mainImage: 'https://via.placeholder.com/400x400/D32F2F/FFFFFF?text=' + encodeURIComponent(document.getElementById('productNameAr').value),
            images: [],
            inStock: true,
            stockQuantity: parseInt(document.getElementById('productStock').value),
            rating: 4.5,
            reviewCount: 0,
            salesCount: 0,
            isTopProduct: document.getElementById('isTopProduct').checked
        };
        
        await apiCall('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
        
        showNotification('تم إضافة المنتج بنجاح!', 'success');
        loadProducts();
        loadAdminData();
        document.getElementById('addProductForm').reset();
    } catch (error) {
        showNotification('خطأ في إضافة المنتج.', 'error');
    }
}

function displayAdminProducts(products) {
    const container = document.getElementById('adminProductsList');
    container.innerHTML = products.map(product => `
        <div class="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div class="flex items-center">
                <img src="${product.mainImage}" alt="${product.nameAr}" 
                     class="w-16 h-16 rounded-lg object-cover mr-4 shadow-sm"
                     onerror="this.src='https://via.placeholder.com/64x64/D32F2F/FFFFFF?text=📦'">
                <div>
                    <div class="font-bold text-gray-900">${product.nameAr}</div>
                    <div class="text-sm text-gray-500">${product.name}</div>
                    <div class="text-sm font-bold text-primary">${product.price} ${product.currency}</div>
                </div>
            </div>
            <div class="flex items-center space-x-4 space-x-reverse">
                <div class="text-center">
                    <div class="text-sm text-gray-500">المخزون</div>
                    <div class="font-bold">${product.stockQuantity}</div>
                </div>
                <span class="px-3 py-1 text-xs font-bold rounded-full ${
                    product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${product.inStock ? 'متوفر' : 'غير متوفر'}
                </span>
                <div class="flex space-x-2 space-x-reverse">
                    <button onclick="editProduct('${product.id}')" 
                            class="text-blue-600 hover:text-blue-800 px-2 py-1 rounded transition-colors">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProduct('${product.id}')" 
                            class="text-red-600 hover:text-red-800 px-2 py-1 rounded transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    try {
        await apiCall(`/products/${id}`, { method: 'DELETE' });
        showNotification('تم حذف المنتج بنجاح!', 'success');
        loadProducts();
        loadAdminData();
    } catch (error) {
        showNotification('خطأ في حذف المنتج.', 'error');
    }
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    // Simple cart simulation
    let cartCount = parseInt(document.getElementById('cartCount').textContent);
    cartCount++;
    document.getElementById('cartCount').textContent = cartCount;
    
    showNotification(`تمت إضافة ${product.nameAr} للسلة`, 'success');
}

function searchProducts(searchTerm) {
    const filteredProducts = allProducts.filter(product => 
        product.nameAr.includes(searchTerm) || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayProducts(filteredProducts);
}

function filterProducts(filter) {
    let filteredProducts = allProducts;
    
    switch(filter) {
        case 'electronics':
            filteredProducts = allProducts.filter(p => p.categoryId === 'electronics');
            break;
        case 'new':
            filteredProducts = allProducts.slice(0, 3); // Simulate new products
            break;
        case 'sale':
            filteredProducts = allProducts.filter(p => p.price < 300); // Simulate sale items
            break;
        default:
            filteredProducts = allProducts;
    }
    
    displayProducts(filteredProducts);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-bold animate-slide-up ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add CSS for filter tabs
const style = document.createElement('style');
style.textContent = `
    .filter-tab.active {
        background-color: #D32F2F;
        color: white;
    }
    
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;
document.head.appendChild(style);