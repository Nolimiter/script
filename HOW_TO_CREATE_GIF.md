# 📹 Як створити GIF preview для соціальних мереж

Я створив спеціальну сторінку `preview.html` оптимізовану для запису GIF (розмір 1200x630px).

## 🎬 Варіант 1: Онлайн сервіси (найпростіший)

### Використання Screen to GIF Online:

1. **Відкрийте preview.html:**
   ```
   https://htmlpreview.github.io/?https://github.com/Nolimiter/script/blob/claude/animated-text-page-01QDNVYsswNYdcDGUMmr5Wwo/preview.html
   ```

2. **Перейдіть на https://www.screentogif.com/**
   - Або використайте https://ezgif.com/video-to-gif
   - Або https://www.veed.io/tools/screen-recorder

3. **Запишіть екран:**
   - Виберіть область 1200x630px
   - Записуйте 3-5 секунд (достатньо для анімації)
   - Збережіть як GIF

4. **Оптимізуйте GIF:**
   - Перейдіть на https://ezgif.com/optimize
   - Завантажте свій GIF
   - Compression level: 35-50
   - Збережіть оптимізований файл

## 🖥️ Варіант 2: Програма ScreenToGif (Windows)

1. **Завантажте програму:**
   ```
   https://www.screentogif.com/
   ```

2. **Запишіть екран:**
   - Відкрийте ScreenToGif → Recorder
   - Налаштуйте розмір вікна: 1200x630px
   - Відкрийте preview.html в браузері
   - Натисніть Record
   - Записуйте 3-5 секунд
   - Натисніть Stop

3. **Редагуйте:**
   - Видаліть зайві кадри
   - Налаштуйте FPS: 15-20
   - File → Save As → GIF

## 🍎 Варіант 3: Mac (Gifski + QuickTime)

1. **Запишіть відео:**
   ```bash
   # QuickTime Player → File → New Screen Recording
   # Виберіть область 1200x630px
   # Записуйте preview.html
   ```

2. **Конвертуйте в GIF:**
   ```bash
   # Встановіть Gifski
   brew install gifski

   # Конвертуйте відео в GIF
   gifski -o preview.gif --fps 15 --quality 80 --width 1200 recording.mov
   ```

## 🐧 Варіант 4: Linux (FFmpeg)

```bash
# Запишіть екран за допомогою SimpleScreenRecorder або recordmydesktop

# Конвертуйте відео в GIF
ffmpeg -i recording.mp4 -vf "fps=15,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 preview.gif

# Оптимізуйте GIF
gifsicle -O3 --colors 256 preview.gif -o preview-optimized.gif
```

## 📦 Варіант 5: Швидкий спосіб через Chrome DevTools

1. **Відкрийте preview.html в Chrome**
2. **F12 → Performance → Settings (⚙️)**
3. **Натисніть Record → Почекайте 5 секунд → Stop**
4. **Скачайте запис та конвертуйте через https://cloudconvert.com/webm-to-gif**

## ✅ Після створення GIF:

1. **Перевірте розмір файлу** (повинен бути < 5MB для більшості платформ)
2. **Перейменуйте на `preview.gif`**
3. **Додайте в репозиторій:**
   ```bash
   git add preview.gif
   git commit -m "Add animated preview GIF for social media"
   git push
   ```

## 🎯 Рекомендації:

- **Тривалість:** 3-5 секунд (достатньо для циклу анімації)
- **FPS:** 15-20 (баланс між розміром та плавністю)
- **Розмір файлу:** < 2MB (оптимально для швидкого завантаження)
- **Розміри:** точно 1200x630px
- **Формат:** GIF або MP4 (деякі платформи підтримують відео)

## 🔍 Тестування:

Після завантаження preview.gif, перевірте як він виглядає:

1. **Facebook Debugger:** https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator:** https://cards-dev.twitter.com/validator
3. **LinkedIn Post Inspector:** https://www.linkedin.com/post-inspector/

Вставте URL: `https://nolimiter.github.io/script/`

---

**Примітка:** Мета-теги вже налаштовані на використання `preview.gif` ✅
