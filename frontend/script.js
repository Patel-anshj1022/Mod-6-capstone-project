// API Base URL
const API_BASE = 'http://localhost:5000/api';

// Global State
let currentUser = null;
let products = [];
let cart = JSON.parse(localStorage.getItem('aerolite_cart')) || [];
let currentOrderId = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Aerolite frontend loaded!");
    loadProducts();
    updateCartUI();
    setupEventListeners();
    initCounters();
    setupContactForm();
});

// Setup all event listeners
function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    // Auth buttons
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => showAuthModal('login'));
        console.log("Login button listener added");
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => showAuthModal('register'));
        console.log("Register button listener added");
    }
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Auth tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });
    
    // Form submissions
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLoginSimplified();
        });
        console.log("Login form listener added");
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleRegisterSimplified();
        });
        console.log("Register form listener added");
    }
    
    // Cart and navigation
    const cartIcon = document.querySelector('.cart-icon');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutForm = document.getElementById('checkoutForm');
    const paymentForm = document.getElementById('paymentForm');
    
    if (cartIcon) {
        cartIcon.addEventListener('click', showCartModal);
        console.log("Cart icon listener added");
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', showCheckoutModal);
        console.log("Checkout button listener added");
    }
    
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
        console.log("Checkout form listener added");
    }
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePayment);
        console.log("Payment form listener added");
    }
    
    // Filters
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }
    
    // Close modals on outside click
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Contact form
    setupContactForm();
}

// SIMPLIFIED REGISTRATION HANDLER
async function handleRegisterSimplified() {
    console.log("handleRegisterSimplified called");
    
    const registerForm = document.getElementById('registerForm');
    const inputs = registerForm.querySelectorAll('input');
    
    const userData = {
        firstName: inputs[0].value,
        lastName: inputs[1].value,  
        email: inputs[2].value,
        password: inputs[3].value
    };
    
    console.log("Registration data:", userData);
    
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        console.log("Server response:", data);
        
        if (response.ok) {
            localStorage.setItem('aerolite_token', data.access_token);
            currentUser = data.user;
            document.getElementById('authModal').style.display = 'none';
            showNotification('Account created successfully!');
            updateAuthUI();
            inputs.forEach(input => input.value = '');
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// SIMPLIFIED LOGIN HANDLER
async function handleLoginSimplified() {
    console.log("handleLoginSimplified called");
    
    const loginForm = document.getElementById('loginForm');
    const inputs = loginForm.querySelectorAll('input');
    
    const credentials = {
        email: inputs[0].value,
        password: inputs[1].value
    };
    
    console.log("Login data:", credentials);
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        console.log("Server response:", data);
        
        if (response.ok) {
            localStorage.setItem('aerolite_token', data.access_token);
            currentUser = data.user;
            document.getElementById('authModal').style.display = 'none';
            showNotification('Welcome back!');
            updateAuthUI();
            inputs.forEach(input => input.value = '');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Product Management
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        products = await response.json();
        console.log("Loaded products from backend:", products.length);
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products from backend:', error);
        products = getSampleProducts();
        console.log("Using sample products:", products.length);
        displayProducts(products);
    }
}

function displayProducts(productsToDisplay) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) {
        console.error("Products grid element not found!");
        return;
    }
    
    productsGrid.innerHTML = productsToDisplay.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.imageUrl}" 
                     alt="${product.name}"
                     loading="lazy"
                     onerror="handleImageError(this)"
                     onload="handleImageLoad(this)">
                <i class="fas fa-plane"></i>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="product-category">${product.category}</div>
                <p class="product-description">${product.description}</p>
                <div class="product-price">$${product.price.toLocaleString()}</div>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="addToCart(${product.id})">
                        Add to Hangar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Image handling functions
function handleImageError(img) {
    console.log("Image failed to load:", img.src);
    img.style.display = 'none';
    // Show the plane icon
    const planeIcon = img.nextElementSibling;
    if (planeIcon) {
        planeIcon.style.display = 'flex';
    }
}

function handleImageLoad(img) {
    console.log("Image loaded successfully:", img.src);
    // Hide the plane icon when image loads
    const planeIcon = img.nextElementSibling;
    if (planeIcon) {
        planeIcon.style.display = 'none';
    }
}
function filterProducts() {
    const category = document.getElementById('categoryFilter')?.value || '';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    let filteredProducts = products;
    
    if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm)
        );
    }
    
    displayProducts(filteredProducts);
}

