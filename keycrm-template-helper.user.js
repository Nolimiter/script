// ==UserScript==
// @name         KeyCRM Template Helper
// @namespace    http://tampermonkey.net/
// @version      22.3
// @description  Додає 2 кастомні кнопки для вставки привітань та керування шаблонами. Підтримує транслітерацію імен з латиниці на кирилицю.
// @author       KeyCRM Helper Team
// @match        *://*.keycrm.app/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

/**
 * KeyCRM Template Helper - Userscript for KeyCRM platform
 *
 * This script provides:
 * - Quick greeting insertion with name transliteration
 * - Template management system with categories
 * - Import/Export functionality for templates
 * - Drag-and-drop template reordering
 * - Custom transliteration dictionary management
 *
 * @version 22.3
 * @license MIT
 */

(function() {
    'use strict';

    console.log(`KeyCRM Template Helper v22.3: Скрипт запускається...`);

    // ============================================================================
    // SETTINGS MODULE
    // ============================================================================

    /**
     * Settings module containing all configuration options for the KeyCRM Template Helper
     * @namespace SettingsModule
     */
    const SettingsModule = {
        // --- API Configuration ---
        GEMINI_API_KEY: '', // Reserved for future AI features

        // --- Selectors ---
        textAreaSelector: 'textarea.vac-textarea, textarea[name="message"], textarea[placeholder*="message"], textarea[placeholder*="відповідь"], textarea[placeholder*="відпов"], .vac-textarea textarea, .message-input textarea, .chat-input textarea, textarea[class*="input"], .textarea-container textarea',
        clientNameSelector: 'span[data-v-5b9ca00e].link.clickable',

        // --- User Configuration ---
        myName: 'Юрій',
        messageTemplate: 'Вітаю, _! Мене звуть _, служба підтримки KeyCRM😊',
        alternativeMessageTemplate: 'Вітаю! Мене звуть Юрій, служба підтримки KeyCRM😊\n\nЯк я можу до вас звертатись?',

        // --- Storage Keys ---
        TEMPLATES_STORAGE_KEY: 'keycrmTemplates_v1',
        TEMPLATES_COLLAPSED_KEY: 'keycrmTemplates_collapsed',
        TEMPLATES_POSITION_KEY: 'keycrmTemplates_position',
        TEMPLATES_PANEL_ID: 'keycrm-templates-panel',
        TRANSLIT_MAP_KEY: 'customTranslitMap',

        // --- UI Configuration ---
        MAX_Z_INDEX: 2147483647,
        NOTIFICATION_DURATION: 3000
    };

    // ============================================================================
    // STYLES MODULE
    // ============================================================================

    /**
     * Styles module for managing all CSS styles
     * @namespace StylesModule
     */
    const StylesModule = {
        /**
         * Injects all required styles into the document
         */
        injectStyles() {
            GM_addStyle(`
                /* Custom Icon Styles - Heroicons hand-raised */
                .key-icon--greeting {
                    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10.5 1.875C10.5 1.25368 11.0037 0.75 11.625 0.75C12.2463 0.75 12.75 1.25368 12.75 1.875V10.0938C13.2674 10.2561 13.7708 10.4757 14.25 10.7527V3.375C14.25 2.75368 14.7537 2.25 15.375 2.25C15.9963 2.25 16.5 2.75368 16.5 3.375V14.3122C15.0821 14.5501 13.8891 15.451 13.2506 16.6852C14.4554 16.0866 15.8134 15.75 17.25 15.75C17.6642 15.75 18 15.4142 18 15V12.75L18 12.7336C18.0042 11.8771 18.3339 11.0181 18.9885 10.3635C19.4278 9.92417 20.1402 9.92417 20.5795 10.3635C21.0188 10.8028 21.0188 11.5152 20.5795 11.9545C20.361 12.173 20.2514 12.4567 20.25 12.7445L20.25 12.75L20.25 15.75H20.2454C20.1863 17.2558 19.5623 18.6877 18.4926 19.7574L16.7574 21.4926C15.6321 22.6179 14.106 23.25 12.5147 23.25H10.5C6.35786 23.25 3 19.8921 3 15.75V6.375C3 5.75368 3.50368 5.25 4.125 5.25C4.74632 5.25 5.25 5.75368 5.25 6.375V11.8939C5.71078 11.4421 6.2154 11.0617 6.75 10.7527V3.375C6.75 2.75368 7.25368 2.25 7.875 2.25C8.49632 2.25 9 2.75368 9 3.375V9.90069C9.49455 9.80023 9.99728 9.75 10.5 9.75V1.875Z"/></svg>');
                    mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10.5 1.875C10.5 1.25368 11.0037 0.75 11.625 0.75C12.2463 0.75 12.75 1.25368 12.75 1.875V10.0938C13.2674 10.2561 13.7708 10.4757 14.25 10.7527V3.375C14.25 2.75368 14.7537 2.25 15.375 2.25C15.9963 2.25 16.5 2.75368 16.5 3.375V14.3122C15.0821 14.5501 13.8891 15.451 13.2506 16.6852C14.4554 16.0866 15.8134 15.75 17.25 15.75C17.6642 15.75 18 15.4142 18 15V12.75L18 12.7336C18.0042 11.8771 18.3339 11.0181 18.9885 10.3635C19.4278 9.92417 20.1402 9.92417 20.5795 10.3635C21.0188 10.8028 21.0188 11.5152 20.5795 11.9545C20.361 12.173 20.2514 12.4567 20.25 12.7445L20.25 12.75L20.25 15.75H20.2454C20.1863 17.2558 19.5623 18.6877 18.4926 19.7574L16.7574 21.4926C15.6321 22.6179 14.106 23.25 12.5147 23.25H10.5C6.35786 23.25 3 19.8921 3 15.75V6.375C3 5.75368 3.50368 5.25 4.125 5.25C4.74632 5.25 5.25 5.75368 5.25 6.375V11.8939C5.71078 11.4421 6.2154 11.0617 6.75 10.7527V3.375C6.75 2.75368 7.25368 2.25 7.875 2.25C8.49632 2.25 9 2.75368 9 3.375V9.90069C9.49455 9.80023 9.99728 9.75 10.5 9.75V1.875Z"/></svg>');
                }

                .key-icon--template {
                    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>');
                    mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>');
                }

                /* Правильні розміри для іконок */
                .key-icon--greeting,
                .key-icon--template {
                    display: inline-block;
                    position: relative;
                    width: 18px;
                    height: 18px;
                    top: 4px;
                    background: #575962;
                }

                /* Hover effects for custom icons */
                .textarea-icon:hover .key-icon--greeting {
                    background: #4daafc;
                }

                .textarea-icon:hover .key-icon--template {
                    background: #51cf66;
                }

                /* Button Animation Styles */
                #crm-greeting-button-custom-icon.inserted .key-icon,
                #crm-templates-button-custom-icon.inserted .key-icon {
                    animation: insertedAnimation 0.5s ease;
                }

                @keyframes insertedAnimation {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }

                /* Modal Overlay Styles */
                .crm-helper-overlay,
                .keycrm-templates-overlay,
                .add-template-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }

                /* Modal Content Styles */
                .crm-helper-modal,
                .keycrm-templates-panel,
                .add-template-modal {
                    position: relative;
                    background: #303031;
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    border: 1px solid #5b5b5b;
                }

                .crm-helper-modal h3,
                .add-template-modal h3 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    color: #eee;
                    font-size: 18px;
                    font-weight: 600;
                }

                /* Close Button Styles */
                .crm-modal-btn-close {
                    position: absolute;
                    top: 12px;
                    right: 12px;
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
                }

                .crm-modal-btn-close:hover {
                    background-color: #444445;
                    color: white;
                }

                /* Input Field Styles */
                .name-input-field {
                    padding: 10px 12px;
                    border: 1px solid #5b5b5b;
                    border-radius: 6px;
                    font-size: 14px;
                    width: 100%;
                    box-sizing: border-box;
                    background-color: #3e3e3f;
                    color: #ddd;
                }

                .name-input-field:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
                }

                /* Button Styles */
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
                    background-color: #28a745;
                    color: white;
                }

                .name-choice-btn-secondary:hover {
                    background-color: #1e7e34;
                }

                .name-choice-btn-cancel {
                    background-color: #444445;
                    color: #ddd;
                    border: 1px solid #5b5b5b;
                }

                .name-choice-btn-cancel:hover {
                    background-color: #4a4a4b;
                }

                /* Template List Styles */
                .templates-list-container {
                    max-height: 70vh;
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
                    padding: 8px;
                    border: 1px solid #5b5b5b;
                    border-radius: 4px;
                    margin-bottom: 5px;
                    background-color: #3e3e3f;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    color: #ddd;
                }

                .template-item-list:hover {
                    background-color: #444445;
                }

                .template-item-list.drag-over {
                    border: 2px dashed #007bff;
                    background-color: rgba(0, 123, 255, 0.1);
                }

                .template-info {
                    flex: 1;
                    padding: 2px 0;
                    overflow: hidden;
                }

                .template-title {
                    font-weight: bold;
                    margin-bottom: 2px;
                    color: #eee;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .template-preview {
                    font-size: 11px;
                    color: #aeafb3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 2px;
                }

                .template-meta {
                    font-size: 9px;
                    color: #888;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
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
                    color: #aeafb3;
                    font-style: italic;
                }

                /* Filter Styles */
                .templates-filter {
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .templates-filter label {
                    font-weight: bold;
                    color: #eee;
                }

                .templates-filter select {
                    padding: 6px 10px;
                    border: 1px solid #5b5b5b;
                    border-radius: 4px;
                    background-color: #3e3e3f;
                    color: #ddd;
                }

                /* Notification Styles */
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

                .crm-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 6px;
                    color: #ddd;
                    z-index: 10000;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    animation: slideInRight 0.3s ease-out;
                    min-width: 250px;
                    text-align: center;
                    border: 1px solid #5b5b5b;
                }

                .crm-notification-success {
                    background-color: #3e3e3f;
                    color: #51cf66;
                }

                .crm-notification-error {
                    background-color: #3e3e3f;
                    color: #ff6b6b;
                }

                .crm-notification-info {
                    background-color: #3e3e3f;
                    color: #4daafc;
                }
            `);
        }
    };

    // ============================================================================
    // UTILITY MODULE
    // ============================================================================

    /**
     * Utility functions module
     * @namespace UtilsModule
     */
    const UtilsModule = {
        /**
         * Capitalizes the first letter of a string
         * @param {string} str - The input string
         * @returns {string} - The capitalized string
         */
        capitalizeFirstLetter(str) {
            if (!str || typeof str !== 'string') return '';
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        },

        /**
         * Escapes HTML special characters
         * @param {string} unsafe - The unsafe string
         * @returns {string} - The escaped string
         */
        escapeHtml(unsafe) {
            if (typeof unsafe !== 'string') return '';
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },

        /**
         * Shows an enhanced notification
         * @param {string} message - The message to display
         * @param {'success'|'error'|'info'} type - The notification type
         */
        showNotification(message, type = 'info') {
            document.querySelectorAll('.crm-notification').forEach(el => el.remove());

            const notification = document.createElement('div');
            notification.className = `crm-notification crm-notification-${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOutRight 0.3s ease-out';
                    setTimeout(() => notification.remove(), 300);
                }
            }, SettingsModule.NOTIFICATION_DURATION);
        },

        /**
         * Validates name input
         * @param {string} name - The name to validate
         * @returns {boolean} - Whether the name is valid
         */
        isValidName(name) {
            if (!name || name.length === 0) return false;
            if (name.length > 50) return false;
            return /^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s\-']+$/u.test(name);
        }
    };

    // ============================================================================
    // TRANSLITERATION MODULE
    // ============================================================================

    /**
     * Transliteration module for converting Latin names to Cyrillic
     * @namespace TranslitModule
     */
    const TranslitModule = {
        translitMap: {},

        defaultTranslitMap: {
            'Anastasiia': 'Анастасія', 'Anastasia': 'Анастасія', 'Anna': 'Анна', 'Daryna': 'Дарина',
            'Hanna': 'Ганна', 'Iryna': 'Ірина', 'Ivanna': 'Іванна', 'Kateryna': 'Катерина',
            'Katerina': 'Катерина', 'Khrystyna': 'Христина', 'Lidiya': 'Лідія', 'Mariya': 'Марія',
            'Mariia': 'Марія', 'Maria': 'Марія', 'Marta': 'Марта', 'Nataliya': 'Наталія',
            'Natalia': 'Наталія', 'Oksana': 'Оксана', 'Olena': 'Олена', 'Solomiia': 'Соломія',
            'Sofiia': 'Софія', 'Sofiya': 'Софія', 'Tetiana': 'Тетяна', 'Tetyana': 'Тетяна',
            'Viktoriia': 'Вікторія', 'Viktoriya': 'Вікторія', 'Yuliya': 'Юлія', 'Iuliia': 'Юлія',
            'Julia': 'Юлія', 'Zoryana': 'Зоряна',
            'Andriy': 'Андрій', 'Andrii': 'Андрій', 'Andrey': 'Андрій', 'Artem': 'Артем',
            'Bohdan': 'Богдан', 'Dmytro': 'Дмитро', 'Ivan': 'Іван', 'Maksym': 'Максим',
            'Maxim': 'Максим', 'Mykola': 'Микола', 'Nazar': 'Назар', 'Oleksandr': 'Олександр',
            'Olexandr': 'Олександр', 'Alexander': 'Олександр', 'Ostap': 'Остап', 'Rostyslav': 'Ростислав',
            'Serhiy': 'Сергій', 'Serhii': 'Сергій', 'Sergey': 'Сергій', 'Taras': 'Тарас',
            'Vasyl': 'Василь', 'Vladyslav': 'Владислав', 'Volodymyr': 'Володимир', 'Yuriy': 'Юрій',
            'Yurii': 'Юрій'
        },

        /**
         * Initializes the transliteration map
         */
        async initialize() {
            const customMap = await GM_getValue(SettingsModule.TRANSLIT_MAP_KEY, {});
            this.translitMap = { ...this.defaultTranslitMap, ...customMap };
            console.log('KeyCRM Template Helper: Словник імен завантажено.');
        },

        /**
         * Transliterates a name from Latin to Cyrillic
         * @param {string} name - The name to transliterate
         * @returns {string|null} - The transliterated name or null if not found
         */
        transliterate(name) {
            return this.translitMap[name] || null;
        },

        /**
         * Adds a custom transliteration
         * @param {string} latin - The Latin name
         * @param {string} cyrillic - The Cyrillic name
         */
        async addCustom(latin, cyrillic) {
            const customMap = await GM_getValue(SettingsModule.TRANSLIT_MAP_KEY, {});
            customMap[latin] = cyrillic;
            await GM_setValue(SettingsModule.TRANSLIT_MAP_KEY, customMap);
            await this.initialize();
        }
    };

    // ============================================================================
    // TEMPLATES MODULE
    // ============================================================================

    /**
     * Templates module for managing message templates
     * @namespace TemplatesModule
     */
    const TemplatesModule = {
        templates: [],

        defaultTemplates: [
            { title: "Привітання", text: "Вітаю! Мене звуть Юрій, служба підтримки KeyCRM😊", category: "Загальне", images: [] },
            { title: "Перевірка", text: "Дякую за звернення! Розгляну ваш запит та повернуся з відповіддю найближчим часом.", category: "Загальне", images: [] },
            { title: "Дякую", text: "Дякую за очікування! Якщо є додаткові питання - звертайтеся.", category: "Загальне", images: [] },
            { title: "Кінець дня актив", text: "Мій робочий день вже закінчується, тому передаю ваш запит колегам. Вони постараються відповісти до кінця робочого дня. Якщо через велику кількість звернень це не вдасться, ми обов'язково повернемось до вас завтра з 9:00 ранку 🙏\n\nСподіваюсь на ваше розуміння та гарного вечора! 🙂", category: "Завершення дня", images: [] },
            { title: "Прощання стандарт", text: "Дякую за звернення у службу підтримки KeyCRM!\nБудемо раді поспілкуватися знову💙\n\nГарного дня😊", category: "Прощання", images: [] },
            { title: "Уточнення", text: "У вас є додаткові запитання, з якими я можу вам допомогти?", category: "Уточнення", images: [] }
        ],

        /**
         * Initializes templates from storage
         */
        async initialize() {
            const storedTemplates = await GM_getValue(SettingsModule.TEMPLATES_STORAGE_KEY, null);
            if (!storedTemplates) {
                await GM_setValue(SettingsModule.TEMPLATES_STORAGE_KEY, JSON.stringify(this.defaultTemplates));
                this.templates = this.defaultTemplates;
            } else {
                try {
                    this.templates = JSON.parse(storedTemplates);
                } catch (e) {
                    console.error('Error parsing templates:', e);
                    this.templates = this.defaultTemplates;
                }
            }
        },

        /**
         * Saves templates to storage
         * @param {Array} templates - The templates to save
         * @returns {boolean} - Whether save was successful
         */
        async save(templates) {
            try {
                await GM_setValue(SettingsModule.TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
                this.templates = templates;
                return true;
            } catch (e) {
                console.error('Error saving templates:', e);
                return false;
            }
        },

        /**
         * Gets all templates
         * @returns {Array} - The templates array
         */
        getAll() {
            return this.templates;
        },

        /**
         * Gets templates by category
         * @param {string} category - The category to filter by
         * @returns {Array} - Filtered templates
         */
        getByCategory(category) {
            if (category === 'all') return this.templates;
            return this.templates.filter(t => (t.category || 'Загальне') === category);
        },

        /**
         * Gets all unique categories
         * @returns {Set} - Set of category names
         */
        getCategories() {
            const categories = new Set(['Загальне']);
            this.templates.forEach(t => categories.add(t.category || 'Загальне'));
            return categories;
        },

        /**
         * Adds a new template
         * @param {Object} template - The template to add
         * @returns {boolean} - Whether add was successful
         */
        async add(template) {
            this.templates.push(template);
            return await this.save(this.templates);
        },

        /**
         * Updates a template
         * @param {number} index - The index of template to update
         * @param {Object} template - The new template data
         * @returns {boolean} - Whether update was successful
         */
        async update(index, template) {
            if (index < 0 || index >= this.templates.length) return false;
            this.templates[index] = template;
            return await this.save(this.templates);
        },

        /**
         * Deletes a template
         * @param {number} index - The index of template to delete
         * @returns {boolean} - Whether delete was successful
         */
        async delete(index) {
            if (index < 0 || index >= this.templates.length) return false;
            this.templates.splice(index, 1);
            return await this.save(this.templates);
        },

        /**
         * Swaps two templates
         * @param {number} index1 - First template index
         * @param {number} index2 - Second template index
         * @returns {boolean} - Whether swap was successful
         */
        async swap(index1, index2) {
            if (index1 < 0 || index1 >= this.templates.length ||
                index2 < 0 || index2 >= this.templates.length) {
                return false;
            }
            const temp = this.templates[index1];
            this.templates[index1] = this.templates[index2];
            this.templates[index2] = temp;
            return await this.save(this.templates);
        },

        /**
         * Exports templates to JSON
         * @returns {string} - JSON string of templates
         */
        export() {
            return JSON.stringify({
                templates: this.templates,
                timestamp: new Date().toISOString()
            }, null, 2);
        },

        /**
         * Imports templates from JSON
         * @param {string} jsonData - JSON string to import
         * @returns {boolean} - Whether import was successful
         */
        async import(jsonData) {
            try {
                const data = JSON.parse(jsonData);
                if (data.templates && Array.isArray(data.templates)) {
                    // Backup current templates
                    await GM_setValue(SettingsModule.TEMPLATES_STORAGE_KEY + '_backup',
                        JSON.stringify({
                            templates: this.templates,
                            timestamp: new Date().toISOString(),
                            backup: true
                        })
                    );
                    return await this.save(data.templates);
                }
                return false;
            } catch (e) {
                console.error('Error importing templates:', e);
                return false;
            }
        },

        /**
         * Parses templates from TXT format
         * @param {string} content - The TXT content
         * @returns {Array} - Parsed templates
         */
        parseTxt(content) {
            const templates = [];
            const lines = content.split('\n');
            let currentCategory = 'Загальне';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.startsWith('[') && line.endsWith(']')) {
                    currentCategory = line.substring(1, line.length - 1);
                } else if (line.startsWith('===') && line.endsWith('===')) {
                    const title = line.substring(3, line.length - 3).trim();
                    let templateText = '';
                    i++;

                    while (i < lines.length) {
                        const nextLine = lines[i].trim();
                        if ((nextLine.startsWith('===') && nextLine.endsWith('===')) ||
                            (nextLine.startsWith('[') && nextLine.endsWith(']'))) {
                            i--;
                            break;
                        }
                        templateText += (templateText === '' ? '' : '\n') + lines[i];
                        i++;
                    }

                    templates.push({
                        title: title,
                        text: templateText.trim(),
                        category: currentCategory,
                        images: []
                    });
                }
            }
            return templates;
        }
    };

    // ============================================================================
    // UI MODULE
    // ============================================================================

    /**
     * UI module for managing user interface
     * @namespace UIModule
     */
    const UIModule = {
        draggedItem: null,

        /**
         * Inserts text into the active textarea
         * @param {string} text - The text to insert
         */
        insertText(text) {
            const textArea = document.querySelector(SettingsModule.textAreaSelector);
            if (!textArea) {
                console.error('KeyCRM Template Helper: Textarea not found.');
                UtilsModule.showNotification('Не вдалося знайти поле для вводу.', 'error');
                return;
            }

            textArea.value = text;
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
            textArea.focus();

            // Animate buttons
            const buttons = ['#crm-greeting-button-custom-icon', '#crm-templates-button-custom-icon'];
            buttons.forEach(selector => {
                const btn = document.querySelector(selector);
                if (btn) {
                    btn.classList.add('inserted');
                    setTimeout(() => btn.classList.remove('inserted'), 1500);
                }
            });
        },

        /**
         * Shows a modal dialog
         * @param {string} title - Modal title
         * @param {string} content - Modal HTML content
         * @returns {HTMLElement} - The modal element
         */
        showModal(title, content) {
            const existingModal = document.querySelector('.crm-helper-overlay');
            if (existingModal) existingModal.remove();

            const modalHTML = `
                <div class="crm-helper-overlay">
                    <div class="crm-helper-modal">
                        <h3>${title}</h3>
                        <button class="crm-modal-btn-close">&times;</button>
                        ${content}
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = document.querySelector('.crm-helper-overlay');

            const closeModal = () => modal?.remove();
            modal.querySelector('.crm-modal-btn-close').onclick = closeModal;
            modal.onclick = (e) => {
                if (e.target === modal) closeModal();
            };

            return modal;
        },

        /**
         * Shows the name choice modal
         * @param {string} detectedName - The detected name (optional)
         */
        showNameChoice(detectedName = '') {
            const content = `
                <div class="name-choice-content" style="display: flex; flex-direction: column; gap: 15px;">
                    <p style="margin: 0 0 10px 0; color: #dee0e4; font-size: 14px;">
                        Ви можете виправити ім'я вручну або вставити шаблон-запит.
                    </p>
                    <input type="text" id="name-input" class="name-input-field"
                        placeholder="Введіть ім'я..." value="${UtilsModule.escapeHtml(detectedName)}">
                    <div class="name-choice-buttons" style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="insert-with-name-btn" class="name-choice-btn-primary">Вставити з цим іменем</button>
                        <button id="insert-alternative-btn" class="name-choice-btn-secondary">Запитати ім'я</button>
                    </div>
                </div>
            `;

            const modal = this.showModal("Ім'я не розпізнано", content);
            const closeModal = () => modal.remove();

            document.getElementById('insert-with-name-btn').onclick = () => {
                const nameInput = document.getElementById('name-input');
                const finalName = nameInput.value.trim();

                if (!UtilsModule.isValidName(finalName)) {
                    UtilsModule.showNotification('Неприпустиме ім\'я.', 'error');
                    nameInput.focus();
                    return;
                }

                const message = SettingsModule.messageTemplate
                    .replace('_', UtilsModule.capitalizeFirstLetter(finalName))
                    .replace('_', SettingsModule.myName);
                this.insertText(message);
                closeModal();
            };

            document.getElementById('insert-alternative-btn').onclick = () => {
                this.insertText(SettingsModule.alternativeMessageTemplate);
                closeModal();
            };

            setTimeout(() => {
                const input = document.getElementById('name-input');
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        },

        /**
         * Shows the add transliteration modal
         */
        showAddTranslit() {
            const content = `
                <div class="name-choice-content" style="display: flex; flex-direction: column; gap: 15px;">
                    <p style="margin: 0 0 10px 0; color: #dee0e4; font-size: 14px;">
                        Введіть варіант імені латиницею та його відповідник кирилицею.
                    </p>
                    <input type="text" id="latin-input" class="name-input-field"
                        placeholder="Латиниця (напр., 'Ksu')">
                    <input type="text" id="cyrillic-input" class="name-input-field"
                        placeholder="Кирилиця (напр., 'Ксю')">
                    <div class="name-choice-buttons" style="display: flex; gap: 10px;">
                        <button id="translit-save-btn" class="name-choice-btn-primary">Зберегти</button>
                        <button id="translit-cancel-btn" class="name-choice-btn-cancel">Скасувати</button>
                    </div>
                </div>
            `;

            const modal = this.showModal("Додати нову транслітерацію", content);
            const closeModal = () => modal.remove();

            document.getElementById('translit-save-btn').onclick = async () => {
                const latin = UtilsModule.capitalizeFirstLetter(
                    document.getElementById('latin-input').value.trim()
                );
                const cyrillic = document.getElementById('cyrillic-input').value.trim();

                if (latin && cyrillic) {
                    await TranslitModule.addCustom(latin, cyrillic);
                    UtilsModule.showNotification(`Збережено: ${latin} → ${cyrillic}`, 'success');
                    closeModal();
                } else {
                    UtilsModule.showNotification('Заповніть обидва поля.', 'error');
                }
            };

            document.getElementById('translit-cancel-btn').onclick = closeModal;

            setTimeout(() => {
                document.getElementById('latin-input')?.focus();
            }, 100);
        },

        /**
         * Shows the templates panel
         */
        showTemplatesPanel() {
            const existingPanel = document.querySelector('.keycrm-templates-overlay');
            if (existingPanel) {
                existingPanel.remove();
                return;
            }

            const overlay = document.createElement('div');
            overlay.className = 'keycrm-templates-overlay';

            const panel = document.createElement('div');
            panel.className = 'keycrm-templates-panel';

            const closeButton = document.createElement('button');
            closeButton.innerHTML = '&times;';
            closeButton.className = 'crm-modal-btn-close';
            closeButton.onclick = () => overlay.remove();

            // Filter container
            const filterContainer = document.createElement('div');
            filterContainer.className = 'templates-filter';
            filterContainer.innerHTML = `
                <label for="category-filter">Фільтр:</label>
                <select id="category-filter">
                    <option value="all">Всі категорії</option>
                </select>
            `;

            const categorySelect = filterContainer.querySelector('#category-filter');
            TemplatesModule.getCategories().forEach(category => {
                if (category !== 'Загальне' || categorySelect.querySelectorAll('option').length === 1) {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                }
            });

            // Templates list container
            const listContainer = document.createElement('div');
            listContainer.className = 'templates-list-container';
            listContainer.innerHTML = '<ul id="templates-list-simple" class="templates-list-simple"></ul>';

            // Action buttons
            const actionsContainer = document.createElement('div');
            actionsContainer.style.cssText = `
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                justify-content: center;
            `;

            const addBtn = this.createButton('Додати', 'name-choice-btn-primary', () => {
                this.showTemplateEditor();
            });

            const exportBtn = this.createButton('Експорт', 'name-choice-btn-secondary', () => {
                this.exportTemplates();
            });

            const importBtn = this.createButton('Імпорт', 'name-choice-btn-primary', () => {
                this.importTemplates();
            });

            actionsContainer.append(addBtn, exportBtn, importBtn);

            panel.appendChild(closeButton);
            panel.appendChild(actionsContainer);
            panel.appendChild(filterContainer);
            panel.appendChild(listContainer);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            overlay.onclick = (e) => {
                if (e.target === overlay) overlay.remove();
            };

            this.renderTemplateList(document.getElementById('templates-list-simple'));

            categorySelect.addEventListener('change', () => {
                this.renderTemplateList(
                    document.getElementById('templates-list-simple'),
                    categorySelect.value
                );
            });
        },

        /**
         * Creates a button element
         * @param {string} text - Button text
         * @param {string} className - Button class name
         * @param {Function} onClick - Click handler
         * @returns {HTMLElement} - The button element
         */
        createButton(text, className, onClick) {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.className = className;
            btn.style.cssText = 'padding: 8px 16px; font-size: 13px;';
            btn.onclick = (e) => {
                e.stopPropagation();
                onClick();
            };
            return btn;
        },

        /**
         * Renders the template list
         * @param {HTMLElement} listElement - The list container element
         * @param {string} filterCategory - Category to filter by
         */
        renderTemplateList(listElement, filterCategory = 'all') {
            if (!listElement) return;
            listElement.innerHTML = '';

            const templates = TemplatesModule.getByCategory(filterCategory);

            if (templates.length === 0) {
                listElement.innerHTML = '<li class="no-templates">Немає шаблонів у цій категорії.</li>';
                return;
            }

            templates.forEach((template) => {
                const globalIndex = TemplatesModule.getAll().indexOf(template);
                const listItem = document.createElement('li');
                listItem.className = 'template-item-list';
                listItem.draggable = true;
                listItem.setAttribute('data-index', globalIndex);

                listItem.innerHTML = `
                    <div class="template-info">
                        <div class="template-title" title="${UtilsModule.escapeHtml(template.text)}">
                            ${UtilsModule.escapeHtml(template.title)}
                        </div>
                        <div class="template-preview">
                            ${UtilsModule.escapeHtml(template.text.substring(0, 80))}${template.text.length > 80 ? '...' : ''}
                        </div>
                        <div class="template-meta">${UtilsModule.escapeHtml(template.category || 'Загальне')}</div>
                    </div>
                    <div class="template-actions">
                        <button class="edit-template-btn" data-index="${globalIndex}">Редагувати</button>
                        <button class="delete-template-btn" data-index="${globalIndex}">Видалити</button>
                    </div>
                `;

                listElement.appendChild(listItem);

                // Edit button handler
                listItem.querySelector('.edit-template-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                    this.showTemplateEditor(TemplatesModule.getAll()[idx], idx);
                });

                // Delete button handler
                listItem.querySelector('.delete-template-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                    if (confirm('Ви впевнені, що хочете видалити цей шаблон?')) {
                        await TemplatesModule.delete(idx);
                        UtilsModule.showNotification('Шаблон видалено успішно!', 'success');
                        this.renderTemplateList(listElement, filterCategory);
                    }
                });

                // Click to insert template
                listItem.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('edit-template-btn') &&
                        !e.target.classList.contains('delete-template-btn')) {
                        this.insertText(template.text);
                        document.querySelector('.keycrm-templates-overlay')?.remove();
                    }
                });

                // Drag and drop handlers
                this.attachDragHandlers(listItem);
            });
        },

        /**
         * Attaches drag and drop handlers to a list item
         * @param {HTMLElement} item - The list item element
         */
        attachDragHandlers(item) {
            item.addEventListener('dragstart', function(e) {
                UIModule.draggedItem = this;
                e.dataTransfer.effectAllowed = 'move';
                this.style.opacity = '0.6';
            });

            item.addEventListener('dragover', (e) => {
                if (e.preventDefault) e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                return false;
            });

            item.addEventListener('dragenter', function() {
                this.classList.add('drag-over');
            });

            item.addEventListener('dragleave', function() {
                this.classList.remove('drag-over');
            });

            item.addEventListener('drop', async function(e) {
                if (e.stopPropagation) e.stopPropagation();

                try {
                    if (!UIModule.draggedItem || UIModule.draggedItem === this) {
                        return false;
                    }

                    const draggedIndex = parseInt(UIModule.draggedItem.getAttribute('data-index'));
                    const targetIndex = parseInt(this.getAttribute('data-index'));

                    if (!isNaN(draggedIndex) && !isNaN(targetIndex)) {
                        const success = await TemplatesModule.swap(draggedIndex, targetIndex);

                        if (success) {
                            const listElement = document.getElementById('templates-list-simple');
                            const filterCategory = document.getElementById('category-filter')?.value || 'all';
                            UIModule.renderTemplateList(listElement, filterCategory);
                            UtilsModule.showNotification('Порядок шаблонів змінено!', 'success');
                        } else {
                            UtilsModule.showNotification('Помилка зміни порядку!', 'error');
                        }
                    }
                } catch (error) {
                    console.error('Drag/drop error:', error);
                    UtilsModule.showNotification('Помилка під час зміни порядку!', 'error');
                }

                return false;
            });

            item.addEventListener('dragend', function() {
                this.style.opacity = '1';
                UIModule.draggedItem = null;
                document.querySelectorAll('.template-item-list').forEach(el => {
                    el.classList.remove('drag-over');
                });
            });
        },

        /**
         * Shows the template editor modal
         * @param {Object} template - The template to edit (null for new)
         * @param {number} index - The template index (null for new)
         */
        showTemplateEditor(template = null, index = null) {
            const existingModal = document.querySelector('.add-template-modal-overlay');
            if (existingModal) existingModal.remove();

            const isEditing = template !== null;
            const categories = Array.from(TemplatesModule.getCategories());

            const modalHTML = `
                <div class="add-template-modal-overlay">
                    <div class="add-template-modal">
                        <h3>${isEditing ? 'Редагувати шаблон' : 'Додати новий шаблон'}</h3>
                        <button class="crm-modal-btn-close">&times;</button>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #eee;">
                                Назва шаблону:
                            </label>
                            <input type="text" id="template-title" class="name-input-field"
                                value="${isEditing ? UtilsModule.escapeHtml(template.title) : ''}">
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #eee;">
                                Текст шаблону:
                            </label>
                            <textarea id="template-text" rows="6" class="name-input-field"
                                style="resize: vertical;">${isEditing ? UtilsModule.escapeHtml(template.text) : ''}</textarea>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #eee;">
                                Категорія:
                            </label>
                            <select id="template-category" class="name-input-field">
                                ${categories.map(cat =>
                                    `<option value="${cat}" ${isEditing && template.category === cat ? 'selected' : ''}>${cat}</option>`
                                ).join('')}
                                <option value="Інше" ${isEditing && template.category === 'Інше' ? 'selected' : ''}>Інше</option>
                            </select>
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="cancel-template-btn" class="name-choice-btn-cancel">Скасувати</button>
                            <button id="save-template-btn" class="name-choice-btn-primary">
                                ${isEditing ? 'Оновити' : 'Додати'}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            const modal = document.querySelector('.add-template-modal-overlay');
            const closeModal = () => modal?.remove();

            modal.querySelector('.crm-modal-btn-close').onclick = closeModal;
            document.getElementById('cancel-template-btn').onclick = closeModal;
            modal.onclick = (e) => {
                if (e.target === modal) closeModal();
            };

            document.getElementById('save-template-btn').onclick = async () => {
                const title = document.getElementById('template-title').value.trim();
                const text = document.getElementById('template-text').value.trim();
                const category = document.getElementById('template-category').value;

                if (!title) {
                    UtilsModule.showNotification('Введіть назву шаблону', 'error');
                    document.getElementById('template-title').focus();
                    return;
                }

                if (!text) {
                    UtilsModule.showNotification('Введіть текст шаблону', 'error');
                    document.getElementById('template-text').focus();
                    return;
                }

                if (title.length > 100) {
                    UtilsModule.showNotification('Назва занадто довга (макс. 100)', 'error');
                    return;
                }

                if (text.length > 5000) {
                    UtilsModule.showNotification('Текст занадто довгий (макс. 5000)', 'error');
                    return;
                }

                const newTemplate = {
                    title: title,
                    text: text,
                    category: category,
                    images: []
                };

                let success;
                if (isEditing) {
                    success = await TemplatesModule.update(index, newTemplate);
                } else {
                    const duplicate = TemplatesModule.getAll().find(
                        t => t.title.trim().toLowerCase() === title.toLowerCase()
                    );
                    if (duplicate) {
                        UtilsModule.showNotification('Шаблон з такою назвою вже існує', 'error');
                        return;
                    }
                    success = await TemplatesModule.add(newTemplate);
                }

                if (success) {
                    UtilsModule.showNotification(
                        `Шаблон ${isEditing ? 'оновлено' : 'додано'} успішно!`,
                        'success'
                    );
                    closeModal();

                    const existingPanel = document.querySelector('.keycrm-templates-overlay');
                    if (existingPanel) {
                        existingPanel.remove();
                        setTimeout(() => this.showTemplatesPanel(), 100);
                    }
                } else {
                    UtilsModule.showNotification('Помилка збереження шаблону!', 'error');
                }
            };
        },

        /**
         * Exports templates to JSON file
         */
        exportTemplates() {
            const dataStr = TemplatesModule.export();
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const link = document.createElement('a');
            link.setAttribute('href', dataUri);
            link.setAttribute('download', 'keycrm_templates.json');
            link.click();

            UtilsModule.showNotification('Шаблони експортовано!', 'success');
        },

        /**
         * Imports templates from file
         */
        importTemplates() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.txt';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();

                reader.onload = async (e) => {
                    try {
                        const content = e.target.result;
                        let success;

                        if (file.name.toLowerCase().endsWith('.json')) {
                            success = await TemplatesModule.import(content);
                        } else if (file.name.toLowerCase().endsWith('.txt')) {
                            const templates = TemplatesModule.parseTxt(content);
                            success = await TemplatesModule.save(templates);
                        } else {
                            throw new Error('Непідтримуваний формат файлу');
                        }

                        if (success) {
                            UtilsModule.showNotification('Шаблони успішно імпортовано!', 'success');

                            const existingPanel = document.querySelector('.keycrm-templates-overlay');
                            if (existingPanel) {
                                existingPanel.remove();
                                this.showTemplatesPanel();
                            }
                        } else {
                            throw new Error('Помилка імпорту');
                        }
                    } catch (error) {
                        console.error('Import error:', error);
                        UtilsModule.showNotification('Помилка при імпорті: ' + error.message, 'error');
                    }
                };

                reader.readAsText(file);
            };

            input.click();
        }
    };

    // ============================================================================
    // GREETING MODULE
    // ============================================================================

    /**
     * Greeting module for processing and inserting greetings
     * @namespace GreetingModule
     */
    const GreetingModule = {
        /**
         * Processes client name and inserts greeting
         */
        processAndInsert() {
            const nameElement = document.querySelector(SettingsModule.clientNameSelector);

            if (!nameElement || !nameElement.textContent?.trim()) {
                console.warn('KeyCRM Template Helper: Client name not found.');
                UIModule.showNameChoice();
                return;
            }

            const rawFullName = nameElement.textContent.trim().split(/[\/\\]/)[0].trim();
            const rawFirstName = rawFullName.split(' ')[0];
            const preparedName = UtilsModule.capitalizeFirstLetter(rawFirstName);

            const transliterated = TranslitModule.transliterate(preparedName);
            const finalName = transliterated || preparedName;
            const isCyrillic = /[а-яА-ЯіІїЇєЄґҐ]/.test(finalName);

            if (isCyrillic && transliterated) {
                const message = SettingsModule.messageTemplate
                    .replace('_', UtilsModule.capitalizeFirstLetter(finalName))
                    .replace('_', SettingsModule.myName);
                UIModule.insertText(message);
            } else {
                console.log(`KeyCRM Template Helper: Unknown name "${finalName}".`);
                UIModule.showNameChoice(finalName);
            }
        }
    };

    // ============================================================================
    // BUTTON MODULE
    // ============================================================================

    /**
     * Button module for creating and managing UI buttons
     * @namespace ButtonModule
     */
    const ButtonModule = {
        attemptsCount: 0,
        foundOnce: false,

        /**
         * Creates the greeting button
         * @param {HTMLElement} container - The container element
         */
        createGreetingButton(container) {
            if (container.querySelector('#crm-greeting-button-custom-icon')) return;

            let pressTimer;

            const button = document.createElement('div');
            button.id = 'crm-greeting-button-custom-icon';
            button.className = 'textarea-icon';
            button.setAttribute('data-v-31f5263f', '');
            button.title = 'Вставити привітання (утримуйте для налаштувань)';

            // Створюємо іконку всередині, як нативні іконки KeyCRM
            const icon = document.createElement('i');
            icon.className = 'key-icon key-icon--greeting m-0';
            button.appendChild(icon);

            button.addEventListener('click', () => GreetingModule.processAndInsert());

            button.addEventListener('mousedown', () => {
                pressTimer = setTimeout(() => {
                    UIModule.showAddTranslit();
                }, 800);
            });

            button.addEventListener('mouseup', () => {
                clearTimeout(pressTimer);
            });

            button.addEventListener('mouseleave', () => {
                clearTimeout(pressTimer);
            });

            this.insertButton(container, button);
        },

        /**
         * Creates the templates button
         * @param {HTMLElement} container - The container element
         */
        createTemplatesButton(container) {
            if (container.querySelector('#crm-templates-button-custom-icon')) return;

            const button = document.createElement('div');
            button.id = 'crm-templates-button-custom-icon';
            button.className = 'textarea-icon';
            button.setAttribute('data-v-31f5263f', '');
            button.title = 'Шаблони (Ctrl+Alt+T)';

            // Створюємо іконку всередині, як нативні іконки KeyCRM
            const icon = document.createElement('i');
            icon.className = 'key-icon key-icon--template m-0';
            button.appendChild(icon);

            button.addEventListener('click', () => UIModule.showTemplatesPanel());

            this.insertButton(container, button);
        },

        /**
         * Inserts a button into the container
         * @param {HTMLElement} container - The container element
         * @param {HTMLElement} button - The button element
         */
        insertButton(container, button) {
            const micIcon = container.querySelector('.key-icon--microphone');
            if (micIcon && micIcon.closest('.textarea-icon')) {
                micIcon.closest('.textarea-icon').after(button);
            } else {
                container.appendChild(button);
            }
        },

        /**
         * Ensures buttons exist in the page
         */
        ensureButtons() {
            // Видаляємо всі старі кнопки перед додаванням нових
            document.querySelectorAll('#crm-greeting-button-custom-icon, #crm-templates-button-custom-icon').forEach(btn => btn.remove());

            // Шукаємо контейнер з іконками напряму
            const iconContainers = document.querySelectorAll('.vac-icon-textarea');

            if (iconContainers.length === 0) {
                this.attemptsCount++;
                // Логуємо тільки кожні 20 спроб
                if (!this.foundOnce && this.attemptsCount % 20 === 0) {
                    console.log('KeyCRM Template Helper: .vac-icon-textarea не знайдено (спроб: ' + this.attemptsCount + ')');
                }
                return;
            }

            // Знайшли контейнери
            if (!this.foundOnce) {
                this.foundOnce = true;
                console.log('KeyCRM Template Helper: .vac-icon-textarea знайдено!');
            }

            // Додаємо кнопки тільки в останній контейнер (активний чат)
            const lastContainer = iconContainers[iconContainers.length - 1];
            if (lastContainer) {
                this.createGreetingButton(lastContainer);
                this.createTemplatesButton(lastContainer);
            }
        }
    };

    // ============================================================================
    // KEYBOARD MODULE
    // ============================================================================

    /**
     * Keyboard module for managing keyboard shortcuts
     * @namespace KeyboardModule
     */
    const KeyboardModule = {
        /**
         * Initializes keyboard shortcuts
         */
        initialize() {
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 't') {
                    e.preventDefault();
                    UIModule.showTemplatesPanel();
                }
            });
        }
    };

    // ============================================================================
    // OBSERVER MODULE
    // ============================================================================

    /**
     * Observer module for watching DOM changes
     * @namespace ObserverModule
     */
    const ObserverModule = {
        observer: null,
        debounceTimer: null,

        /**
         * Starts observing DOM changes
         */
        start() {
            this.observer = new MutationObserver(() => {
                // Debounce для уникнення занадто частих викликів
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    ButtonModule.ensureButtons();
                }, 500);
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * Initializes the entire script
     */
    async function initialize() {
        console.log('KeyCRM Template Helper: Initializing...');

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // Initialize modules
        StylesModule.injectStyles();
        await TranslitModule.initialize();
        await TemplatesModule.initialize();
        KeyboardModule.initialize();

        // Ensure buttons exist
        ButtonModule.ensureButtons();

        // Start observing for changes
        ObserverModule.start();

        // Retry button insertion
        setTimeout(() => ButtonModule.ensureButtons(), 1000);
        setTimeout(() => ButtonModule.ensureButtons(), 3000);

        console.log('KeyCRM Template Helper: Initialized successfully!');
    }

    // Start the script
    initialize();

})();
