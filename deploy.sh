#!/bin/bash

# Al-Baik Deployment Script
# This script helps deploy the Al-Baik e-commerce platform

set -e

echo "🚀 Al-Baik Deployment Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check wrangler
    if ! command -v wrangler &> /dev/null; then
        print_warning "Wrangler CLI not found. Installing..."
        npm install -g wrangler
    fi
    
    # Check turso
    if ! command -v turso &> /dev/null; then
        print_warning "Turso CLI not found. Please install it manually:"
        echo "curl -sSfL https://get.tur.so/install.sh | bash"
        exit 1
    fi
    
    print_success "All requirements satisfied!"
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    # Check if wrangler.toml is configured
    if grep -q "your-turso-database-id" wrangler.toml; then
        print_warning "Please configure your Turso database IDs in backend/wrangler.toml"
        print_warning "Run: turso db create al-baik-prod && turso db create al-baik-dev"
        print_warning "Then update the database_id values in wrangler.toml"
        exit 1
    fi
    
    # Deploy to Cloudflare Workers
    print_status "Deploying API to Cloudflare Workers..."
    npm run deploy
    
    cd ..
    print_success "Backend setup complete!"
}

# Setup web app
setup_web() {
    print_status "Setting up web application..."
    
    cd web
    
    # Install dependencies
    print_status "Installing web dependencies..."
    npm install
    
    # Check if .env.local exists
    if [ ! -f .env.local ]; then
        print_warning "Creating .env.local from example..."
        cp .env.example .env.local
        print_warning "Please update the API URL in web/.env.local"
    fi
    
    # Build the application
    print_status "Building web application..."
    npm run build
    
    cd ..
    print_success "Web application setup complete!"
}

# Setup mobile app
setup_mobile() {
    print_status "Setting up mobile application..."
    
    # Check if Flutter is installed
    if ! command -v flutter &> /dev/null; then
        print_warning "Flutter is not installed. Please install Flutter first:"
        echo "https://docs.flutter.dev/get-started/install"
        return
    fi
    
    cd mobile
    
    # Get dependencies
    print_status "Getting Flutter dependencies..."
    flutter pub get
    
    # Build APK
    print_status "Building Android APK..."
    flutter build apk --release
    
    cd ..
    print_success "Mobile application setup complete!"
    print_success "APK location: mobile/build/app/outputs/flutter-apk/app-release.apk"
}

# Initialize database
init_database() {
    print_status "Initializing database..."
    
    # Check if Turso is configured
    if ! turso db list | grep -q "al-baik"; then
        print_warning "Turso databases not found. Creating them..."
        turso db create al-baik-prod
        turso db create al-baik-dev
    fi
    
    # Run initialization script
    print_status "Running database initialization script..."
    turso db shell al-baik-prod < backend/scripts/init-db.sql
    turso db shell al-baik-dev < backend/scripts/init-db.sql
    
    print_success "Database initialized with sample data!"
}

# Main deployment function
main() {
    echo "Select deployment option:"
    echo "1) Full setup (backend + web + mobile)"
    echo "2) Backend only"
    echo "3) Web only"
    echo "4) Mobile only"
    echo "5) Initialize database only"
    echo "6) Check requirements only"
    
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            check_requirements
            init_database
            setup_backend
            setup_web
            setup_mobile
            ;;
        2)
            check_requirements
            setup_backend
            ;;
        3)
            check_requirements
            setup_web
            ;;
        4)
            check_requirements
            setup_mobile
            ;;
        5)
            init_database
            ;;
        6)
            check_requirements
            ;;
        *)
            print_error "Invalid choice. Please select 1-6."
            exit 1
            ;;
    esac
    
    print_success "Deployment completed successfully! 🎉"
    
    echo ""
    echo "📋 Next Steps:"
    echo "1. Configure your environment variables"
    echo "2. Update API URLs in your applications"
    echo "3. Upload your product images/videos to R2"
    echo "4. Test the applications"
    echo ""
    echo "📚 Documentation: README.md"
    echo "🆘 Support: info@al-baik.com"
}

# Run main function
main