// Cart Management
function addToCart(productId) {
    console.log("Adding to cart:", productId);
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.error("Product not found:", productId);
        return;
    }
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    updateCartStorage();
    updateCartUI();
    showNotification(`${product.name} added to your hangar!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    updateCartStorage();
    updateCartUI();
}

function updateCartStorage() {
    localStorage.setItem('aerolite_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const cartCountElement = document.querySelector('.cart-count');
    const cartItemsElement = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    
    if (cartCountElement) {
        cartCountElement.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    }
    
    if (cartItemsElement && cartTotalElement) {
        cartItemsElement.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">$${item.price.toLocaleString()}</div>
                </div>
                <div class="cart-item-actions">
                    <button class="quantity-btn" onclick="updateQuantity(${item.productId}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.productId}, 1)">+</button>
                    <button class="remove-btn" onclick="removeFromCart(${item.productId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotalElement.textContent = total.toLocaleString();
    }
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.productId === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartStorage();
            updateCartUI();
        }
    }
}

// Auth Management
function showAuthModal(tab = 'login') {
    console.log("Showing auth modal:", tab);
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'block';
        switchAuthTab(tab);
    } else {
        console.error("Auth modal not found!");
    }
}

function switchAuthTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });
    
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === `${tabName}Form`);
    });
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (!loginBtn || !registerBtn) {
        console.error("Auth buttons not found!");
        return;
    }
    
    if (currentUser) {
        loginBtn.textContent = currentUser.firstName;
        registerBtn.textContent = 'Logout';
        registerBtn.onclick = handleLogout;
    } else {
        loginBtn.textContent = 'Login';
        registerBtn.textContent = 'Register';
        registerBtn.onclick = () => showAuthModal('register');
    }
}

function handleLogout() {
    localStorage.removeItem('aerolite_token');
    currentUser = null;
    updateAuthUI();
    showNotification('Logged out successfully');
}

// Checkout Process
function showCartModal() {
    console.log("Showing cart modal");
    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        cartModal.style.display = 'block';
    } else {
        console.error("Cart modal not found!");
    }
}

function showCheckoutModal() {
    if (cart.length === 0) {
        showNotification('Your hangar is empty!', 'error');
        return;
    }
    
    if (!currentUser) {
        showAuthModal('login');
        return;
    }
    
    const cartModal = document.getElementById('cartModal');
    const checkoutModal = document.getElementById('checkoutModal');
    
    if (cartModal) cartModal.style.display = 'none';
    if (checkoutModal) checkoutModal.style.display = 'block';
    
    const summary = document.getElementById('checkoutSummary');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (summary) {
        summary.innerHTML = `
            ${cart.map(item => `
                <div>${item.name} x${item.quantity} - $${(item.price * item.quantity).toLocaleString()}</div>
            `).join('')}
            <div><strong>Total: $${total.toLocaleString()}</strong></div>
        `;
    }
}

async function handleCheckout(e) {
    e.preventDefault();
    
    const checkoutForm = document.getElementById('checkoutForm');
    const inputs = checkoutForm.querySelectorAll('input, textarea');
    const address = inputs[2].value;
    
    if (!address) {
        showNotification('Please enter delivery address', 'error');
        return;
    }
    
    const orderData = {
        items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
        })),
        totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        shippingAddress: address
    };
    
    try {
        const token = localStorage.getItem('aerolite_token');
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentOrderId = data.orderId;
            document.getElementById('checkoutModal').style.display = 'none';
            
            if (data.requiresPayment) {
                showPaymentModal(orderData.totalAmount);
            } else {
                completeOrder();
            }
        } else {
            throw new Error(data.error || 'Checkout failed');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Checkout failed. Please try again.', 'error');
    }
}

// Payment Modal and Processing
function showPaymentModal(totalAmount) {
    const paymentModal = document.getElementById('paymentModal');
    const paymentTotal = document.getElementById('paymentTotal');
    
    if (paymentTotal) {
        paymentTotal.textContent = totalAmount.toLocaleString();
    }
    
    const paymentSummary = document.getElementById('paymentSummary');
    if (paymentSummary) {
        paymentSummary.innerHTML = generatePaymentSummary();
    }
    
    if (paymentModal) {
        paymentModal.style.display = 'block';
    }
}

function generatePaymentSummary() {
    return cart.map(item => `
        <div class="payment-summary-item">
            <span>${item.name} x${item.quantity}</span>
            <span>$${(item.price * item.quantity).toLocaleString()}</span>
        </div>
    `).join('') + `
        <div class="payment-summary-total">
            <strong>Total: $${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</strong>
        </div>
    `;
}

async function handlePayment(e) {
    e.preventDefault();
    
    const paymentForm = document.getElementById('paymentForm');
    const inputs = paymentForm.querySelectorAll('input, select');
    const submitBtn = paymentForm.querySelector('button[type="submit"]');
    
    // Get payment data
    const paymentData = {
        method: inputs[0].value,
        cardNumber: inputs[1].value.replace(/\s/g, ''),
        expiryDate: inputs[2].value,
        cvc: inputs[3].value,
        cardholderName: inputs[4].value
    };
    
    // Validate card number (basic validation)
    if (paymentData.cardNumber.length !== 16 || isNaN(paymentData.cardNumber)) {
        showNotification('Please enter a valid 16-digit card number', 'error');
        return;
    }
    
    if (!paymentData.expiryDate) {
        showNotification('Please enter expiry date', 'error');
        return;
    }
    
    if (!paymentData.cvc || paymentData.cvc.length !== 3) {
        showNotification('Please enter a valid 3-digit CVC', 'error');
        return;
    }
    
    if (!paymentData.cardholderName) {
        showNotification('Please enter cardholder name', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.textContent = 'Processing Payment...';
    submitBtn.disabled = true;
    
    try {
        const token = localStorage.getItem('aerolite_token');
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const response = await fetch(`${API_BASE}/process-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                orderId: currentOrderId,
                paymentData: paymentData,
                amount: totalAmount
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Payment successful! Order confirmed.', 'success');
            document.getElementById('paymentModal').style.display = 'none';
            completeOrder(data.transactionId);
        } else {
            throw new Error(data.error || 'Payment failed');
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        showNotification(error.message || 'Payment failed. Please try again.', 'error');
    } finally {
        // Reset button
        submitBtn.textContent = 'Complete Payment';
        submitBtn.disabled = false;
    }
}

