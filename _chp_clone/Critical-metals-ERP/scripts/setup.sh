#!/bin/bash
# Battery ERP Setup Script
# This script sets up the complete ERPNext + Carbon Hybrid stack

set -e

echo "🔋 Battery ERP Setup"
echo "===================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Docker installed: $(docker --version)"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Docker Compose installed: $(docker-compose --version)"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}⚠${NC} Node.js not found. Some features may not work."
    else
        echo -e "${GREEN}✓${NC} Node.js installed: $(node --version)"
    fi
    
    # Check available memory (recommend 16GB+)
    if command -v free &> /dev/null; then
        MEM=$(free -g | awk '/^Mem:/{print $2}')
        if [ $MEM -lt 8 ]; then
            echo -e "${YELLOW}⚠${NC} Warning: Less than 8GB RAM available. Performance may be affected."
        else
            echo -e "${GREEN}✓${NC} Memory: ${MEM}GB available"
        fi
    fi
    
    echo ""
}

# Setup environment file
setup_environment() {
    echo "🔧 Setting up environment..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Created .env file from .env.example"
        echo -e "${YELLOW}⚠${NC} Please update .env with your API keys and credentials"
    else
        echo -e "${GREEN}✓${NC} .env file already exists"
    fi
    
    echo ""
}

# Setup ERPNext
setup_erpnext() {
    echo "📦 Setting up ERPNext..."
    
    cd deploy/docker
    
    # Create Docker network
    docker network create erpnext-network 2>/dev/null || true
    echo -e "${GREEN}✓${NC} ERPNext Docker network created"
    
    # Start ERPNext stack
    echo "Starting ERPNext services (this may take a few minutes)..."
    docker compose -f erpnext.yml up -d
    
    echo -e "${GREEN}✓${NC} ERPNext services started"
    echo ""
}

# Setup Carbon
setup_carbon() {
    echo "🔷 Setting up Carbon..."
    
    cd deploy/docker
    
    # Create Docker network
    docker network create carbon-network 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Carbon Docker network created"
    
    # Start Carbon stack
    echo "Starting Carbon services..."
    docker compose -f carbon.yml up -d
    
    echo -e "${GREEN}✓${NC} Carbon services started"
    echo ""
}

# Setup Integrations
setup_integrations() {
    echo "🔗 Setting up Integrations..."
    
    cd integrations
    
    # Install dependencies
    echo "Installing Node.js dependencies..."
    npm install
    
    echo -e "${GREEN}✓${NC} Integration dependencies installed"
    echo ""
}

# Setup Shop Floor UI
setup_shop_floor() {
    echo "🖥️ Setting up Shop Floor UI..."
    
    cd shop-floor
    
    # Install dependencies
    echo "Installing Node.js dependencies..."
    npm install
    
    echo -e "${GREEN}✓${NC} Shop Floor dependencies installed"
    echo ""
}

# Create necessary directories
create_directories() {
    echo "📁 Creating directories..."
    
    mkdir -p logs
    mkdir -p data/erpnext
    mkdir -p data/carbon
    mkdir -p data/integrations
    
    echo -e "${GREEN}✓${NC} Directories created"
    echo ""
}

# Show access information
show_access_info() {
    echo ""
    echo "=========================================="
    echo "✅ Setup Complete!"
    echo "=========================================="
    echo ""
    echo "📍 Application URLs:"
    echo "   - ERPNext:        http://localhost:8080"
    echo "   - Carbon:         http://localhost:3000"
    echo "   - Integration API: http://localhost:3001"
    echo "   - Shop Floor UI:  http://localhost:3002 (run: cd shop-floor && npm run dev)"
    echo "   - Grafana:        http://localhost:3100"
    echo ""
    echo "🔐 Default Credentials:"
    echo "   - ERPNext Admin:  admin / admin123"
    echo "   - (Change these in production!)"
    echo ""
    echo "📚 Next Steps:"
    echo "   1. Update .env with your API keys (Xero, Precoro)"
    echo "   2. Run: cd integrations && npm run dev"
    echo "   3. Run: cd shop-floor && npm run dev"
    echo "   4. Access ERPNext and configure your battery recycling workflows"
    echo ""
    echo "📖 Documentation:"
    echo "   - Main docs: README.md"
    echo "   - ERPNext module: erpnext/recycling_module.md"
    echo "   - Carbon workflows: carbon/workflows.md"
    echo "   - Integration API: integrations/README.md"
    echo ""
    echo "🆘 Troubleshooting:"
    echo "   - View logs: docker compose logs -f"
    echo "   - Restart services: docker compose restart"
    echo "   - Check status: docker compose ps"
    echo ""
}

# Main setup flow
main() {
    check_prerequisites
    create_directories
    setup_environment
    setup_erpnext
    cd ..
    setup_carbon
    cd ..
    setup_integrations
    setup_shop_floor
    show_access_info
}

# Run setup
main
