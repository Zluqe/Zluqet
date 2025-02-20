#!/bin/bash

set -e

INSTALL_PATH="/usr/local/bin/zluqet"

# Define the content of the zluqet script
read -r -d '' ZLUQET_SCRIPT <<'EOF'
#!/bin/bash
# Usage: zluqet --text "<text>" OR zluqet --file <file_location>

# Function to print usage information
usage() {
    echo "Usage: $0 --text \"<text>\" OR $0 --file <file_location>"
    exit 1
}

# Check if at least two arguments are provided
if [ "$#" -lt 2 ]; then
    usage
fi

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --text)
            mode="text"
            shift
            text="$1"
            ;;
        --file)
            mode="file"
            shift
            file="$1"
            ;;
        *)
            echo "Unknown parameter: $1"
            usage
            ;;
    esac
    shift
done

# If --file was used, read its content
if [ "$mode" == "file" ]; then
    if [ ! -f "$file" ]; then
        echo "File not found: $file"
        exit 1
    fi
    text=$(cat "$file")
fi

# Define the domain for zluqet
domain="https://paste.zluqe.org"

# Use curl to POST the text
response=$(curl -s -w "\n%{http_code}" -X POST -d "$text" "$domain/api/documents")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    # Try extracting the "key" from the JSON response using jq if available
    if command -v jq &> /dev/null; then
        key=$(echo "$body" | jq -r '.key')
    else
        # Fallback extraction using sed
        key=$(echo "$body" | sed -n 's/.*"key":[[:space:]]*"\([^"]*\)".*/\1/p')
    fi

    if [ -n "$key" ]; then
        echo "Uploaded successfully. Link: $domain/$key"
    else
        echo "Error: No paste key returned in the response."
        exit 1
    fi
else
    echo "Failed to upload text: HTTP $http_code"
    echo "$body"
    exit 1
fi
EOF

# Create a temporary file
tmpfile=$(mktemp)
echo "$ZLUQET_SCRIPT" > "$tmpfile"
chmod +x "$tmpfile"

echo "Installing zluqet to $INSTALL_PATH..."
# Copy the script to /usr/local/bin
if [ "$EUID" -ne 0 ]; then
    sudo cp "$tmpfile" "$INSTALL_PATH"
else
    cp "$tmpfile" "$INSTALL_PATH"
fi

rm "$tmpfile"

echo "Installation complete! You can now run 'zluqet' from the terminal."