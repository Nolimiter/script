# GitHub Upload Script / Скрипт завантаження на GitHub

Скрипт для автоматичного завантаження папок та файлів у репозиторій GitHub.

## Опис

Цей скрипт дозволяє легко завантажити будь-яку папку з вашого комп'ютера в GitHub репозиторій `nolimiter/script`.

## Початкове налаштування

### Крок 1: Налаштування GitHub токена

Токен вже створено для вас. Збережіть його у файл `.github_token`:

```bash
# Токен вже збережено у файлі .github_token
# Якщо файл відсутній, створіть його:
echo 'your_github_token_here' > .github_token
```

**Альтернативні методи:**

1. **Через змінну середовища (рекомендовано для тимчасового використання):**
```bash
export GITHUB_TOKEN='your_token_here'
./upload_to_github.sh /path/to/folder
```

2. **Inline (для одноразового використання):**
```bash
GITHUB_TOKEN='your_token_here' ./upload_to_github.sh /path/to/folder
```

### Крок 2: Перевірка прав виконання

```bash
# Переконайтесь що скрипт має права на виконання
chmod +x upload_to_github.sh
```

## Використання

### Основна команда

```bash
./upload_to_github.sh <шлях_до_папки>
```

### Приклади

1. Завантажити папку з поточної директорії:
```bash
./upload_to_github.sh ./my_folder
```

2. Завантажити папку за абсолютним шляхом:
```bash
./upload_to_github.sh /home/user/documents/my_project
```

3. Завантажити папку з домашньої директорії:
```bash
./upload_to_github.sh ~/Downloads/files_to_upload
```

## Можливості

✓ Автоматична авторизація через GitHub токен
✓ Копіювання всіх файлів та підпапок
✓ Копіювання прихованих файлів
✓ Автоматичне створення коміту
✓ Автоматичний push на GitHub
✓ Повторні спроби при помилках мережі (до 4 разів)
✓ Кольоровий вивід для зручності
✓ Детальне логування процесу

## Що робить скрипт

1. Перевіряє чи існує вказана папка
2. Клонує або використовує існуючий репозиторій
3. Перемикається на потрібну гілку (`claude/github-upload-script-01BZKxE1Ufh2rErqQzkFA1vq`)
4. Копіює всі файли з вказаної папки
5. Додає файли до git
6. Створює коміт з описом
7. Завантажує зміни на GitHub

## Вимоги

- Bash shell
- Git встановлений на системі
- Доступ до інтернету
- Права на запис у репозиторій (токен вже налаштований)

## Налаштування

Скрипт вже налаштований для роботи з:
- **Користувач**: nolimiter
- **Репозиторій**: script
- **Гілка**: claude/github-upload-script-01BZKxE1Ufh2rErqQzkFA1vq
- **Токен**: Зберігається у файлі `.github_token` (не комітиться в git)

## Приклад виводу

```
[INFO] Starting upload process...
[INFO] Source folder: /home/user/my_folder
[INFO] Repository: nolimiter/script
[INFO] Branch: claude/github-upload-script-01BZKxE1Ufh2rErqQzkFA1vq
[INFO] Copying files from source folder...
[INFO] Adding files to git...
[INFO] Creating commit...
[INFO] Pushing to GitHub...
[INFO] ✓ Successfully uploaded files to GitHub!
[INFO] Done!
```

## Обробка помилок

Скрипт автоматично:
- Перевіряє чи існує папка перед завантаженням
- Повторює спроби push при помилках мережі (з експоненційною затримкою)
- Виводить детальні повідомлення про помилки
- Очищує тимчасові файли після завершення

## Безпека

✓ **Безпечне зберігання токена**:
- Токен зберігається у файлі `.github_token`, який додано до `.gitignore`
- Токен ніколи не потрапить у git репозиторій
- GitHub Push Protection автоматично блокує випадкові коміти з токенами

⚠️ **Увага**:
- Не діліться файлом `.github_token` з іншими
- Не публікуйте токен у відкритих джерелах
- Регулярно оновлюйте токен для безпеки

## Ліцензія

Див. файл LICENSE у цьому репозиторії.

---

## English Version

Script for automatic uploading of folders and files to GitHub repository.

### Usage

```bash
./upload_to_github.sh <folder_path>
```

### Features

✓ Automatic GitHub token authentication
✓ Copies all files and subfolders
✓ Copies hidden files
✓ Automatic commit creation
✓ Automatic push to GitHub
✓ Network error retry (up to 4 attempts)
✓ Colored output
✓ Detailed process logging

### Requirements

- Bash shell
- Git installed
- Internet access
- Repository write access (token already configured)
