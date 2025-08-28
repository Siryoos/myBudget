#!/bin/bash

# SmartSave SSL Certificate Generation Script
# Generates self-signed SSL certificates for local development

set -e

# Configuration
CERT_DIR="./certs"
DOMAIN="localhost"
COUNTRY="US"
STATE="Development"
CITY="Local"
ORGANIZATION="SmartSave Development"
ORGANIZATIONAL_UNIT="Development Team"
EMAIL="dev@smartsave.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v openssl &> /dev/null; then
        log_error "OpenSSL is not installed. Please install OpenSSL first."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Create certificate directory
create_cert_directory() {
    log_info "Creating certificate directory..."

    mkdir -p "$CERT_DIR"

    # Create .gitkeep to ensure directory is tracked
    touch "$CERT_DIR/.gitkeep"

    log_success "Certificate directory created: $CERT_DIR"
}

# Generate private key
generate_private_key() {
    log_info "Generating private key..."

    openssl genrsa -out "$CERT_DIR/localhost.key" 2048

    # Set proper permissions
    chmod 600 "$CERT_DIR/localhost.key"

    log_success "Private key generated: $CERT_DIR/localhost.key"
}

# Generate certificate signing request (CSR)
generate_csr() {
    log_info "Generating certificate signing request..."

    # Create OpenSSL configuration for SAN (Subject Alternative Names)
    cat > "$CERT_DIR/localhost.cnf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = $COUNTRY
ST = $STATE
L = $CITY
O = $ORGANIZATION
OU = $ORGANIZATIONAL_UNIT
CN = $DOMAIN
emailAddress = $EMAIL

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = api.$DOMAIN
DNS.4 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    openssl req -new -key "$CERT_DIR/localhost.key" \
        -out "$CERT_DIR/localhost.csr" \
        -config "$CERT_DIR/localhost.cnf"

    log_success "CSR generated: $CERT_DIR/localhost.csr"
}

# Generate self-signed certificate
generate_certificate() {
    log_info "Generating self-signed certificate..."

    # Valid for 365 days
    openssl x509 -req -in "$CERT_DIR/localhost.csr" \
        -signkey "$CERT_DIR/localhost.key" \
        -out "$CERT_DIR/localhost.crt" \
        -days 365 \
        -extensions v3_req \
        -extfile "$CERT_DIR/localhost.cnf"

    # Set proper permissions
    chmod 644 "$CERT_DIR/localhost.crt"

    log_success "Certificate generated: $CERT_DIR/localhost.crt"
}

# Generate certificate bundle (for some applications)
generate_bundle() {
    log_info "Generating certificate bundle..."

    cat "$CERT_DIR/localhost.crt" "$CERT_DIR/localhost.key" > "$CERT_DIR/localhost.pem"
    chmod 600 "$CERT_DIR/localhost.pem"

    log_success "Certificate bundle generated: $CERT_DIR/localhost.pem"
}

# Generate Diffie-Hellman parameters (optional, for better security)
generate_dhparam() {
    log_info "Generating Diffie-Hellman parameters (this may take a while)..."

    openssl dhparam -out "$CERT_DIR/dhparam.pem" 2048

    log_success "DH parameters generated: $CERT_DIR/dhparam.pem"
}

# Display certificate information
display_cert_info() {
    log_info "Certificate information:"

    echo "Subject: $(openssl x509 -in "$CERT_DIR/localhost.crt" -subject -noout)"
    echo "Issuer: $(openssl x509 -in "$CERT_DIR/localhost.crt" -issuer -noout)"
    echo "Valid from: $(openssl x509 -in "$CERT_DIR/localhost.crt" -startdate -noout)"
    echo "Valid until: $(openssl x509 -in "$CERT_DIR/localhost.crt" -enddate -noout)"
    echo "Serial number: $(openssl x509 -in "$CERT_DIR/localhost.crt" -serial -noout)"
    echo "SHA256 fingerprint: $(openssl x509 -in "$CERT_DIR/localhost.crt" -fingerprint -sha256 -noout)"
}

# Clean up temporary files
cleanup() {
    log_info "Cleaning up temporary files..."

    rm -f "$CERT_DIR/localhost.cnf" "$CERT_DIR/localhost.csr"

    log_success "Cleanup completed"
}

# Main certificate generation process
main() {
    log_info "🔒 Starting SSL Certificate Generation for SmartSave Development"
    log_info "Domain: $DOMAIN"
    log_info "Certificate Directory: $CERT_DIR"

    case "${1:-all}" in
        "check")
            check_prerequisites
            ;;
        "key")
            check_prerequisites
            create_cert_directory
            generate_private_key
            ;;
        "csr")
            check_prerequisites
            generate_csr
            ;;
        "cert")
            check_prerequisites
            generate_certificate
            ;;
        "bundle")
            generate_bundle
            ;;
        "dhparam")
            generate_dhparam
            ;;
        "info")
            display_cert_info
            ;;
        "clean")
            cleanup
            ;;
        "all")
            check_prerequisites
            create_cert_directory
            generate_private_key
            generate_csr
            generate_certificate
            generate_bundle
            display_cert_info
            cleanup
            ;;
        *)
            echo "Usage: $0 {check|key|csr|cert|bundle|dhparam|info|clean|all}"
            echo ""
            echo "Commands:"
            echo "  check    - Check prerequisites"
            echo "  key      - Generate private key"
            echo "  csr      - Generate certificate signing request"
            echo "  cert     - Generate self-signed certificate"
            echo "  bundle   - Generate certificate bundle"
            echo "  dhparam  - Generate Diffie-Hellman parameters"
            echo "  info     - Display certificate information"
            echo "  clean    - Clean up temporary files"
            echo "  all      - Generate complete certificate chain"
            exit 1
            ;;
    esac

    if [ "$1" = "all" ] || [ -z "$1" ]; then
        log_success "🎉 SSL certificates generated successfully!"
        log_info ""
        log_info "Certificate files created:"
        log_info "  - $CERT_DIR/localhost.key (Private key)"
        log_info "  - $CERT_DIR/localhost.crt (Certificate)"
        log_info "  - $CERT_DIR/localhost.pem (Bundle)"
        log_info ""
        log_info "Next steps:"
        log_info "1. Trust the certificate in your browser"
        log_info "2. Start development server with SSL: npm run dev:ssl"
        log_info "3. Access application: https://localhost:3000"
        log_info ""
        log_warning "⚠️  IMPORTANT: This is a self-signed certificate for development only!"
        log_warning "   Do not use in production. Use Let's Encrypt or a trusted CA instead."
    fi
}

# Run main function
main "$@"
