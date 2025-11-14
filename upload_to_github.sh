#!/bin/bash

# GitHub Upload Script
# Uploads a folder and its contents to GitHub repository
# Repository: nolimiter/script

set -e  # Exit on error

# Configuration
GITHUB_USER="nolimiter"
REPO_NAME="script"
BRANCH_NAME="claude/github-upload-script-01BZKxE1Ufh2rErqQzkFA1vq"

# Load GitHub token from environment variable or config file
if [ -z "$GITHUB_TOKEN" ]; then
    # Try to load from config file
    CONFIG_FILE="$(dirname "$0")/.github_token"
    if [ -f "$CONFIG_FILE" ]; then
        GITHUB_TOKEN=$(cat "$CONFIG_FILE" | tr -d '[:space:]')
    fi
fi

# Check if token is set
if [ -z "$GITHUB_TOKEN" ]; then
    print_error "GitHub token not found!"
    echo ""
    echo "Please set the token using one of these methods:"
    echo ""
    echo "1. Environment variable:"
    echo "   export GITHUB_TOKEN='your_token_here'"
    echo "   ./upload_to_github.sh <folder>"
    echo ""
    echo "2. Create .github_token file:"
    echo "   echo 'your_token_here' > .github_token"
    echo "   ./upload_to_github.sh <folder>"
    echo ""
    echo "3. Pass inline:"
    echo "   GITHUB_TOKEN='your_token_here' ./upload_to_github.sh <folder>"
    echo ""
    exit 1
fi

REPO_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to retry git operations with exponential backoff
retry_git_operation() {
    local max_attempts=4
    local attempt=1
    local delay=2
    local command="$@"

    while [ $attempt -le $max_attempts ]; do
        print_info "Attempt $attempt of $max_attempts: $command"

        if eval "$command"; then
            print_info "Operation successful!"
            return 0
        else
            if [ $attempt -lt $max_attempts ]; then
                print_warning "Failed. Retrying in ${delay}s..."
                sleep $delay
                delay=$((delay * 2))
                attempt=$((attempt + 1))
            else
                print_error "Operation failed after $max_attempts attempts"
                return 1
            fi
        fi
    done
}

# Check if source folder argument is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <source_folder_path>"
    echo "Example: $0 /path/to/your/folder"
    exit 1
fi

SOURCE_FOLDER="$1"

# Validate source folder exists
if [ ! -d "$SOURCE_FOLDER" ]; then
    print_error "Source folder does not exist: $SOURCE_FOLDER"
    exit 1
fi

print_info "Starting upload process..."
print_info "Source folder: $SOURCE_FOLDER"
print_info "Repository: ${GITHUB_USER}/${REPO_NAME}"
print_info "Branch: ${BRANCH_NAME}"

# Get absolute path of source folder
SOURCE_FOLDER=$(cd "$SOURCE_FOLDER" && pwd)

# Check if we're already in a git repository
if [ -d ".git" ]; then
    print_info "Already in a git repository"
    REPO_DIR=$(pwd)
else
    # Clone or use existing repository
    REPO_DIR="/tmp/${REPO_NAME}_upload_$$"

    if [ -d "$REPO_DIR" ]; then
        print_warning "Removing existing temporary directory"
        rm -rf "$REPO_DIR"
    fi

    print_info "Cloning repository to: $REPO_DIR"
    git clone "$REPO_URL" "$REPO_DIR" || {
        print_error "Failed to clone repository"
        exit 1
    }

    cd "$REPO_DIR"
fi

# Configure git
git config user.name "nolimiter" 2>/dev/null || true
git config user.email "nolimiter@users.noreply.github.com" 2>/dev/null || true

# Checkout or create branch
print_info "Switching to branch: $BRANCH_NAME"
git fetch origin "$BRANCH_NAME" 2>/dev/null || true

if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    git checkout "$BRANCH_NAME"
elif git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then
    git checkout -b "$BRANCH_NAME" "origin/$BRANCH_NAME"
else
    git checkout -b "$BRANCH_NAME"
fi

# Copy files from source folder
print_info "Copying files from source folder..."
FOLDER_NAME=$(basename "$SOURCE_FOLDER")

# Create destination if it doesn't exist
if [ ! -d "$FOLDER_NAME" ]; then
    mkdir -p "$FOLDER_NAME"
fi

# Copy all files and subdirectories
cp -r "$SOURCE_FOLDER"/* . 2>/dev/null || print_warning "No files to copy or copy failed"
cp -r "$SOURCE_FOLDER"/.[!.]* . 2>/dev/null || true  # Copy hidden files

# Show what was copied
print_info "Files in repository:"
ls -la

# Add all changes
print_info "Adding files to git..."
git add -A

# Check if there are changes to commit
if git diff --staged --quiet; then
    print_warning "No changes to commit"
    exit 0
fi

# Show status
print_info "Git status:"
git status

# Create commit
print_info "Creating commit..."
COMMIT_MESSAGE="Upload files from $FOLDER_NAME

- Uploaded content from: $SOURCE_FOLDER
- Date: $(date '+%Y-%m-%d %H:%M:%S')
- Files added/updated via upload_to_github.sh script"

git commit -m "$COMMIT_MESSAGE"

# Push changes with retry
print_info "Pushing to GitHub..."
retry_git_operation "git push -u origin $BRANCH_NAME"

if [ $? -eq 0 ]; then
    print_info "✓ Successfully uploaded files to GitHub!"
    print_info "Repository: https://github.com/${GITHUB_USER}/${REPO_NAME}"
    print_info "Branch: ${BRANCH_NAME}"
else
    print_error "Failed to push to GitHub"
    exit 1
fi

# Cleanup if we created a temporary directory
if [ "$REPO_DIR" != "$(pwd)" ] && [ -d "$REPO_DIR" ]; then
    print_info "Cleaning up temporary directory..."
    cd /
    rm -rf "$REPO_DIR"
fi

print_info "Done!"
