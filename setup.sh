#!/bin/bash

# Setup script for GitHub Upload Script
# Налаштування скрипта завантаження на GitHub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

echo ""
echo "========================================="
echo "  GitHub Upload Script Setup"
echo "  Налаштування скрипта завантаження"
echo "========================================="
echo ""

# Step 1: Make script executable
print_step "1/3: Making upload_to_github.sh executable / Надання прав на виконання"
chmod +x upload_to_github.sh
print_info "✓ Script is now executable / Скрипт тепер виконується"
echo ""

# Step 2: Check for token
print_step "2/3: Checking GitHub token / Перевірка GitHub токена"

if [ -f ".github_token" ]; then
    TOKEN_CONTENT=$(cat .github_token | tr -d '[:space:]')
    if [ -n "$TOKEN_CONTENT" ]; then
        print_info "✓ Token file found and contains data / Файл токена знайдено та містить дані"
        print_info "  Token length: ${#TOKEN_CONTENT} characters"
    else
        print_warning "Token file exists but is empty / Файл токена існує але порожній"
        echo ""
        print_info "Please add your GitHub token to .github_token file:"
        print_info "Будь ласка, додайте ваш GitHub токен до файлу .github_token:"
        echo ""
        echo "  echo 'your_github_token_here' > .github_token"
        echo ""
    fi
else
    print_warning "Token file not found / Файл токена не знайдено"
    echo ""
    print_info "Creating .github_token file..."
    print_info "Створення файлу .github_token..."

    # Check if token is provided as argument
    if [ -n "$1" ]; then
        echo "$1" > .github_token
        print_info "✓ Token saved to .github_token / Токен збережено у .github_token"
    else
        touch .github_token
        print_warning "Please add your GitHub token to .github_token file:"
        print_warning "Будь ласка, додайте ваш GitHub токен до файлу .github_token:"
        echo ""
        echo "  echo 'your_github_token_here' > .github_token"
        echo ""
        echo "Or run setup again with token as argument:"
        echo "Або запустіть setup знову з токеном як аргументом:"
        echo ""
        echo "  ./setup.sh 'your_github_token_here'"
    fi
fi
echo ""

# Step 3: Check Git
print_step "3/3: Checking Git installation / Перевірка встановлення Git"
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    print_info "✓ Git is installed: $GIT_VERSION"
else
    print_error "Git is not installed / Git не встановлено"
    echo ""
    echo "Please install Git:"
    echo "Будь ласка, встановіть Git:"
    echo ""
    echo "  Ubuntu/Debian: sudo apt-get install git"
    echo "  CentOS/RHEL:   sudo yum install git"
    echo "  macOS:         brew install git"
    echo ""
    exit 1
fi
echo ""

# Summary
echo "========================================="
echo "  Setup Complete! / Налаштування завершено!"
echo "========================================="
echo ""
print_info "You can now use the upload script / Тепер ви можете використовувати скрипт:"
echo ""
echo "  ./upload_to_github.sh <folder_path>"
echo ""
print_info "Example / Приклад:"
echo ""
echo "  ./upload_to_github.sh /home/user/my_folder"
echo "  ./upload_to_github.sh ~/Documents/my_project"
echo ""
print_info "For more examples, see USAGE_EXAMPLES.md"
print_info "Більше прикладів у файлі USAGE_EXAMPLES.md"
echo ""
