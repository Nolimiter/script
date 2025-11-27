// ==UserScript==
// @name         KeyCRM Template Helper - Fixed
// @namespace    http://tampermonkey.net/
// @version      20.3
// @description  Додає панель з кнопками для вставки привітань та керування шаблонами. Підтримує транслітерацію імен з латиниці на кирилицю. Виправлена версія з гарантією показу кнопок.
// @author       You
// @match        *://*.keycrm.app/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';
    console.log(`KeyCRM Template Helper v${GM_info.script.version}: Скрипт запускається...`);

    /**
     * Settings module containing all configuration options for the KeyCRM Template Helper
     * @namespace SettingsModule
     */
    const SettingsModule = {
        // --- 🛠️ ГОЛОВНЕ НАЛАШТУВАННЯ (API КЛЮЧ) ---
        // Щоб активувати AI-функцію, отримайте безкоштовний ключ і вставте його сюди.
        // 1. Перейдіть на сайт -> https://aistudio.google.com/app/apikey
        // 2. Натисніть "Create API key in new project".
        // 3. Скопіюйте ключ, що з'явився, і вставте його нижче замість 'ВСТАВТЕ_ВАШ_API_КЛЮЧ_СЮДИ'.
        GEMINI_API_KEY: '', // <--- ВСТАВЛЯТИ КЛЮЧ ТІЛЬКИ СЮДИ
        // --- КІНЕЦЬ НАЛАШТУВАНЬ ---

        // --- Налаштування селекторів (оновлюйте за потреби) ---
        textAreaSelector: 'textarea.vac-textarea, textarea[name="message"], textarea[placeholder*="message"], textarea[placeholder*="відповідь"], textarea[placeholder*="відпов"], .vac-textarea textarea, .message-input textarea, .chat-input textarea, textarea[class*="input"], .textarea-container textarea',

        // Інші налаштування
        myName: 'Юрій',
        messageTemplate: 'Вітаю, _! Мене звуть _, служба підтримки KeyCRM😊',
        alternativeMessageTemplate: 'Вітаю! Мене звуть Юрій, служба підтримки KeyCRM😊\n\nЯк я можу до вас звертатись?',
        clientNameSelector: 'span[data-v-5b9ca00e].link.clickable',

        // --- 📝 КОНСТАНТИ ТА ЗМІННІ ДЛЯ ШАБЛОНІВ ---
        TEMPLATES_STORAGE_KEY: 'keycrmTemplates_v1',
        TEMPLATES_COLLAPSED_KEY: 'keycrmTemplates_collapsed',
        TEMPLATES_POSITION_KEY: 'keycrmTemplates_position',
        TEMPLATES_PANEL_ID: 'keycrm-templates-panel',
        MAX_Z_INDEX: 2147483647
    };

    /**
     * Icon module for managing custom icons and their styles
     * @namespace IconModule
     */
    const IconModule = {
        // Додавання CSS для іконок
        addIconStyles() {
            GM_addStyle(`
                .textarea-icon {
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-radius: 3px !important;
                    padding: 2px 7px !important;
                }

                .textarea-icon:hover {
                    background-color: rgba(0, 166, 242, 0.2) !important;  /* KeyCRM-like hover effect in dark theme */
                }

                #crm-greeting-button-custom-icon.inserted,
                #crm-templates-button-custom-icon.inserted {
                    animation: insertedAnimation 0.5s ease;
                }

                @keyframes insertedAnimation {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }
            `);
        }
    };


    /**
     * Template module for managing message templates
     * @namespace TemplatesModule
     */
    const TemplatesModule = {
        defaultTemplates: [
            // Загальні
            { title: "Привітання", text: "Вітаю! Мене звуть Юрій, служба підтримки KeyCRM😊", category: "Загальне", images: [] },
            { title: "Перевірка", text: "Дякую за звернення! Розгляну ваш запит та повернуся з відповіддю найближчим часом.", category: "Загальне", images: [] },
            { title: "Дякую", text: "Дякую за очікування! Якщо є додаткові питання - звертайтеся.", category: "Загальне", images: [] },
            { title: "Порада", text: "Раджу звернути увагу на налаштування вашого облікового запису для більш зручного використання системи.", category: "Загальне", images: [] },
        ],

        // Глобальні змінні для шаблонів
        currentTemplates: [],
        isTemplatesCollapsed: false,
        currentTemplateCategory: 'all',
        templateSearchQuery: '',

        // Завантаження та збереження шаблонів
        async loadTemplates() {
            let storedTemplates = await GM_getValue(SettingsModule.TEMPLATES_STORAGE_KEY, null);
            if (!storedTemplates) {
                await GM_setValue(SettingsModule.TEMPLATES_STORAGE_KEY, JSON.stringify(this.defaultTemplates));
                return this.defaultTemplates;
            }
            try {
                return JSON.parse(storedTemplates);
            } catch (e) {
                console.error('Error parsing stored templates, using defaults:', e);
                return this.defaultTemplates;
            }
        },

        async saveTemplates(templatesArray) {
            try {
                await GM_setValue(SettingsModule.TEMPLATES_STORAGE_KEY, JSON.stringify(templatesArray));
                this.currentTemplates = templatesArray;
                return true;
            } catch (e) {
                console.error('Error saving templates:', e);
                return false;
            }
        },

        async initializeTemplates() {
            this.currentTemplates = await this.loadTemplates();
        }
    };

    /**
     * Transliteration module for converting Latin names to Cyrillic
     * @namespace TranslitModule
     */
    const TranslitModule = {
        translitMap: {},

        defaultTranslitMap: {
            'Anastasiia': 'Анастасія', 'Anastasia': 'Анастасія', 'Anna': 'Анна', 'Daryna': 'Дарина', 'Hanna': 'Ганна', 'Iryna': 'Ірина', 'Ivanna': 'Іванна', 'Kateryna': 'Катерина', 'Katerina': 'Катерина', 'Khrystyna': 'Христина', 'Lidiya': 'Лідія', 'Mariya': 'Марія', 'Mariia': 'Марія', 'Maria': 'Марія', 'Marta': 'Марта', 'Nataliya': 'Наталія', 'Natalia': 'Наталія', 'Oksana': 'Оксана', 'Olena': 'Олена', 'Solomiia': 'Соломія', 'Sofiia': 'Софія', 'Sofiya': 'Софія', 'Tetiana': 'Тетяна', 'Tetyana': 'Тетяна', 'Viktoriia': 'Вікторія', 'Viktoriya': 'Вікторія', 'Yuliya': 'Юлія', 'Iuliia': 'Юлія', 'Julia': 'Юлія', 'Zoryana': 'Зоряна',
            'Andriy': 'Андрій', 'Andrii': 'Андрій', 'Andrey': 'Андрій', 'Artem': 'Артем', 'Bohdan': 'Богдан', 'Dmytro': 'Дмитро', 'Ivan': 'Іван', 'Maksym': 'Максим', 'Maxim': 'Максим', 'Mykola': 'Микола', 'Nazar': 'Назар', 'Oleksandr': 'Олександр', 'Olexandr': 'Олександр', 'Alexander': 'Олександр', 'Ostap': 'Остап', 'Rostyslav': 'Ростислав', 'Serhiy': 'Сергій', 'Serhii': 'Сергій', 'Sergey': 'Сергій', 'Taras': 'Тарас', 'Vasyl': 'Василь', 'Vladyslav': 'Владислав', 'Volodymyr': 'Володимир', 'Yuriy': 'Юрій', 'Yurii': 'Юрій',
            'Alla': 'Алла', 'Anya': 'Аня', 'Bazylia': 'Базилія', 'Biljana': 'Біл\'яна', 'Bogna': 'Богна', 'Borislava': 'Борислава', 'Bozena': 'Божена', 'Branislava': 'Бранислава', 'Branka': 'Бранка', 'Bratislava': 'Братислава', 'Bronislava': 'Бронислава', 'Bronislawa': 'Броніслава', 'Danka': 'Данка', 'Daria': 'Дарія', 'Dobroniega': 'Доброньєга', 'Dorota': 'Дорота', 'Doubravka': 'Добрівка', 'Dragana': 'Драгана', 'Dragica': 'Драгіца', 'Dunja': 'Дуня', 'Dusa': 'Дуса', 'Ekaterina': 'Єкатерина', 'Gaja': 'Гая', 'Gordana': 'Гордана', 'Hana': 'Хана', 'Ilyana': 'Іляна', 'Inna': 'Інна', 'Jagoda': 'Ягода', 'Jarmila': 'Ярміла', 'Jaroslava': 'Ярослава', 'Jaroslawa': 'Ярослава', 'Jasna': 'Ясна', 'Jindriska': 'Єндржішка', 'Kalina': 'Калина', 'Katya': 'Катя', 'Kveta': 'Квета', 'Lada': 'Лада', 'Lejla': 'Лейла', 'Ljiljana': 'Ліліана', 'Ljubica': 'Любіца', 'Lucia': 'Лючія', 'Lyubov': 'Любов', 'Marfa': 'Марфа', 'Marina': 'Марина', 'Merima': 'Меріма', 'Mieczуslawa': 'М\'єчислава', 'Mila': 'Міла', 'Milada': 'Мілада', 'Milena': 'Мілена', 'Milica': 'Міліца', 'Mira': 'Мира', 'Miroslava': 'Мірослава', 'Miroslawa': 'Мірослава', 'Nadezhda': 'Надія', 'Nadia': 'Надія', 'Natasha': 'Наташа', 'Nevena': 'Невена', 'Olga': 'Ольга', 'Polona': 'Полона', 'Radmila': 'Радміла', 'Radoslava': 'Радослава', 'Raisa': 'Раїса', 'Ruza': 'Ружа', 'Ruzica': 'Ружіца', 'Slavena': 'Славена', 'Snezana': 'Снєжана', 'Snezhana': 'Снєжана', 'Sonia': 'Соня', 'Stanislava': 'Станіслава', 'Svetlana': 'Світлана', 'Tanya': 'Таня', 'Tasha': 'Таша', 'Venceslava': 'Венцеслава', 'Viera': 'Вієра', 'Vlatka': 'Влатка', 'Wanda': 'Ванда', 'Yana': 'Яна', 'Yaroslava': 'Ярослава', 'Zdenka': 'Зденка', 'Zenaida': 'Зенайда', 'Zlata': 'Злата', 'Zora': 'Зора', 'Zorica': 'Зоріца', 'Zoya': 'Зоя',
            'Adam': 'Адам', 'Alexei': 'Олексій', 'Andrei': 'Андрій', 'Anton': 'Антон', 'Boris': 'Борис', 'Bozidar': 'Божидар', 'Branimir': 'Бранімір', 'Branislav': 'Браніслав', 'Bronislav': 'Броніслав', 'Cyril': 'Костянтин', 'Damian': 'Даміан', 'Darko': 'Дарко', 'David': 'Давид', 'Dimitri': 'Дмитрій', 'Dobromir': 'Добромир', 'Dragoslav': 'Драгослав', 'Filip': 'Філіп', 'Frantisek': 'Франтішек', 'Goran': 'Горан', 'Grzegorz': 'Ґжеґорж', 'Igor': 'Ігор', 'Janko': 'Янко', 'Jaroslav': 'Ярослав', 'Jiri': 'Єрі', 'Jozef': 'Йозеф', 'Juraj': 'Юрій', 'Karel': 'Карел', 'Konstantin': 'Костянтин', 'Ladislav': 'Ладислав', 'Luka': 'Лука', 'Lukas': 'Лукаш', 'Marcin': 'Марчін', 'Marek': 'Марек', 'Marian': 'Маріан', 'Matej': 'Матій', 'Matus': 'Матуш', 'Mihajlo': 'Михайло', 'Milan': 'Мілан', 'Milos': 'Мілош', 'Miroslav': 'Мірослав', 'Mladen': 'Младен', 'Nikola': 'Микола', 'Ondrej': 'Ондрей', 'Oleg': 'Олег', 'Pavel': 'Павло', 'Peter': 'Петро', 'Radomir': 'Радомир', 'Radovan': 'Радован', 'Ratko': 'Ратко', 'Roman': 'Роман', 'Rostislav': 'Ростислав', 'Stanislav': 'Станіслав', 'Stefan': 'Степан', 'Tomas': 'Томаш', 'Valentin': 'Валентин', 'Vaclav': 'Вацлав', 'Vasil': 'Василь', 'Vlastimil': 'Владислав', 'Vladimir': 'Володимир', 'Vojtech': 'Войтєх', 'Yuri': 'Юрій', 'Zdenek': 'Зденек', 'Zeljko': 'Желько', 'Anatoly': 'Анатолій', 'Danylo': 'Данило', 'Fedir': 'Федір', 'Hennadiy': 'Геннадій', 'Heorhiy': 'Георгій', 'Herman': 'Герман', 'Hlib': 'Гліб', 'Hryhoriy': 'Григорій', 'Kyrylo': 'Кирило', 'Leonid': 'Леонід', 'Lyubomir': 'Любомир', 'Milovan': 'Мілован', 'Musiy': 'Мусій', 'Mykhailo': 'Михайло', 'Mykyta': 'Микита', 'Myron': 'Мирон', 'Myroslav': 'Мирослав', 'Nectarios': 'Нектарій', 'Neven': 'Невен', 'Nikita': 'Нікіта', 'Oles': 'Олесь', 'Panteleimon': 'Пантелеймон', 'Pavsikakiy': 'Павсикакій', 'Petro': 'Петро', 'Pinkhus': 'Пінхус', 'Pylyp': 'Філіп', 'Ratimir': 'Ратимир', 'Severyn': 'Северин', 'Slava': 'Слава', 'Sobieslaw': 'Собіслав', 'Stanimir': 'Станімір', 'Stepan': 'Степан', 'Sviatoslav': 'Святослав', 'Symon': 'Симон', 'Vadym': 'Вадим', 'Valentyn': 'Валентин', 'Veniamin': 'Веніамін', 'Veselin': 'Веселін', 'Victor': 'Віктор', 'Vitalii': 'Віталій', 'Vitomir': 'Вітомир', 'Vsevolod': 'Всеволод', 'Vukasin': 'Вукашин', 'Vukmir': 'Вукмір', 'Vyacheslav': 'В\'ячеслав', 'Yakiv': 'Яків', 'Yarko': 'Ярко', 'Yegor': 'Єгор', 'Yevgen': 'Євген', 'Yevhen': 'Євген', 'Yukhym': 'Юхим', 'Yury': 'Юрій', 'Ahafiia': 'Агафія', 'Anhelina': 'Ангеліна', 'Anzhelika': 'Анжеліка', 'Ariadna': 'Аріадна', 'Bilooka': 'Білоока', 'Bohdana': 'Богдана', 'Chrystia': 'Христа', 'Daiana': 'Даяна', 'Dariia': 'Дарія', 'Darija': 'Дарія', 'Halyna': 'Галина', 'Irena': 'Ірина', 'Kalyna': 'Калина', 'Kekyliia': 'Кекилія', 'Kira': 'Кіра', 'Klymentyna': 'Клементина', 'Kvitoslava': 'Квітослава', 'Larysa': 'Лариса', 'Lesia': 'Лесія', 'Lidiia': 'Лідія', 'Liubov': 'Любов', 'Liudmyla': 'Людмила', 'Maiia': 'Майя', 'Maryna': 'Марина', 'Motrona': 'Мотрона', 'Mykhailyna': 'Михайліна', 'Myroslava': 'Мірослава', 'Nadiia': 'Надія', 'Nadiya': 'Надія', 'Natalka': 'Наталка', 'Neonila': 'Неоніла', 'Oleksandra': 'Олександра', 'Olesia': 'Олесія', 'Olha': 'Ольга', 'Oresta': 'Ореста', 'Orysia': 'Орися', 'Ruslana': 'Русалана', 'Serafima': 'Серафіма', 'Severyna': 'Северина', 'Stefaniia': 'Стефанія', 'Svitlana': 'Світлана', 'Teodoziia': 'Теодозія', 'Valentyna': 'Валентина', 'Valeryya': 'Валерія', 'Vasylyna': 'Василіна', 'Vira': 'Віра', 'Volodymyra': 'Володимира', 'Vozna': 'Візна', 'Vytvytska': 'Витвицька', 'Yanina': 'Яніна', 'Yaryna': 'Ярина', 'Yevdokiia': 'Євдокія', 'Yevheniia': 'Євгенія', 'Zinaida': 'Зінаїда',
        },

        async initializeTranslitMap() {
            const customTranslitMap = await GM_getValue('customTranslitMap', {});
            this.translitMap = { ...this.defaultTranslitMap, ...customTranslitMap };
            console.log('KeyCRM Template Helper: Словник імен завантажено.');
        }
    };

    /**
     * Keyboard module for managing keyboard shortcuts
     * @namespace KeyboardModule
     */
    const KeyboardModule = {
        // Спрощений обробник клавіатури
        initializeKeyboardShortcuts() {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
        },

        // Спрощений обробник натискання клавіш
        handleKeyDown(e) {
            // Комбінація Ctrl+Alt+T для відкриття панелі шаблонів (відновлена)
            if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 't') {
                e.preventDefault();
                // Using the function defined below in the scope
                if (typeof showTemplatesPanel === 'function') {
                    showTemplatesPanel();
                }
            }
        }
    };

    /**
     * Interface module for managing UI interactions
     * @namespace InterfaceModule
     */
    const InterfaceModule = {
        // Function to simulate inactive tab to bypass chat time limits (removed as per requirements)
    };


    // Adding CSS styles for the UI elements
    GM_addStyle(`
        .template-actions {
            display: flex;
            gap: 5px;
            flex-direction: column;
            align-items: flex-end;
        }

        .edit-template-btn,
        .delete-template-btn {
            background-color: #6c757d;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }

        .edit-template-btn:hover {
            background-color: #5a6268;
        }

        .delete-template-btn:hover {
            background-color: #dc3545;
        }

        .no-templates {
            text-align: center;
            padding: 20px;
            color: #888;
            font-style: italic;
        }

        .templates-filter {
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .templates-filter label {
            font-weight: bold;
            color: #333;
        }

        .templates-filter select {
            padding: 6px 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: white;
        }

        /* Name Choice Modal Styles - Dark Theme */
        .name-choice-content {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .name-choice-content p {
            margin: 0 0 10px 0;
            color: #dee0e4;  /* Light gray text for dark theme */
            font-size: 14px;
        }

        .name-input-field {
            padding: 10px 12px;
            border: 1px solid #5b5b5b;  /* Darker border */
            border-radius: 6px;
            font-size: 14px;
            width: 100%;
            box-sizing: border-box;
            background-color: #3e3e3f;  /* Dark background */
            color: #ddd;  /* Light text */
        }

        .name-input-field:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .name-choice-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .name-choice-btn-primary,
        .name-choice-btn-secondary,
        .name-choice-btn-cancel {
            padding: 10px 15px;
            border: 1px solid transparent;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }

        .name-choice-btn-primary {
            background-color: #007bff;
            color: white;
        }

        .name-choice-btn-primary:hover {
            background-color: #0056b3;
        }

        .name-choice-btn-secondary {
            background-color: #28a745;  /* Green like the original */
            color: white;
        }

        .name-choice-btn-secondary:hover {
            background-color: #1e7e34;
        }

        .name-choice-btn-cancel {
            background-color: #444445;  /* Dark gray like KeyCRM */
            color: #ddd;  /* Light text */
            border: 1px solid #5b5b5b;  /* Darker border */
        }

        .name-choice-btn-cancel:hover {
            background-color: #4a4a4b;
        }

        /* General Modal Styles - Dark Theme */
        .crm-helper-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);  /* Darker overlay */
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        }

        .crm-helper-modal {
            position: relative;
            background: #303031;  /* Dark background color from KeyCRM */
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);  /* Darker shadow */
            border: 1px solid #5b5b5b;  /* Darker border */
        }

        .crm-helper-modal h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #eee;  /* Light text for dark theme */
            font-size: 18px;
            font-weight: 600;
        }

        .crm-modal-buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        .crm-modal-btn-primary {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }

        .crm-modal-btn-primary:hover {
            background-color: #0056b3;
        }

        .crm-modal-btn-close {
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #aeafb3;  /* Darker gray for contrast */
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        }

        .crm-modal-btn-close:hover {
            background-color: #444445;  /* Dark hover background */
            color: white;  /* White text on hover */
        }

        /* Template Panel Styles - Dark Theme */
        .keycrm-templates-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);  /* Darker overlay */
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }

        .keycrm-templates-panel {
            position: relative;
            background: #303031;  /* Dark background color from KeyCRM */
            border-radius: 8px;
            padding: 16px;  /* Reduced padding */
            max-width: 600px;
            width: 90%;
            max-height: 90vh;  /* Increased height */
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 1px solid #5b5b5b;  /* Darker border */
        }

        .templates-list-container {
            max-height: 70vh;  /* Increased height */
            overflow-y: auto;
            margin-bottom: 15px;
        }

        .templates-list-simple {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .template-item-list {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px;  /* Further reduced padding */
            border: 1px solid #5b5b5b;  /* Darker border */
            border-radius: 4px;  /* Reduced border radius */
            margin-bottom: 3px;  /* Further reduced margin */
            background-color: #3e3e3f;  /* Dark background */
            cursor: pointer;
            transition: background-color 0.2s;
            color: #ddd;  /* Light text */
        }

        .template-item-list:hover {
            background-color: #444445;  /* Darker on hover */
        }

        .template-info {
            flex: 1;
            padding: 2px 0; /* Add minimal internal padding */
            white-space: nowrap;  /* Single line */
            overflow: hidden;     /* Hide overflow */
            text-overflow: ellipsis; /* Show ellipsis for overflow */
        }

        .template-title {
            font-weight: bold;
            margin-bottom: 1px;  /* Further reduced margin */
            color: #eee;  /* Light color */
        }

        .template-preview {
            font-size: 11px;  /* Even smaller font */
            color: #aeafb3;  /* Medium gray */
            white-space: nowrap;  /* Single line */
            overflow: hidden;   /* Hide overflow */
            text-overflow: ellipsis; /* Show ellipsis for overflow */
            margin-bottom: 1px;  /* Add small margin */
        }

        .template-meta {
            font-size: 9px;  /* Even smaller font */
            color: #888;  /* Darker gray */
            white-space: nowrap;  /* Single line */
            overflow: hidden;   /* Hide overflow */
            text-overflow: ellipsis; /* Show ellipsis for overflow */
        }

        .template-item-list.drag-over {
            border: 2px dashed #007bff;
            background-color: rgba(0, 123, 255, 0.1);
        }


        .template-actions {
            display: flex;
            gap: 5px;
            flex-direction: column;
            align-items: flex-end;
        }

        .edit-template-btn,
        .delete-template-btn {
            background-color: #6c757d;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }

        .edit-template-btn:hover {
            background-color: #5a6268;
        }

        .delete-template-btn:hover {
            background-color: #dc3545;
        }

        .no-templates {
            text-align: center;
            padding: 20px;
            color: #aeafb3;  /* Medium gray */
            font-style: italic;
        }

        .templates-filter {
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .templates-filter label {
            font-weight: bold;
            color: #eee;  /* Light color */
        }

        .templates-filter select {
            padding: 6px 10px;
            border: 1px solid #5b5b5b;  /* Darker border */
            border-radius: 4px;
            background-color: #3e3e3f;  /* Dark background */
            color: #ddd;  /* Light text */
        }
    `);

    // Функції іконок більше не потрібні - використовуємо прості символи прямо в кнопках
    // + для привітань
    // ≡ для шаблонів


    /**
     * Capitalizes the first letter of a string while making the rest lowercase
     * @param {string} string - The input string to capitalize
     * @returns {string} - The capitalized string or empty string if input is invalid
     */
    function capitalizeFirstLetter(string) {
        if (!string || typeof string !== 'string') return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    /**
     * Inserts text into the active textarea element
     * @param {string} text - The text to insert into the textarea
     */
    function insertTextIntoTextarea(text) {
        const textArea = document.querySelector(SettingsModule.textAreaSelector);
        if (!textArea) {
            console.error('KeyCRM Template Helper: Не вдалося знайти поле для вводу.');
            if (typeof showEnhancedNotification !== 'undefined') {
                showEnhancedNotification('Не вдалося знайти поле для вводу.', 'error');
            }
            return;
        }
        textArea.value = text;
        textArea.dispatchEvent(new Event('input', { bubbles: true }));
        textArea.focus();

        // Оновлено для підтримки обох кнопок
        const greetingButton = document.getElementById('crm-greeting-button-custom-icon');
        const templatesButton = document.getElementById('crm-templates-button-custom-icon');
        if (greetingButton) {
            greetingButton.classList.add('inserted');
            setTimeout(() => greetingButton.classList.remove('inserted'), 1500);
        }
        if (templatesButton) {
            templatesButton.classList.add('inserted');
            setTimeout(() => templatesButton.classList.remove('inserted'), 1500);
        }
    }

    // Видалено функцію вставки зображень для стабільності

    function showHelpModal(title, content) {
        if (document.querySelector('.crm-helper-overlay')) return;
        const modalHTML = `
            <div id="help-modal-overlay" class="crm-helper-overlay">
                <div id="help-modal" class="crm-helper-modal">
                    <h3>${title}</h3>
                    <button id="help-modal-close-btn" class="crm-modal-btn-close">&times;</button>
                    ${content}
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const closeModal = () => document.getElementById('help-modal-overlay')?.remove();
        document.getElementById('help-modal-close-btn').onclick = closeModal;
        document.getElementById('help-modal-overlay').onclick = (e) => {
            if (e.target.id === 'help-modal-overlay') closeModal();
        };
    }

    function showNameChoiceModal(detectedName = '') {
        const content = `
            <div class="name-choice-content">
                <p>Ви можете виправити ім'я вручну або вставити шаблон-запит.</p>
                <input type="text" id="name-input" class="name-input-field" placeholder="Введіть ім'я..." value="${detectedName}">
                <div class="name-choice-buttons">
                    <button id="insert-with-name-btn" class="name-choice-btn-primary">Вставити з цим іменем</button>
                    <button id="insert-alternative-btn" class="name-choice-btn-secondary">Запитати ім'я</button>
                </div>
            </div>`;
        showHelpModal("Ім'я не розпізнано", content);

        const closeModal = () => document.getElementById('help-modal-overlay')?.remove();
        document.getElementById('insert-with-name-btn').onclick = () => {
            const nameInput = document.getElementById('name-input');
            const finalName = nameInput.value.trim();

            if (!finalName) {
                showEnhancedNotification('Поле імені не може бути порожнім.', 'error');
                nameInput.focus();
                return;
            }

            // Validate name input - only allow alphabetic characters, spaces, and common name characters
            if (!/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s\-']+$/u.test(finalName)) {
                showEnhancedNotification('Неприпустимі символи в імені.', 'error');
                nameInput.focus();
                return;
            }

            // Check for reasonable length
            if (finalName.length > 50) {
                showEnhancedNotification('Ім\'я занадто довге.', 'error');
                nameInput.focus();
                return;
            }

            const finalMessage = SettingsModule.messageTemplate.replace('_', capitalizeFirstLetter(finalName)).replace('_', SettingsModule.myName);
            insertTextIntoTextarea(finalMessage);
            closeModal();
        };
        document.getElementById('insert-alternative-btn').onclick = () => {
            insertTextIntoTextarea(SettingsModule.alternativeMessageTemplate);
            closeModal();
        };

        // Allow clicking the X button to close
        const xButton = document.querySelector('#help-modal .crm-modal-btn-close');
        if (xButton) {
            xButton.onclick = closeModal;
        }

        // Focus on the input field when modal opens
        setTimeout(() => {
            const nameInput = document.getElementById('name-input');
            if (nameInput) {
                nameInput.focus();
                nameInput.select(); // Select all text for easy editing
            }
        }, 100);
    }

    // --- 📝 ФУНКЦІЇ ДЛЯ РОБОТИ З ШАБЛОНАМИ ---
    // Спрощені функції для вставки шаблону без зображень
    function insertTemplateText(text) {
        const textArea = document.querySelector(SettingsModule.textAreaSelector);
        if (!textArea) {
            console.error('KeyCRM Template Helper: Не вдалося знайти поле для вводу.');
            if (typeof showEnhancedNotification !== 'undefined') {
                showEnhancedNotification('Не вдалося знайти поле для вводу.', 'error');
            }
            return;
        }

        try {
            // Додаємо текст шаблону
            textArea.value = text;
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
            textArea.focus();
        } catch(e) {
            console.error('Помилка під час вставки шаблону', e);
            if (typeof showEnhancedNotification !== 'undefined') {
                showEnhancedNotification('Помилка під час вставки шаблону', 'error');
            }
        }
    }

    // Видалено заглушку функції showEnhancedNotification - вона реалізована в кінці файлу

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- ФУНКЦІЇ ДЛЯ КЕРУВАННЯ ШАБЛОНАМИ ---
    // Використовуємо функції, визначені вище

    // Ініціалізація шаблонів
    /**
     * Processes client name and inserts appropriate greeting message
     * Tries to transliterate the name if needed, and falls back to manual input if name is unknown
     */
    function processAndInsertMessage() {
        const nameElement = document.querySelector(SettingsModule.clientNameSelector);
        if (!nameElement || !nameElement.textContent?.trim()) {
            console.warn('KeyCRM Template Helper: Ім\'я клієнта не знайдено. Показую вікно вибору.');
            showNameChoiceModal();
            return;
        }

        const rawFullName = nameElement.textContent.trim().split(/[\/\\]/)[0].trim();
        const rawFirstName = rawFullName.split(' ')[0];
        const preparedName = capitalizeFirstLetter(rawFirstName);
        let finalName = TranslitModule.translitMap[preparedName] || preparedName;
        const isCyrillic = /[а-яА-ЯІіЇїЄєҐґ]/.test(finalName);

        if (isCyrillic) {
            // Check if the Cyrillic name was found in the translitMap
            const isKnownCyrillic = TranslitModule.translitMap[preparedName] !== undefined;
            if (isKnownCyrillic) {
                finalName = capitalizeFirstLetter(finalName);
                const finalMessage = SettingsModule.messageTemplate.replace('_', finalName).replace('_', SettingsModule.myName);
                insertTextIntoTextarea(finalMessage);
            } else {
                // Cyrillic name not in dictionary, show choice modal
                console.log(`KeyCRM Template Helper: Невідоме кириличне ім'я "${finalName}". Показую вікно вибору.`);
                showNameChoiceModal(finalName);
            }
        } else {
            console.log(`KeyCRM Template Helper: Ім'я "${finalName}" не розпізнано. Показую вікно вибору.`);
            showNameChoiceModal(finalName);
        }
    }

    function showAddTranslitModal() {
        const content = `
            <div class="name-choice-content">
                <p>Введіть варіант імені латиницею та його відповідник кирилицею.</p>
                <input type="text" id="latin-input" class="name-input-field" placeholder="Латиниця (напр., 'Ksu')">
                <input type="text" id="cyrillic-input" class="name-input-field" placeholder="Кирилиця (напр., 'Ксю')">
                <div class="name-choice-buttons">
                    <button id="translit-save-btn" class="name-choice-btn-primary">Зберегти</button>
                    <button id="translit-cancel-btn" class="name-choice-btn-cancel">Скасувати</button>
                </div>
            </div>`;
        showHelpModal("Додати нову транслітерацію", content);

        const closeModal = () => document.getElementById('help-modal-overlay')?.remove();
        document.getElementById('translit-save-btn').onclick = async () => {
            const latin = document.getElementById('latin-input').value.trim();
            const cyrillic = document.getElementById('cyrillic-input').value.trim();
            if (latin && cyrillic) {
                const preparedLatin = capitalizeFirstLetter(latin);
                const customMap = await GM_getValue('customTranslitMap', {});
                customMap[preparedLatin] = cyrillic;
                await GM_setValue('customTranslitMap', customMap);
                await TranslitModule.initializeTranslitMap();
                console.log(`KeyCRM Template Helper: Збережено: ${preparedLatin} -> ${cyrillic}`);
                closeModal();
            } else {
                alert('Будь ласка, заповніть обидва поля.');
            }
        };
        document.getElementById('translit-cancel-btn').onclick = closeModal;

        // Also allow clicking the X button to close
        const xButton = document.querySelector('#help-modal .crm-modal-btn-close');
        if (xButton) {
            xButton.onclick = closeModal;
        }

        // Focus on the first input field when modal opens
        setTimeout(() => {
            const latinInput = document.getElementById('latin-input');
            if (latinInput) {
                latinInput.focus();
            }
        }, 100);
    }


    // Відображення списку шаблонів
    function renderTemplateList(listElement, filterCategory = 'all') {
        if (!listElement) return;
        listElement.innerHTML = '';

        const filteredTemplates = filterCategory === 'all'
            ? TemplatesModule.currentTemplates
            : TemplatesModule.currentTemplates.filter(t => (t.category || 'Загальне') === filterCategory);

        if (filteredTemplates.length === 0) {
            listElement.innerHTML = '<li class="no-templates">Немає шаблонів у цій категорії.</li>';
            return;
        }

        filteredTemplates.forEach((template, i) => {
            const globalIndex = TemplatesModule.currentTemplates.indexOf(template);
            const listItem = document.createElement('li');
            listItem.className = 'template-item-list';
            listItem.draggable = true;  // Make the item draggable
            listItem.setAttribute('data-index', globalIndex);  // Store the index
            listItem.innerHTML = `
                <div class="template-info">
                    <div class="template-title" title="${escapeHtml(template.text)}">${escapeHtml(template.title)}</div>
                    <div class="template-preview">${escapeHtml(template.text.substring(0, 80))}${template.text.length > 80 ? '...' : ''}</div>
                    <div class="template-meta">${escapeHtml(template.category || 'Загальне')}</div>
                </div>
                <div class="template-actions">
                    <button class="edit-template-btn" data-index="${globalIndex}">Редагувати</button>
                    <button class="delete-template-btn" data-index="${globalIndex}">Видалити</button>
                </div>
            `;
            listElement.appendChild(listItem);

            // Додати обробник для кнопки редагування
            listItem.querySelector('.edit-template-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                const tpl = TemplatesModule.currentTemplates[idx];
                showAddEditTemplateModal(tpl, idx); // Pass template and index for editing
            });

            // Додати обробник для кнопки видалення
            listItem.querySelector('.delete-template-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                if (confirm('Ви впевнені, що хочете видалити цей шаблон?')) {
                    TemplatesModule.currentTemplates.splice(idx, 1);
                    TemplatesModule.saveTemplates(TemplatesModule.currentTemplates);
                    showEnhancedNotification('Шаблон видалено успішно!', 'success');
                    // Refresh the template list
                    renderTemplateList(listElement, filterCategory);
                }
            });

            // Додати обробник на клік по всьому елементу (крім кнопок)
            listItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('edit-template-btn') &&
                    !e.target.classList.contains('delete-template-btn')) {
                    const idx = globalIndex;
                    const tpl = TemplatesModule.currentTemplates[idx];
                    insertTemplateText(tpl.text);
                    // Закриваємо модальне вікно
                    const modal = document.querySelector('.keycrm-templates-overlay');
                    if (modal) modal.remove();
                }
            });

            // Додати обробники подій для перетягування
            listItem.addEventListener('dragstart', handleDragStart);
            listItem.addEventListener('dragover', handleDragOver);
            listItem.addEventListener('dragenter', handleDragEnter);
            listItem.addEventListener('dragleave', handleDragLeave);
            listItem.addEventListener('drop', handleDrop);
            listItem.addEventListener('dragend', handleDragEnd);
        });
    }

    // Drag and drop functionality handlers
    let draggedItem = null;

    function handleDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        this.style.opacity = '0.6';
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        this.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        try {
            if (draggedItem != this) {
                // Swap the templates in the array
                const draggedIndex = parseInt(draggedItem.getAttribute('data-index'));
                const targetIndex = parseInt(this.getAttribute('data-index'));

                // Validate indices
                if (isNaN(draggedIndex) || isNaN(targetIndex)) {
                    console.error('Invalid drag/drop indices');
                    return false;
                }

                // Check if indices are within bounds
                if (draggedIndex < 0 || draggedIndex >= TemplatesModule.currentTemplates.length ||
                    targetIndex < 0 || targetIndex >= TemplatesModule.currentTemplates.length) {
                    console.error('Drag/drop indices out of bounds');
                    return false;
                }

                // Update the array order
                const draggedTemplate = TemplatesModule.currentTemplates[draggedIndex];
                const targetTemplate = TemplatesModule.currentTemplates[targetIndex];

                // Swap positions in the array
                TemplatesModule.currentTemplates[draggedIndex] = targetTemplate;
                TemplatesModule.currentTemplates[targetIndex] = draggedTemplate;

                // Save the updated order
                const saveSuccess = TemplatesModule.saveTemplates(TemplatesModule.currentTemplates);
                if (!saveSuccess) {
                    showEnhancedNotification('Помилка збереження порядку шаблонів!', 'error');
                    return false;
                }

                // Re-render the list with the new order
                const listElement = document.getElementById('templates-list-simple');
                const filterCategory = document.getElementById('category-filter') ? document.getElementById('category-filter').value : 'all';
                renderTemplateList(listElement, filterCategory);

                showEnhancedNotification('Порядок шаблонів змінено!', 'success');
            }
        } catch (error) {
            console.error('Error during drag/drop operation:', error);
            showEnhancedNotification('Помилка під час зміни порядку шаблонів!', 'error');
        }

        return false;
    }

    function handleDragEnd(e) {
        draggedItem = null;
        document.querySelectorAll('.template-item-list').forEach(item => {
            item.style.opacity = '1';
            item.classList.remove('drag-over');
        });
    }

    // Функція для показу панелі шаблонів
    function showTemplatesPanel() {
        // Якщо панель вже існує, просто закриваємо її
        let existingPanel = document.querySelector('.keycrm-templates-overlay');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }

        // Створюємо спрощену панель шаблонів як модальне вікно
        const overlay = document.createElement('div');
        overlay.className = 'keycrm-templates-overlay';

        const panel = document.createElement('div');
        panel.className = 'keycrm-templates-panel';

        // Заголовок - видаляємо для чистоти інтерфейсу
        // const title = document.createElement('h3');
        // title.textContent = 'Шаблони';
        // title.style.cssText = `
        //     margin-top: 0;
        //     margin-bottom: 20px;
        //     font-weight: 600;
        //     color: #191b1f;
        //     font-size: 18px;
        // `;

        // Кнопка закриття
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #8a8d96;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        `;
        closeButton.onclick = () => overlay.remove();
        closeButton.onmouseenter = () => closeButton.style.backgroundColor = '#f5f7fa';
        closeButton.onmouseleave = () => closeButton.style.backgroundColor = 'transparent';

        // Контейнер для фільтра
        const filterContainer = document.createElement('div');
        filterContainer.className = 'templates-filter';
        filterContainer.innerHTML = `
            <label for="category-filter">Фільтр:</label>
            <select id="category-filter">
                <option value="all">Всі категорії</option>
            </select>
        `;

        // Заповнюємо категорії
        const categoryFilterSelect = filterContainer.querySelector('#category-filter');
        const categories = new Set();
        TemplatesModule.currentTemplates.forEach(template => {
            categories.add(template.category || 'Загальне');
        });
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilterSelect.appendChild(option);
        });

        // Контейнер для списку шаблонів
        const templatesListContainer = document.createElement('div');
        templatesListContainer.className = 'templates-list-container';
        templatesListContainer.innerHTML = '<ul id="templates-list-simple" class="templates-list-simple"></ul>';

        // Додати кнопки імпорту/експорту та додавання
        const actionsContainer = document.createElement('div');
        actionsContainer.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            justify-content: center;
        `;

        const exportButton = document.createElement('button');
        exportButton.textContent = 'Експорт';
        exportButton.className = 'name-choice-btn-secondary';
        exportButton.style.cssText = `
            padding: 8px 16px;
            font-size: 13px;
        `;
        exportButton.onclick = (e) => {
            e.stopPropagation();
            exportTemplates();
        };

        const importButton = document.createElement('button');
        importButton.textContent = 'Імпорт';
        importButton.className = 'name-choice-btn-primary';
        importButton.style.cssText = `
            padding: 8px 16px;
            font-size: 13px;
        `;
        importButton.onclick = (e) => {
            e.stopPropagation();
            importTemplates();
        };

        const addTemplateButton = document.createElement('button');
        addTemplateButton.textContent = 'Додати';
        addTemplateButton.className = 'name-choice-btn-primary';
        addTemplateButton.style.cssText = `
            padding: 8px 16px;
            font-size: 13px;
        `;
        addTemplateButton.onclick = (e) => {
            e.stopPropagation();
            showAddEditTemplateModal();  // Function to add/edit templates
        };

        actionsContainer.appendChild(addTemplateButton);
        actionsContainer.appendChild(exportButton);
        actionsContainer.appendChild(importButton);

        // Додаємо елементи до панелі
        panel.appendChild(closeButton);
        // panel.appendChild(title);  // Title has been removed
        panel.appendChild(actionsContainer);  // Add the import/export buttons
        panel.appendChild(filterContainer);
        panel.appendChild(templatesListContainer);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // Додати обробник для закриття при кліку поза панеллю
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Відображення списку шаблонів
        const listElement = document.getElementById('templates-list-simple');
        renderTemplateList(listElement);

        // Додаємо обробник для фільтра
        categoryFilterSelect.addEventListener('change', () => {
            const selectedCategory = categoryFilterSelect.value;
            renderTemplateList(listElement, selectedCategory);
        });
    }


    function insertTemplateButton(textareaContainer) {
        console.log('KeyCRM Template Helper: Виконую insertTemplateButton для контейнера:', textareaContainer);

        // Check if our buttons already exist in the container to avoid duplicates
        const existingGreetingBtn = textareaContainer.querySelector('#crm-greeting-button-custom-icon');
        const existingTemplatesBtn = textareaContainer.querySelector('#crm-templates-button-custom-icon');

        console.log(`Кнопки вже існують: greeting=${!!existingGreetingBtn}, templates=${!!existingTemplatesBtn}`);

        // Create any missing buttons
        if (!existingGreetingBtn) {
            console.log('KeyCRM Template Helper: Створюю кнопку привітання');
            createGreetingButton(textareaContainer);
        }
        if (!existingTemplatesBtn) {
            console.log('KeyCRM Template Helper: Створюю кнопку шаблонів');
            createTemplatesButton(textareaContainer);
        }
    }

    // Function to create the greeting button
    function createGreetingButton(textareaContainer) {
        // Check if greeting button already exists
        if (textareaContainer.querySelector('#crm-greeting-button-custom-icon')) {
            return;
        }

        let pressTimer;

        // Create a div element like the original icons (not a button) for greeting
        const greetingIconContainer = document.createElement('div');
        greetingIconContainer.id = 'crm-greeting-button-custom-icon';
        greetingIconContainer.className = 'textarea-icon';
        greetingIconContainer.setAttribute('data-v-31f5263f', '');
        greetingIconContainer.title = 'Вставити привітання (утримуйте для налаштувань)';
        greetingIconContainer.style.cssText =
            'display: inline-flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            'width: auto;' +
            'height: auto;' +
            'padding: 2px 7px;' +
            'border-radius: 3px;' +
            'background-color: #3e3e3f;' +  // Dark background matching KeyCRM theme
            'cursor: pointer;' +
            'font-size: 18px;' +
            'font-weight: bold;' +
            'color: #4daafc;' +  // Light blue for contrast in dark theme
            'margin-left: 8px;' +
            'transition: all 0.2s ease;' +
            'user-select: none;' +
            'border: none;';

        // Hand icon for greeting - just plain text
        greetingIconContainer.textContent = '+';

        // Add click functionality to the greeting container
        greetingIconContainer.addEventListener('click', () => processAndInsertMessage());

        // Add long press functionality for greeting settings
        greetingIconContainer.addEventListener('mousedown', () => {
            pressTimer = setTimeout(() => {
                showAddTranslitModal();
                greetingIconContainer.style.backgroundColor = 'rgba(0, 102, 204, 0.5)';  /* Darker blue with transparency for long press */
            }, 800);
        });

        // Add hover effects - matching KeyCRM style
        greetingIconContainer.addEventListener('mouseenter', () => {
            greetingIconContainer.style.backgroundColor = 'rgba(0, 166, 242, 0.2)';  /* Light blue transparent like hover effect in dark theme */
        });

        greetingIconContainer.addEventListener('mouseleave', () => {
            greetingIconContainer.style.backgroundColor = '#3e3e3f';  /* Original dark background */
            if (pressTimer) {
                clearTimeout(pressTimer);
            }
        });

        // Clear timer on mouse up
        greetingIconContainer.addEventListener('mouseup', () => {
            clearTimeout(pressTimer);
            // Only reset if not hovering (to maintain hover state)
            if (!greetingIconContainer.matches(':hover')) {
                greetingIconContainer.style.backgroundColor = '#3e3e3f';  /* Reset to dark theme background */
            }
        });

        // Ensure the button is visible by setting explicit display properties
        greetingIconContainer.style.display = 'inline-flex';
        greetingIconContainer.style.alignItems = 'center';
        greetingIconContainer.style.justifyContent = 'center';

        // Find the microphone icon's parent div with class textarea-icon
        const microphoneIcon = textareaContainer.querySelector('.key-icon--microphone');
        if (microphoneIcon && microphoneIcon.closest('.textarea-icon')) {
            const microphoneContainer = microphoneIcon.closest('.textarea-icon');

            // Add the greeting icon after the microphone container
            microphoneContainer.after(greetingIconContainer);
        } else {
            // Try to add to various possible containers in order of preference
            const possibleSelectors = [
                '.vac-icon-textarea',
                '.textarea-icons',
                '.icon-container',
                '.actions-container',
                '.message-actions'
            ];

            let added = false;
            for (const selector of possibleSelectors) {
                const container = textareaContainer.querySelector(selector);
                if (container) {
                    container.appendChild(greetingIconContainer);
                    added = true;
                    break;
                }
            }

            // If no specific container found, append to the container directly
            if (!added) {
                textareaContainer.appendChild(greetingIconContainer);
            }
        }
    }

    // Function to create the templates button
    function createTemplatesButton(textareaContainer) {
        // Check if templates button already exists
        if (textareaContainer.querySelector('#crm-templates-button-custom-icon')) {
            return;
        }

        // Create a div element for the templates button
        const templatesIconContainer = document.createElement('div');
        templatesIconContainer.id = 'crm-templates-button-custom-icon';
        templatesIconContainer.className = 'textarea-icon';
        templatesIconContainer.setAttribute('data-v-31f5263f', '');
        templatesIconContainer.title = 'Шаблони (Ctrl+Alt+T)';
        templatesIconContainer.style.cssText =
            'display: inline-flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            'width: auto;' +
            'height: auto;' +
            'padding: 2px 7px;' +
            'border-radius: 3px;' +
            'background-color: #3e3e3f;' +  // Dark background matching KeyCRM theme
            'cursor: pointer;' +
            'font-size: 18px;' +
            'font-weight: bold;' +
            'color: #51cf66;' +  // Light green for contrast in dark theme
            'margin-left: 8px;' +
            'transition: all 0.2s ease;' +
            'user-select: none;' +
            'border: none;';

        // Note icon for templates - just plain text
        templatesIconContainer.textContent = '≡';

        // Add click functionality to the templates container
        templatesIconContainer.addEventListener('click', () => showTemplatesPanel());

        // Add hover effects for templates button - matching KeyCRM style
        templatesIconContainer.addEventListener('mouseenter', () => {
            templatesIconContainer.style.backgroundColor = 'rgba(0, 166, 242, 0.2)';  /* Light blue transparent like hover effect in dark theme */
        });

        templatesIconContainer.addEventListener('mouseleave', () => {
            templatesIconContainer.style.backgroundColor = '#3e3e3f';  /* Original dark background */
        });

        // Ensure the button is visible by setting explicit display properties
        templatesIconContainer.style.display = 'inline-flex';
        templatesIconContainer.style.alignItems = 'center';
        templatesIconContainer.style.justifyContent = 'center';

        // Find the greeting button to place the templates button after it
        const greetingButton = textareaContainer.querySelector('#crm-greeting-button-custom-icon');
        if (greetingButton) {
            // Add the templates icon after the greeting button
            greetingButton.after(templatesIconContainer);
        } else {
            // Find the microphone icon's parent div with class textarea-icon
            const microphoneIcon = textareaContainer.querySelector('.key-icon--microphone');
            if (microphoneIcon && microphoneIcon.closest('.textarea-icon')) {
                const microphoneContainer = microphoneIcon.closest('.textarea-icon');

                // Add the templates icon after the microphone container
                microphoneContainer.after(templatesIconContainer);
            } else {
                // Try to add to various possible containers in order of preference
                const possibleSelectors = [
                    '.vac-icon-textarea',
                    '.textarea-icons',
                    '.icon-container',
                    '.actions-container',
                    '.message-actions'
                ];

                let added = false;
                for (const selector of possibleSelectors) {
                    const container = textareaContainer.querySelector(selector);
                    if (container) {
                        container.appendChild(templatesIconContainer);
                        added = true;
                        break;
                    }
                }

                // If no specific container found, append to the container directly
                if (!added) {
                    textareaContainer.appendChild(templatesIconContainer);
                }
            }
        }
    }


    // Enhanced mutation observer to ensure buttons are always added
    const observer = new MutationObserver((mutations) => {
        let processed = false;

        // Process any existing textarea elements immediately
        const textAreas = document.querySelectorAll(SettingsModule.textAreaSelector);
        textAreas.forEach(textArea => {
            if (!processed) {
                console.log(`KeyCRM Template Helper: Поле вводу знайдено!`);

                // Look for the adjacent vac-icon-textarea container or other common icon containers
                const iconSelectors = ['.vac-icon-textarea', '.textarea-icons', '.icon-container', '.actions-container', '.message-actions'];
                let foundContainer = false;

                for (const selector of iconSelectors) {
                    const iconContainers = document.querySelectorAll(selector);
                    iconContainers.forEach(parentContainer => {
                        if (parentContainer && !foundContainer) {
                            console.log(`KeyCRM Template Helper: Знайдено контейнер з іконками за селектором ${selector}`);
                            // Check if our buttons are already inserted to avoid duplicates
                            // Use OR logic to ensure both buttons exist
                            if (!parentContainer.querySelector('#crm-greeting-button-custom-icon') ||
                                !parentContainer.querySelector('#crm-templates-button-custom-icon')) {
                                console.log('KeyCRM Template Helper: Додаю кнопки з іконками');
                                insertTemplateButton(parentContainer);
                                foundContainer = true;
                            }
                        }
                    });
                    if (foundContainer) break; // Stop after finding the first set of containers
                }

                if (!foundContainer) {
                    console.log('KeyCRM Template Helper: Контейнер з іконками не знайдено жодним із селекторів');
                    // Fallback: try to find any container near the textarea and just append the buttons to the textarea parent
                    const textAreaParent = textArea.parentElement;
                    if (textAreaParent) {
                        console.log('KeyCRM Template Helper: Додаю кнопки до батьківського елемента textarea');
                        insertTemplateButton(textAreaParent);
                    }
                }
            }
        });

        // Also check for newly added nodes
        if (!processed) {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if this node or its children contain our textarea
                        const allElements = [node, ...node.querySelectorAll('*')];
                        allElements.forEach(element => {
                            if (element.matches && element.matches(SettingsModule.textAreaSelector)) {
                                console.log(`KeyCRM Template Helper: Поле вводу знайдено!`);

                                // Find the adjacent icon container using multiple selectors
                                const iconSelectors = ['.vac-icon-textarea', '.textarea-icons', '.icon-container', '.actions-container', '.message-actions'];
                                let foundContainer = false;

                                for (const selector of iconSelectors) {
                                    const iconContainers = document.querySelectorAll(selector);
                                    iconContainers.forEach(parentContainer => {
                                        if (parentContainer && !foundContainer) {
                                            console.log(`KeyCRM Template Helper: Знайдено контейнер з іконками за селектором ${selector}`);
                                            // Check if our buttons are already inserted to avoid duplicates
                                            // Use OR logic to ensure both buttons exist
                                            if (!parentContainer.querySelector('#crm-greeting-button-custom-icon') ||
                                                !parentContainer.querySelector('#crm-templates-button-custom-icon')) {
                                                console.log('KeyCRM Template Helper: Додаю кнопки з іконками');
                                                insertTemplateButton(parentContainer);
                                                foundContainer = true;
                                            }
                                        }
                                    });
                                    if (foundContainer) break; // Stop after finding the first set of containers
                                }

                                if (!foundContainer) {
                                    console.log('KeyCRM Template Helper: Контейнер з іконками не знайдено жодним із селекторів');
                                    // Fallback: try to find any container near the textarea and just append the buttons to the textarea parent
                                    const textAreaParent = element.parentElement;
                                    if (textAreaParent) {
                                        console.log('KeyCRM Template Helper: Додаю кнопки до батьківського елемента textarea');
                                        insertTemplateButton(textAreaParent);
                                    }
                                }
                            }
                        });
                    }
                });
            });
        }
    });

    // Ensure buttons are added when page loads
    function ensureButtonsExist() {
        console.log('KeyCRM Template Helper: Виконую ensureButtonsExist, стан документа:', document.readyState);

        // Check if DOM is ready
        if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
            console.log('KeyCRM Template Helper: DOM ще не готовий. Поточний стан:', document.readyState);
            return;
        }

        // Try with various selectors to find text areas
        const textAreas = document.querySelectorAll(SettingsModule.textAreaSelector);
        console.log(`KeyCRM Template Helper: Знайдено ${textAreas.length} елементів textarea за основним селектором: "${SettingsModule.textAreaSelector}"`);

        // Try with general selector as fallback
        const allTextAreas = document.querySelectorAll('textarea');
        console.log(`KeyCRM Template Helper: Загалом знайдено ${allTextAreas.length} елементів textarea`);

        // Show details for all text areas
        allTextAreas.forEach((ta, index) => {
            console.log(`Textarea #${index}:`, ta,
                'ID:', ta.id,
                'Class:', ta.className,
                'Placeholder:', ta.placeholder,
                'Name:', ta.name,
                'Parent:', ta.parentElement,
                'Parent Class:', ta.parentElement ? ta.parentElement.className : 'N/A',
                'Parent ID:', ta.parentElement ? ta.parentElement.id : 'N/A');
        });

        // Process all text areas found
        allTextAreas.forEach(textArea => {
            // Check if it's likely a message input based on attributes or context
            const isMessageArea = textArea.placeholder &&
                (textArea.placeholder.toLowerCase().includes('message') ||
                 textArea.placeholder.toLowerCase().includes('відпов') ||
                 textArea.placeholder.toLowerCase().includes('написати') ||
                 textArea.name === 'message' ||
                 textArea.id.includes('message') ||
                 textArea.className.includes('message'));

            if (isMessageArea) {
                console.log('KeyCRM Template Helper: Обробляю потенційне текстове поле повідомлення', textArea);

                // Try to find the best container
                let container = null;

                // Check for common containers in order of preference
                const containerSelectors = [
                    () => textArea.closest('.vac-icon-textarea'),
                    () => textArea.closest('.textarea-icons'),
                    () => textArea.closest('.icon-container'),
                    () => textArea.closest('.actions-container'),
                    () => textArea.closest('.message-actions'),
                    () => textArea.closest('.vac-textarea'),
                    () => textArea.closest('.message-input'),
                    () => textArea.closest('.chat-input'),
                    () => textArea.parentElement,
                    () => textArea.parentNode
                ];

                for (const getContainer of containerSelectors) {
                    try {
                        container = getContainer();
                        if (container) {
                            console.log('KeyCRM Template Helper: Знайдено контейнер за допомогою:', getContainer.toString());
                            break;
                        }
                    } catch (e) {
                        console.log('KeyCRM Template Helper: Помилка при перевірці контейнера:', e);
                        continue;
                    }
                }

                if (container) {
                    console.log('KeyCRM Template Helper: Додаю кнопки до контейнера:', container);
                    insertTemplateButton(container);
                } else {
                    console.log('KeyCRM Template Helper: Не вдалося знайти контейнер для кнопок навіть для батьківського елемента');

                    // As a last resort, try to add buttons right after the textarea
                    try {
                        const buttonContainer = document.createElement('div');
                        buttonContainer.style.display = 'inline-flex';
                        buttonContainer.style.gap = '5px';
                        buttonContainer.style.marginLeft = '10px';
                        buttonContainer.style.alignItems = 'center';

                        // Add buttons to the temporary container
                        createGreetingButton(buttonContainer);
                        createTemplatesButton(buttonContainer);

                        // Insert after the textarea
                        if (textArea.parentNode) {
                            textArea.parentNode.insertBefore(buttonContainer, textArea.nextSibling);
                            console.log('KeyCRM Template Helper: Додано кнопки після textarea у той самий батьківський елемент');
                        }
                    } catch (e) {
                        console.error('KeyCRM Template Helper: Не вдалося додати кнопки навіть після textarea:', e);
                    }
                }
            } else {
                console.log('Пропускаю textarea, не є повідомленням:', textArea.placeholder);
            }
        });

        // Log final button count after a brief delay
        setTimeout(() => {
            const allGreetingBtns = document.querySelectorAll('#crm-greeting-button-custom-icon');
            const allTemplatesBtns = document.querySelectorAll('#crm-templates-button-custom-icon');
            console.log(`KeyCRM Template Helper: Кінцевий стан - Кнопок знайдено: greeting=${allGreetingBtns.length}, templates=${allTemplatesBtns.length}`);

            // Якщо кнопки все ще не знайдені, спробуємо створити плаваючу панель
            if (allGreetingBtns.length === 0 && allTemplatesBtns.length === 0) {
                console.log('KeyCRM Template Helper: Жодних кнопок не знайдено, створюю плаваючу панель');
                createFloatingButtonPanel();
            }
        }, 1500);
    }

    // Function to create a floating button panel as a last resort
    function createFloatingButtonPanel() {
        // Check if floating panel already exists
        if (document.getElementById('keycrm-floating-panel')) {
            return;
        }

        const floatingPanel = document.createElement('div');
        floatingPanel.id = 'keycrm-floating-panel';
        floatingPanel.style.cssText =
            'position: fixed;' +
            'top: 50%;' +
            'right: 20px;' +
            'transform: translateY(-50%);' +
            'display: flex;' +
            'flex-direction: column;' +
            'gap: 10px;' +
            'z-index: 10000;' +
            'background: #303031;' +
            'border: 1px solid #5b5b5b;' +
            'border-radius: 8px;' +
            'padding: 10px;' +
            'box-shadow: 0 4px 12px rgba(0,0,0,0.5);';

        // Create container for the buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText =
            'display: flex;' +
            'flex-direction: column;' +
            'gap: 8px;';

        // Add the individual buttons to the floating panel
        createGreetingButton(buttonsContainer);
        createTemplatesButton(buttonsContainer);

        floatingPanel.appendChild(buttonsContainer);

        // Add a small info icon to show the panel
        const infoIcon = document.createElement('div');
        infoIcon.textContent = '🔧';
        infoIcon.style.cssText =
            'position: fixed;' +
            'top: 20px;' +
            'right: 20px;' +
            'z-index: 10001;' +
            'background: #007bff;' +
            'color: white;' +
            'border-radius: 50%;' +
            'width: 40px;' +
            'height: 40px;' +
            'display: flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            'cursor: pointer;' +
            'font-size: 20px;' +
            'box-shadow: 0 2px 10px rgba(0,0,0,0.3);';

        infoIcon.title = 'Кнопки для KeyCRM Template Helper';

        // Toggle visibility of floating panel
        infoIcon.addEventListener('click', () => {
            if (floatingPanel.style.display === 'none' || !floatingPanel.parentNode) {
                document.body.appendChild(floatingPanel);
            } else {
                floatingPanel.remove();
            }
        });

        // Add to page
        document.body.appendChild(infoIcon);

        console.log('KeyCRM Template Helper: Створено плаваючу панель кнопок');
    }

    // Ініціалізуємо всі компоненти
    (async () => {
        // Ensure the DOM is fully loaded before initializing
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        await TranslitModule.initializeTranslitMap();
        await TemplatesModule.initializeTemplates();
        // Load templates collapsed state
        TemplatesModule.isTemplatesCollapsed = await GM_getValue(SettingsModule.TEMPLATES_COLLAPSED_KEY, false);
        KeyboardModule.initializeKeyboardShortcuts();

        // Add icon styles
        IconModule.addIconStyles();

        // Run initial insertion to catch any existing elements
        ensureButtonsExist();

        // Then observe for new elements
        observer.observe(document.body, { childList: true, subtree: true });

        // Run ensureButtonsExist again after a short delay to catch any elements that might have been missed
        setTimeout(ensureButtonsExist, 1000);

        // Additional check after a longer delay to ensure buttons are added even if DOM takes time to fully load
        setTimeout(ensureButtonsExist, 3000);

        // Create floating panel as a fallback option after a delay
        setTimeout(() => {
            if (document.getElementById('keycrm-floating-panel')) {
                return; // Panel already exists
            }
            console.log('KeyCRM Template Helper: Створення плаваючої панелі з кнопками');
            createFloatingButtonPanel();
        }, 5000); // Create floating panel after 5 seconds if not already created



        /**
         * Shows an enhanced notification with different types (success, error, info)
         * @param {string} message - The message to display in the notification
         * @param {'success'|'error'|'info'} type - The type of notification (affects styling)
         */
        function showEnhancedNotification(message, type = 'info') {
            // Remove existing notifications
            document.querySelectorAll('.crm-notification').forEach(el => el.remove());

            const notification = document.createElement('div');
            notification.className = `crm-notification crm-notification-${type}`;
            notification.textContent = message;

            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: #ddd;  /* Light text for dark theme */
                z-index: 10000;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);  /* Darker shadow for contrast */
                animation: slideInRight 0.3s ease-out;
                min-width: 250px;
                text-align: center;
                border: 1px solid #5b5b5b;  /* Darker border */
            `;

            // Set background color based on type with dark theme colors
            if (type === 'success') {
                notification.style.backgroundColor = '#3e3e3f';  /* Dark background */
                notification.style.color = '#51cf66';  /* Light green text */
            } else if (type === 'error') {
                notification.style.backgroundColor = '#3e3e3f';  /* Dark background */
                notification.style.color = '#ff6b6b';  /* Light red text for dark theme */
            } else {  // info
                notification.style.backgroundColor = '#3e3e3f';  /* Dark background */
                notification.style.color = '#4daafc';  /* Light blue text */
            }

            document.body.appendChild(notification);

            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOutRight 0.3s ease-out';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, 3000);

            // Add CSS for animations if not present
            if (!document.querySelector('#notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    @keyframes slideInRight {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOutRight {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }


        // Function to show add/edit template modal
        function showAddEditTemplateModal(template = null, index = null) {
            // Remove any existing modals
            const existingModal = document.querySelector('.add-template-modal-overlay');
            if (existingModal) existingModal.remove();

            const isEditing = template !== null;

            const modalHTML = `
                <div class="add-template-modal-overlay" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                ">
                    <div class="add-template-modal" style="
                        position: relative;
                        background: #303031;  /* Dark theme background */
                        border-radius: 8px;
                        padding: 24px;
                        max-width: 600px;
                        width: 90%;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                        border: 1px solid #5b5b5b;  /* Darker border */
                        color: #eee;
                    ">
                        <h3 style="
                            margin-top: 0;
                            margin-bottom: 15px;
                            color: #eee;
                            font-size: 18px;
                            font-weight: 600;
                        ">${isEditing ? 'Редагувати шаблон' : 'Додати новий шаблон'}</h3>

                        <div style="position: absolute; top: 12px; right: 12px;">
                            <button id="add-template-close-btn" style="
                                background: none;
                                border: none;
                                font-size: 20px;
                                cursor: pointer;
                                color: #aeafb3;
                                width: 28px;
                                height: 28px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                border-radius: 4px;
                            ">&times;</button>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Назва шаблону:</label>
                            <input type="text" id="template-title" style="
                                width: 100%;
                                padding: 10px 12px;
                                border: 1px solid #5b5b5b;
                                border-radius: 6px;
                                background-color: #3e3e3f;
                                color: #ddd;
                                font-size: 14px;
                                box-sizing: border-box;
                            " value="${isEditing ? escapeHtml(template.title) : ''}">
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Текст шаблону:</label>
                            <textarea id="template-text" rows="6" style="
                                width: 100%;
                                padding: 10px 12px;
                                border: 1px solid #5b5b5b;
                                border-radius: 6px;
                                background-color: #3e3e3f;
                                color: #ddd;
                                font-size: 14px;
                                box-sizing: border-box;
                                resize: vertical;
                            ">${isEditing ? escapeHtml(template.text) : ''}</textarea>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Категорія:</label>
                            <select id="template-category" style="
                                width: 100%;
                                padding: 8px 12px;
                                border: 1px solid #5b5b5b;
                                border-radius: 6px;
                                background-color: #3e3e3f;
                                color: #ddd;
                                font-size: 14px;
                                box-sizing: border-box;
                            ">
                                <option value="Загальне" ${isEditing && template.category === 'Загальне' ? 'selected' : ''}>Загальне</option>
                                <option value="Завершення дня" ${isEditing && template.category === 'Завершення дня' ? 'selected' : ''}>Завершення дня</option>
                                <option value="Прощання" ${isEditing && template.category === 'Прощання' ? 'selected' : ''}>Прощання</option>
                                <option value="Уточнення" ${isEditing && template.category === 'Уточнення' ? 'selected' : ''}>Уточнення</option>
                                <option value="Авторизація" ${isEditing && template.category === 'Авторизація' ? 'selected' : ''}>Авторизація</option>
                                <option value="Часові вікна" ${isEditing && template.category === 'Часові вікна' ? 'selected' : ''}>Часові вікна</option>
                                <option value="Оплата" ${isEditing && template.category === 'Оплата' ? 'selected' : ''}>Оплата</option>
                                <option value="Новий клієнт" ${isEditing && template.category === 'Новий клієнт' ? 'selected' : ''}>Новий клієнт</option>
                                <option value="Інше" ${isEditing && template.category === 'Інше' ? 'selected' : ''}>Інше</option>
                            </select>
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="cancel-template-btn" style="
                                padding: 8px 16px;
                                background-color: #444445;
                                color: #ddd;
                                border: 1px solid #5b5b5b;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                            ">Скасувати</button>
                            <button id="save-template-btn" style="
                                padding: 8px 16px;
                                background-color: #007bff;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                            ">${isEditing ? 'Оновити' : 'Додати'}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            const closeModal = () => document.querySelector('.add-template-modal-overlay')?.remove();

            // Set up event listeners
            document.getElementById('add-template-close-btn').onclick = closeModal;
            document.getElementById('cancel-template-btn').onclick = closeModal;

            document.getElementById('save-template-btn').onclick = () => {
                const titleInput = document.getElementById('template-title');
                const textInput = document.getElementById('template-text');
                const categoryInput = document.getElementById('template-category');

                let title = titleInput.value.trim();
                let text = textInput.value.trim();
                const category = categoryInput.value;

                // Input validation
                if (!title) {
                    showEnhancedNotification('Будь ласка, введіть назву шаблону', 'error');
                    titleInput.focus();
                    return;
                }

                if (!text) {
                    showEnhancedNotification('Будь ласка, введіть текст шаблону', 'error');
                    textInput.focus();
                    return;
                }

                // Validate title length
                if (title.length > 100) {
                    showEnhancedNotification('Назва шаблону занадто довга (максимум 100 символів)', 'error');
                    titleInput.focus();
                    return;
                }

                // Validate text length
                if (text.length > 5000) {
                    showEnhancedNotification('Текст шаблону занадто довгий (максимум 5000 символів)', 'error');
                    textInput.focus();
                    return;
                }

                const newTemplate = {
                    title: title,
                    text: text,
                    category: category,
                    images: []  // Keep images array empty for now
                };

                if (isEditing) {
                    // Update existing template
                    TemplatesModule.currentTemplates[index] = newTemplate;
                } else {
                    // Check for duplicate titles
                    const duplicateTemplate = TemplatesModule.currentTemplates.find(
                        t => t.title.trim().toLowerCase() === title.toLowerCase()
                    );

                    if (duplicateTemplate) {
                        showEnhancedNotification('Шаблон з такою назвою вже існує', 'error');
                        titleInput.focus();
                        return;
                    }

                    // Add new template
                    TemplatesModule.currentTemplates.push(newTemplate);
                }

                // Save templates
                const saveSuccess = TemplatesModule.saveTemplates(TemplatesModule.currentTemplates);
                if (!saveSuccess) {
                    showEnhancedNotification('Помилка збереження шаблону!', 'error');
                    return;
                }

                showEnhancedNotification(`Шаблон ${isEditing ? 'оновлено' : 'додано'} успішно!`, 'success');

                // Close modal and refresh template panel if it exists
                closeModal();
                const existingPanel = document.querySelector('.keycrm-templates-overlay');
                if (existingPanel) {
                    existingPanel.remove();
                    setTimeout(() => showTemplatesPanel(), 100);  // Reopen the panel after a bit of delay
                }
            };

            // Close modal when clicking outside
            const modalOverlay = document.querySelector('.add-template-modal-overlay');
            modalOverlay.onclick = (e) => {
                if (e.target === modalOverlay) closeModal();
            };
        }

        // Add import/export functions
        function exportTemplates() {
            const exportedData = {
                templates: TemplatesModule.currentTemplates,
                timestamp: new Date().toISOString()
            };

            const dataStr = JSON.stringify(exportedData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

            const exportFileDefaultName = 'keycrm_templates.json';

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        }

        function importTemplates() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.txt'; // Allow both JSON and TXT files

            input.onchange = async function(e) {
                const file = e.target.files[0];
                const reader = new FileReader();

                reader.onload = async function(e) {
                    try {
                        const fileContent = e.target.result;
                        let templatesToImport = [];

                        // Check file extension to determine format
                        const fileName = file.name.toLowerCase();

                        if (fileName.endsWith('.json')) {
                            // Handle JSON format
                            const importedData = JSON.parse(fileContent);
                            if (importedData.templates && Array.isArray(importedData.templates)) {
                                templatesToImport = importedData.templates;
                            } else {
                                throw new Error('Invalid JSON format: missing templates array');
                            }
                        } else if (fileName.endsWith('.txt')) {
                            // Handle TXT format
                            templatesToImport = parseTxtTemplates(fileContent);
                        } else {
                            throw new Error('Unsupported file format');
                        }

                        // Backup existing templates
                        const backupData = {
                            templates: TemplatesModule.currentTemplates,
                            timestamp: new Date().toISOString(),
                            backup: true
                        };

                        await GM_setValue(SettingsModule.TEMPLATES_STORAGE_KEY + '_backup', JSON.stringify(backupData));

                        // Import new templates
                        TemplatesModule.currentTemplates = templatesToImport;
                        await GM_setValue(SettingsModule.TEMPLATES_STORAGE_KEY, JSON.stringify(TemplatesModule.currentTemplates));

                        showEnhancedNotification('Шаблони успішно імпортовано!', 'success');

                        // Refresh the templates panel if it's open
                        const existingPanel = document.querySelector('.keycrm-templates-overlay');
                        if (existingPanel) {
                            existingPanel.remove();
                            showTemplatesPanel();
                        }
                    } catch (error) {
                        console.error('Error importing templates:', error);
                        showEnhancedNotification('Помилка при імпорті шаблонів: ' + error.message, 'error');
                    }
                };

                reader.readAsText(file);
            };

            input.click();
        }

        // Function to parse templates from TXT format
        function parseTxtTemplates(content) {
            const templates = [];
            const lines = content.split('\n');
            let currentCategory = 'Загальне'; // Default category

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Check if this is a category line [Category Name]
                if (line.startsWith('[') && line.endsWith(']')) {
                    currentCategory = line.substring(1, line.length - 1);
                }
                // Check if this is a template title === Title ===
                else if (line.startsWith('===') && line.endsWith('===')) {
                    const title = line.substring(3, line.length - 3).trim();

                    // Collect the template text (next lines until next template or category)
                    let templateText = '';
                    i++; // Move to the next line after the title

                    while (i < lines.length) {
                        const nextLine = lines[i].trim();

                        // Check if we've reached the next template or category
                        if ((nextLine.startsWith('===') && nextLine.endsWith('===')) ||
                            (nextLine.startsWith('[') && nextLine.endsWith(']'))) {
                            i--; // Go back one line since we'll process this in the next iteration
                            break;
                        }

                        // Add the line to template text (preserve original formatting)
                        if (templateText === '') {
                            templateText = lines[i]; // Use the full line (with original formatting)
                        } else {
                            templateText += '\n' + lines[i]; // Preserve original line breaks and formatting
                        }

                        i++;
                    }

                    // Add the template to the array
                    templates.push({
                        title: title,
                        text: templateText.trim(),
                        category: currentCategory,
                        images: [] // Default empty images array
                    });
                }
            }

            return templates;
        }

    })();

})();