function completeOrder(transactionId = null) {
    // Clear cart
    cart = [];
    updateCartStorage();
    updateCartUI();
    
    // Show success message
    let message = 'Order confirmed! Your aircraft will be delivered soon.';
    if (transactionId) {
        message += ` Transaction ID: ${transactionId}`;
    }
    
    showNotification(message, 'success');
    currentOrderId = null;
}

// Contact Form Handling
function setupContactForm() {
    const contactForm = document.getElementById('contactForm');
    const urgentCheckbox = document.getElementById('urgentCheckbox');
    
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
        console.log("Contact form listener added");
    }
    
    if (urgentCheckbox) {
        urgentCheckbox.addEventListener('change', function() {
            const contactCard = document.querySelector('.contact-card:first-child');
            if (this.checked) {
                contactCard.style.animation = 'pulseUrgent 2s infinite';
            } else {
                contactCard.style.animation = 'none';
            }
        });
    }
}

async function handleContactSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Get form data
    const formData = {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        email: form.email.value,
        phone: form.phone.value,
        subject: form.subject.value,
        budget: form.budget.value,
        message: form.message.value,
        newsletter: form.newsletter.checked,
        urgent: form.urgent.checked
    };
    
    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.subject || !formData.message) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Show success modal
        showContactSuccessModal();
        
        // Reset form
        form.reset();
        
        // Show notification
        const urgency = formData.urgent ? ' urgently' : '';
        showNotification(`Message sent${urgency}! We'll contact you soon.`, 'success');
        
    } catch (error) {
        console.error('Contact form error:', error);
        showNotification('Failed to send message. Please try again.', 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showContactSuccessModal() {
    const modal = document.getElementById('contactSuccessModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('contactSuccessModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Utility Functions
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background: ${type === 'error' ? '#dc2626' : '#059669'};
        color: white;
        border-radius: 8px;
        z-index: 3000;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

function scrollToProducts() {
    scrollToSection('products');
}

// Animated counters for About Us section
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            counter.textContent = Math.floor(current);
        }, 16);
    });
}

function initCounters() {
    const sections = document.querySelectorAll('.about-mini, .values-section');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                sections.forEach(section => observer.unobserve(section));
            }
        });
    }, { threshold: 0.3 });
    
    sections.forEach(section => {
        if (section) {
            observer.observe(section);
        }
    });
}

// Sample products data (fallback)
function getSampleProducts() {
    return [
        // ... (your 31 products data here - keep this exactly as you had it)
        // Business Jets
        {
            id: 1,
            name: "Gulfstream G650",
            description: "Ultra-long-range business jet with luxurious interior and advanced avionics.",
            price: 65000000,
            category: "Business",
            imageUrl: "images/g650.jpg",
            stock: 3,
            featured: true
        },
        {
            id: 2,
            name: "Dassault Falcon 8X",
            description: "Three-engine long-range business jet with excellent fuel efficiency.",
            price: 59000000,
            category: "Business",
            imageUrl: "images/falcon8x.jpg",
            stock: 2,
            featured: true
        },
        // ... include ALL 31 products here
    ];
}

// Add pulse animation for urgent inquiries
const style = document.createElement('style');
style.textContent = `
    @keyframes pulseUrgent {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
`;
document.head.appendChild(style);