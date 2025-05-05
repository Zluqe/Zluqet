#!/bin/bash
# =====================================
# Zluqet CLI Installer
# Created by Person0z
# Copyright (c) 2025 Zluqe
# ===================================

# Zluqet CLI Installer
set -euo pipefail

INSTALL_PATH="/usr/local/bin/zluqet"
TMPFILE=$(mktemp) || { echo "Failed to create a temporary file."; exit 1; }
trap "rm -f $TMPFILE" EXIT

cat << 'EOF' > "$TMPFILE"
#!/bin/bash
# Zluqet CLI: Upload text or file contents to a Zluqet server
# Usage:
#   zluqet --text "your text here"
#   zluqet --file /path/to/file

usage() {
    echo "Usage:"
    echo "  zluqet --text \"<text>\""
    echo "  zluqet --file <file_path>"
    echo "  zluqet --help"
    exit 1
}

if [ $# -eq 0 ]; then
    usage
fi

MODE=""
TEXT=""
DOMAIN="https://paste.zluqe.org"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --text)
            MODE="text"
            shift
            TEXT="$1"
            ;;
        --file)
            MODE="file"
            shift
            if [ ! -f "$1" ]; then
                echo "File not found: $1"
                exit 1
            fi
            TEXT=$(<"$1")
            ;;
        --help|-h)
            usage
            ;;
        *)
            echo "Unknown argument: $1"
            usage
            ;;
    esac
    shift
done

if [ -z "$TEXT" ]; then
    echo "No content provided."
    exit 1
fi

RESPONSE=$(echo -n "$TEXT" | curl -s -w "\n%{http_code}" -X POST --data-binary @- "$DOMAIN/api/documents")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    if command -v jq &> /dev/null; then
        KEY=$(echo "$BODY" | jq -r '.key')
    else
        KEY=$(echo "$BODY" | sed -n 's/.*"key":[[:space:]]*"\([^"]*\)".*/\1/p')
    fi
    if [ -n "$KEY" ]; then
        echo "Uploaded successfully: $DOMAIN/$KEY"
    else
        echo "Upload succeeded but no key was found in the response."
        exit 1
    fi
else
    echo "Upload failed with HTTP $HTTP_CODE"
    echo "$BODY"
    exit 1
fi
EOF

chmod +x "$TMPFILE"

echo "Installing zluqet to $INSTALL_PATH..."
if [ "$EUID" -ne 0 ]; then
    if command -v sudo &> /dev/null; then
        sudo cp "$TMPFILE" "$INSTALL_PATH"
        sudo chmod 755 "$INSTALL_PATH"
    else
        echo "Error: please run as root or install sudo."
        exit 1
    fi
else
    cp "$TMPFILE" "$INSTALL_PATH"
    chmod 755 "$INSTALL_PATH"
fi

echo "Installation complete. You can now use 'zluqet' from the terminal."