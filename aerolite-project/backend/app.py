from flask import Flask, request, jsonify
import sqlite3
import hashlib
import secrets
import json

app = Flask(__name__)

# Manual CORS handling
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Aerolite Backend is running!"})

# Database setup
def init_db():
    conn = sqlite3.connect('aerolite.db', check_same_thread=False)
    c = conn.cursor()
    
    # Create tables
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            image_url TEXT,
            stock INTEGER DEFAULT 0,
            featured BOOLEAN DEFAULT FALSE
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            shipping_address TEXT NOT NULL,
            payment_status TEXT DEFAULT 'pending',
            payment_method TEXT,
            transaction_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL
        )
    ''')
    
    # Add sample products if none exist
    c.execute('SELECT COUNT(*) FROM products')
    if c.fetchone()[0] == 0:
        sample_products = [
            # Business Jets
            ('Gulfstream G650', 'Ultra-long-range business jet with luxurious interior and advanced avionics.', 65000000, 'Business', '/images/g650.jpg', 3, 1),
            ('Dassault Falcon 8X', 'Three-engine long-range business jet with excellent fuel efficiency.', 59000000, 'Business', '/images/falcon8x.jpg', 2, 1),
            ('Bombardier Global 7500', 'Luxurious and spacious ultra-long-range private jet.', 73000000, 'Business', '/images/global7500.jpg', 2, 1),
            ('Cessna Citation XLS+', 'Mid-size business jet with excellent reliability and performance.', 13500000, 'Business', '/images/xlsplus.jpg', 5, 0),
            ('Pilatus PC-24', 'Versatile light jet with great short runway performance.', 10500000, 'Business', '/images/pc24.jpg', 4, 0),
            ('Embraer Phenom 300E', 'Popular light business jet with excellent speed and range.', 9300000, 'Business', '/images/phenom300e.jpg', 6, 0),
            ('HondaJet Elite', 'Innovative very light jet with over-the-wing engine mounts.', 5400000, 'Business', '/images/hondajet.jpg', 8, 0),
            ('Learjet 75 Liberty', 'Light business jet with great speed and comfort.', 13000000, 'Business', '/images/learjet75.jpg', 3, 0),
            ('Cessna Citation Latitude', 'Super mid-size jet with spacious cabin and long range.', 18000000, 'Business', '/images/citationlatitude.jpg', 4, 0),
            ('Gulfstream G280', 'Super mid-size jet with great speed and cabin comfort.', 24500000, 'Business', '/images/g280.jpg', 3, 0),
            ('Dassault Falcon 2000LXS', 'Twin-engine business jet with excellent range and comfort.', 34000000, 'Business', '/images/falcon2000.jpg', 2, 0),
            ('Embraer Legacy 500', 'Mid-size jet with spacious cabin and modern avionics.', 19000000, 'Business', '/images/legacy500.jpg', 3, 0),
            
            # Helicopters
            ('Airbus ACH160 Helicopter', 'Advanced light helicopter designed for luxury and speed.', 12500000, 'Helicopter', '/images/ach160.jpg', 4, 1),
            ('Bell 525 Relentless', 'Next-gen super-medium helicopter with fly-by-wire controls.', 13000000, 'Helicopter', '/images/bell525.jpg', 2, 0),
            ('Sikorsky S-76D', 'Medium-size commercial helicopter with great range.', 13000000, 'Helicopter', '/images/s76d.jpg', 3, 0),
            ('AgustaWestland AW139', 'Medium utility helicopter widely used for VIP transport.', 12000000, 'Helicopter', '/images/aw139.jpg', 4, 0),
            ('Eurocopter EC130', 'Light utility helicopter with quiet operation.', 2800000, 'Helicopter', '/images/ec130.jpg', 6, 0),
            ('Robinson R44', 'Popular four-seat light helicopter.', 500000, 'Helicopter', '/images/r44.jpg', 10, 0),
            ('Bell 407GXi', 'Light single-engine helicopter with smooth performance.', 4500000, 'Helicopter', '/images/bell407.jpg', 5, 0),
            ('Sikorsky S-92', 'Heavy-lift helicopter for offshore and VIP transport.', 27000000, 'Helicopter', '/images/s92.jpg', 2, 0),
            ('AgustaWestland AW109', 'Lightweight twin-engine helicopter for VIP travel.', 6000000, 'Helicopter', '/images/aw109.jpg', 4, 0),
            
            # Turboprops
            ('Textron King Air 350i', 'Turboprop aircraft popular for short and mid-range travel.', 7500000, 'Turboprop', '/images/kingair350i.jpg', 6, 1),
            ('Beechcraft King Air 250', 'Reliable turboprop for business and utility use.', 4900000, 'Turboprop', '/images/kingair250.jpg', 8, 0),
            ('Pilatus PC-12 NGX', 'Single-engine turboprop with excellent versatility.', 4800000, 'Turboprop', '/images/pc12ngx.jpg', 7, 0),
            ('Cessna Caravan 208B', 'Versatile turboprop for utility and passenger missions.', 2800000, 'Turboprop', '/images/caravan208b.jpg', 12, 0),
            ('Pilatus PC-6 Porter', 'STOL utility aircraft for rugged operations.', 2000000, 'Turboprop', '/images/pc6porter.jpg', 5, 0),
            
            # Commercial & Regional
            ('Mitsubishi SpaceJet M90', 'Regional jet with focus on fuel efficiency and comfort.', 25000000, 'Commercial', '/images/spacejetm90.jpg', 3, 0),
            
            # Light Aircraft
            ('Cirrus Vision Jet', 'Personal jet with single-engine and advanced safety features.', 2400000, 'Light Aircraft', '/images/cirrusvision.jpg', 8, 0),
            ('Cirrus SR22', 'Single-engine piston aircraft with advanced avionics.', 800000, 'Light Aircraft', '/images/sr22.jpg', 15, 0),
            ('Diamond DA62', 'Twin-engine light aircraft with great fuel economy.', 1000000, 'Light Aircraft', '/images/da62.jpg', 6, 0),
            ('Beechcraft Baron G58', 'Twin piston aircraft perfect for personal/business use.', 1600000, 'Light Aircraft', '/images/baron_g58.jpg', 4, 0),
        ]
        c.executemany('INSERT INTO products (name, description, price, category, image_url, stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?)', sample_products)
        print("Sample products added!")
    
    conn.commit()
    conn.close()
    print("Database initialized successfully!")

# Helper functions
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Simple authentication storage (in-memory for demo)
users_tokens = {}

def create_token(user_id):
    token = secrets.token_hex(16)
    users_tokens[token] = user_id
    return token

def get_user_from_token(token):
    return users_tokens.get(token)

# Payment simulation
def process_payment(payment_data, amount):
    """
    Simulate payment processing
    In production, this would integrate with Stripe, PayPal, etc.
    """
    print(f"Processing payment of ${amount:,.2f}")
    print(f"Payment method: {payment_data.get('method', 'card')}")
    
    # Simulate payment processing
    card_number = payment_data.get('cardNumber', '')
    
    # Basic validation
    if not card_number or len(card_number.replace(' ', '')) != 16:
        return {'success': False, 'error': 'Invalid card number'}
    
    if not payment_data.get('expiryDate'):
        return {'success': False, 'error': 'Expiry date required'}
    
    if not payment_data.get('cvc'):
        return {'success': False, 'error': 'CVC required'}
    
    # Simulate successful payment 90% of the time
    import random
    if random.random() < 0.9:  # 90% success rate
        transaction_id = f"txn_{secrets.token_hex(12)}"
        return {
            'success': True,
            'transaction_id': transaction_id,
            'message': 'Payment processed successfully'
        }
    else:
        return {
            'success': False,
            'error': 'Payment declined: Insufficient funds'
        }

# Routes
@app.route('/api/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data received'}), 400
            
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        first_name = data.get('firstName', '').strip()
        last_name = data.get('lastName', '').strip()
        
        # Validation
        if not email or not password or not first_name or not last_name:
            return jsonify({'error': 'All fields are required'}), 400
        
        if len(password) < 3:
            return jsonify({'error': 'Password must be at least 3 characters'}), 400
        
        # Database connection
        conn = sqlite3.connect('aerolite.db', check_same_thread=False)
        c = conn.cursor()
        
        # Check if user exists
        c.execute('SELECT id FROM users WHERE email = ?', (email,))
        if c.fetchone():
            conn.close()
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create user
        password_hash = hash_password(password)
        c.execute('INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
                 (email, password_hash, first_name, last_name))
        
        user_id = c.lastrowid
        conn.commit()
        conn.close()
        
        # Create token
        token = create_token(user_id)
        
        return jsonify({
            'message': 'User created successfully',
            'access_token': token,
            'user': {
                'id': user_id,
                'email': email,
                'firstName': first_name,
                'lastName': last_name,
                'isAdmin': False
            }
        }), 201
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        conn = sqlite3.connect('aerolite.db', check_same_thread=False)
        c = conn.cursor()
        
        c.execute('SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = ?', (email,))
        user = c.fetchone()
        conn.close()
        
        if not user or hash_password(password) != user[2]:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        token = create_token(user[0])
        
        return jsonify({
            'message': 'Login successful',
            'access_token': token,
            'user': {
                'id': user[0],
                'email': user[1],
                'firstName': user[3],
                'lastName': user[4],
                'isAdmin': False
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/products', methods=['GET', 'OPTIONS'])
def get_products():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        conn = sqlite3.connect('aerolite.db', check_same_thread=False)
        c = conn.cursor()
        c.execute('SELECT id, name, description, price, category, image_url, stock, featured FROM products')
        products = c.fetchall()
        conn.close()
        
        products_list = []
        for p in products:
            products_list.append({
                'id': p[0],
                'name': p[1],
                'description': p[2],
                'price': p[3],
                'category': p[4],
                'imageUrl': p[5],
                'stock': p[6],
                'featured': bool(p[7])
            })
        
        return jsonify(products_list)
        
    except Exception as e:
        print(f"Products error: {str(e)}")
        return jsonify({'error': 'Failed to load products'}), 500

@app.route('/api/orders', methods=['POST', 'OPTIONS'])
def create_order():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        # Simple token check (for demo)
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
            
        token = auth_header.replace('Bearer ', '')
        user_id = get_user_from_token(token)
        
        if not user_id:
            return jsonify({'error': 'Invalid token'}), 401
        
        data = request.get_json()
        
        conn = sqlite3.connect('aerolite.db', check_same_thread=False)
        c = conn.cursor()
        
        # Create order with payment status
        c.execute('INSERT INTO orders (user_id, total_amount, shipping_address, status) VALUES (?, ?, ?, ?)',
                 (user_id, data.get('totalAmount', 0), data.get('shippingAddress', ''), 'pending'))
        
        order_id = c.lastrowid
        
        # Create order items
        for item in data.get('items', []):
            c.execute('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                     (order_id, item.get('productId'), item.get('quantity', 1), item.get('price', 0)))
        
        conn.commit()
        conn.close()
        
        print(f"Order #{order_id} created for user {user_id} - Payment pending")
        
        return jsonify({
            'message': 'Order created successfully - Proceed to payment', 
            'orderId': order_id,
            'requiresPayment': True
        }), 201
        
    except Exception as e:
        print(f"Order error: {str(e)}")
        return jsonify({'error': 'Order creation failed'}), 500

@app.route('/api/process-payment', methods=['POST', 'OPTIONS'])
def process_payment_route():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        # Authentication
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
            
        token = auth_header.replace('Bearer ', '')
        user_id = get_user_from_token(token)
        
        if not user_id:
            return jsonify({'error': 'Invalid token'}), 401
        
        data = request.get_json()
        order_id = data.get('orderId')
        payment_data = data.get('paymentData', {})
        amount = data.get('amount', 0)
        
        if not order_id:
            return jsonify({'error': 'Order ID required'}), 400
        
        # Process payment
        payment_result = process_payment(payment_data, amount)
        
        conn = sqlite3.connect('aerolite.db', check_same_thread=False)
        c = conn.cursor()
        
        if payment_result['success']:
            # Update order with payment success
            c.execute('''
                UPDATE orders 
                SET status = 'confirmed', 
                    payment_status = 'paid',
                    payment_method = ?,
                    transaction_id = ?
                WHERE id = ? AND user_id = ?
            ''', (payment_data.get('method', 'card'), payment_result['transaction_id'], order_id, user_id))
            
            conn.commit()
            conn.close()
            
            print(f"Payment successful for order #{order_id}, transaction: {payment_result['transaction_id']}")
            
            return jsonify({
                'success': True,
                'message': 'Payment processed successfully',
                'transactionId': payment_result['transaction_id'],
                'orderId': order_id
            }), 200
        else:
            # Update order with payment failure
            c.execute('''
                UPDATE orders 
                SET status = 'payment_failed',
                    payment_status = 'failed'
                WHERE id = ? AND user_id = ?
            ''', (order_id, user_id))
            
            conn.commit()
            conn.close()
            
            print(f"Payment failed for order #{order_id}: {payment_result['error']}")
            
            return jsonify({
                'success': False,
                'error': payment_result['error']
            }), 400
            
    except Exception as e:
        print(f"Payment processing error: {str(e)}")
        return jsonify({'error': 'Payment processing failed'}), 500

@app.route('/api/test', methods=['GET', 'OPTIONS'])
def test():
    if request.method == 'OPTIONS':
        return '', 200
    return jsonify({'message': 'Aerolite backend is working!'})

import os

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
if __name__ == '__main__':
    print("🚀 Starting Aerolite Backend...")
    print("📦 Initializing database...")
    init_db()
    print("✅ Database ready!")
    print("💳 Payment system: SIMULATION MODE")
    print("🌐 Starting server on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)