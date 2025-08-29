#!/bin/sh
set -eu

# Generate self-signed certs into /etc/nginx/ssl if missing.
# Intended to run in a minimal Alpine container.

SSL_DIR=${SSL_DIR:-/etc/nginx/ssl}
CN=${CERT_COMMON_NAME:-localhost}
DAYS=${CERT_DAYS:-365}

echo "[certgen] Ensuring OpenSSL is available..."
if ! command -v openssl >/dev/null 2>&1; then
  if command -v apk >/dev/null 2>&1; then
    apk add --no-cache openssl >/dev/null
  else
    echo "[certgen] ERROR: openssl not found and apk not available" >&2
    exit 1
  fi
fi

mkdir -p "$SSL_DIR"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

if [ -s "$CERT_FILE" ] && [ -s "$KEY_FILE" ]; then
  echo "[certgen] Existing certificate and key found. Skipping generation."
  exit 0
fi

echo "[certgen] Generating self-signed certificate for CN=$CN (valid $DAYS days)"
openssl req \
  -x509 -nodes -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -days "$DAYS" \
  -subj "/CN=$CN" >/dev/null 2>&1

chmod 600 "$KEY_FILE" || true
chmod 644 "$CERT_FILE" || true

echo "[certgen] Certificate generated at $CERT_FILE"
echo "[certgen] Key generated at $KEY_FILE"
exit 0

