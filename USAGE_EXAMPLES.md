# Приклади використання / Usage Examples

## Приклад 1: Завантаження папки з проектом

Припустимо, у вас є папка з проектом за шляхом `/home/user/my_project`:

```bash
cd /home/user/script
./upload_to_github.sh /home/user/my_project
```

## Приклад 2: Завантаження папки з документами

```bash
./upload_to_github.sh ~/Documents/important_files
```

## Приклад 3: Завантаження папки з поточної директорії

```bash
# Створюємо тестову папку
mkdir -p /tmp/test_upload
echo "Test file" > /tmp/test_upload/test.txt
echo "Another file" > /tmp/test_upload/readme.txt

# Завантажуємо її
./upload_to_github.sh /tmp/test_upload
```

## Приклад 4: Завантаження папки з вкладеними директоріями

```bash
# Створюємо структуру папок
mkdir -p /tmp/project/src/components
mkdir -p /tmp/project/src/utils
mkdir -p /tmp/project/docs

echo "console.log('Hello');" > /tmp/project/src/index.js
echo "export const Helper = {};" > /tmp/project/src/utils/helper.js
echo "# Documentation" > /tmp/project/docs/README.md

# Завантажуємо всю структуру
./upload_to_github.sh /tmp/project
```

## Що станеться після запуску:

1. Скрипт перевірить чи існує папка
2. Підключиться до GitHub репозиторію `nolimiter/script`
3. Створить або перейде на гілку `claude/github-upload-script-01BZKxE1Ufh2rErqQzkFA1vq`
4. Скопіює всі файли з вказаної папки
5. Створить коміт з описом
6. Завантажить зміни на GitHub

## Перевірка результату

Після успішного завантаження ви можете перевірити файли на GitHub:

```
https://github.com/nolimiter/script/tree/claude/github-upload-script-01BZKxE1Ufh2rErqQzkFA1vq
```

## Типові помилки та їх вирішення

### Помилка: "Source folder does not exist"
**Причина**: Вказана папка не існує
**Рішення**: Перевірте шлях до папки та виправте його

```bash
# Перевірити чи існує папка
ls -la /path/to/folder

# Використати абсолютний шлях
./upload_to_github.sh /home/user/existing_folder
```

### Помилка: "Permission denied"
**Причина**: Скрипт не має прав на виконання
**Рішення**: Додайте права на виконання

```bash
chmod +x upload_to_github.sh
```

### Помилка: "Failed to push to GitHub"
**Причина**: Проблема з мережею або токен не дійсний
**Рішення**:
- Перевірте інтернет з'єднання
- Скрипт автоматично спробує повторити 4 рази
- Якщо помилка повторюється, перевірте токен

## Додаткові можливості

### Перегляд файлів перед завантаженням

```bash
# Подивитися що в папці
ls -la /path/to/folder

# Подивитися структуру дерева
tree /path/to/folder  # якщо встановлено tree
```

### Завантаження тільки певних файлів

Якщо потрібно завантажити тільки певні файли, створіть тимчасову папку:

```bash
mkdir -p /tmp/selected_files
cp /path/to/file1.txt /tmp/selected_files/
cp /path/to/file2.txt /tmp/selected_files/

./upload_to_github.sh /tmp/selected_files
```

---

## English Examples

### Example 1: Upload a project folder

```bash
./upload_to_github.sh /home/user/my_project
```

### Example 2: Upload with nested directories

```bash
mkdir -p /tmp/project/src
echo "console.log('test');" > /tmp/project/src/index.js
./upload_to_github.sh /tmp/project
```

### Example 3: Check the result on GitHub

After successful upload, view files at:
```
https://github.com/nolimiter/script/tree/claude/github-upload-script-01BZKxE1Ufh2rErqQzkFA1vq
```
