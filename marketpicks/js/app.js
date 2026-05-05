/**
 * MarketPicks — Основной скрипт приложения
 * Рендер карточек из JSON, генерация UTM, фильтрация, lazy loading
 */

'use strict';

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
    // Замените на ваши реальные данные
    utmSource: 'marketpicks',
    utmMedium: 'referral',
    siteUrl: 'https://your-domain.ru',
    productsJsonPath: '/data/products.json',
    // Количество товаров на главной
    mainPageLimit: 8,
};

// ===== ГЛОБАЛЬНОЕ ХРАНИЛИЩЕ =====
let allProducts = [];
let categoriesData = {};

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initSmoothScroll();
});

// ===== МОБИЛЬНОЕ МЕНЮ =====
function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
            // Анимация иконки
            const icon = btn.querySelector('svg');
            if (icon) {
                icon.classList.toggle('rotate-90');
            }
        });
    }
}

// ===== ПЛАВНАЯ ПРОКРУТКА =====
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ===== ЗАГРУЗКА ДАННЫХ ИЗ JSON =====
async function loadProducts() {
    try {
        const response = await fetch(CONFIG.productsJsonPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        allProducts = data.products || [];
        categoriesData = data.categories || {};
        return data;
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        // Показываем сообщение об ошибке
        const grid = document.getElementById('products-grid') ||
                     document.getElementById('category-products-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-4xl mb-4">⚠️</div>
                    <p class="text-gray-500">Не удалось загрузить товары. Попробуйте обновить страницу.</p>
                </div>
            `;
        }
        return null;
    }
}

// ===== ГЕНЕРАТОР UTM-ССЫЛОК =====
function generateAffiliateUrl(baseUrl, productId, campaign) {
    try {
        const url = new URL(baseUrl);
        url.searchParams.set('utm_source', CONFIG.utmSource);
        url.searchParams.set('utm_medium', CONFIG.utmMedium);
        url.searchParams.set('utm_campaign', campaign || 'product_card');
        url.searchParams.set('utm_content', productId || 'unknown');
        url.searchParams.set('utm_term', new Date().toISOString().slice(0, 10));
        // Добавляем clid если есть (для Яндекс Маркет Партнёрки)
        // url.searchParams.set('clid', 'YOUR_CLID_HERE');
        return url.toString();
    } catch (e) {
        // Если URL невалидный, добавляем параметры вручную
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}utm_source=${CONFIG.utmSource}&utm_medium=${CONFIG.utmMedium}&utm_campaign=${campaign || 'product_card'}&utm_content=${productId}`;
    }
}

// ===== ФОРМАТИРОВАНИЕ ЦЕНЫ =====
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

// ===== ГЕНЕРАЦИЯ ЗВЁЗД РЕЙТИНГА =====
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.3;
    let html = '';

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            html += '<span class="text-yellow-400">★</span>';
        } else if (i === fullStars && hasHalf) {
            html += '<span class="text-yellow-400">★</span>';
        } else {
            html += '<span class="text-gray-300">★</span>';
        }
    }
    return html;
}

// ===== ВЫЧИСЛЕНИЕ СКИДКИ =====
function calcDiscount(price, oldPrice) {
    if (!oldPrice || oldPrice <= price) return 0;
    return Math.round((1 - price / oldPrice) * 100);
}

// ===== РЕНДЕР КАРТОЧКИ ТОВАРА =====
function renderProductCard(product, campaign = 'product_card') {
    const affiliateUrl = generateAffiliateUrl(product.affiliate_link, product.id, campaign);
    const discount = calcDiscount(product.price, product.old_price);
    const stars = renderStars(product.rating);

    // Определяем цвет бейджа
    let badgeColor = 'bg-ym-purple text-white';
    if (product.badge && product.badge.includes('Скидка')) {
        badgeColor = 'bg-red-500 text-white';
    } else if (product.badge && product.badge.includes('комиссия')) {
        badgeColor = 'bg-ym-green text-white';
    } else if (product.badge && product.badge.includes('1000')) {
        badgeColor = 'bg-yellow-500 text-white';
    }

    // CTA текст — варьируем для разнообразия
    const ctaTexts = ['Перейти в магазин', 'Проверить наличие', 'Забрать со скидкой', 'Смотреть на Маркете'];
    const ctaText = discount > 0 ? 'Забрать со скидкой' : ctaTexts[Math.floor(Math.random() * 2)];

    return `
        <article class="product-card bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group flex flex-col"
                 data-product-id="${product.id}"
                 data-categories="${product.category.join(',')}"
                 data-price="${product.price}"
                 data-rating="${product.rating}">

            <!-- Изображение -->
            <div class="relative overflow-hidden bg-gray-50">
                <img src="${product.image}"
                     alt="${product.title}"
                     loading="lazy"
                     decoding="async"
                     class="w-full h-48 sm:h-52 object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22300%22 height=%22200%22/%3E%3Ctext fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2214%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3EФото%3C/text%3E%3C/svg%3E'">

                <!-- Бейдж -->
                ${product.badge ? `
                    <span class="absolute top-3 left-3 ${badgeColor} text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        ${product.badge}
                    </span>
                ` : ''}

                <!-- Скидка -->
                ${discount > 0 ? `
                    <span class="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                        -${discount}%
                    </span>
                ` : ''}

                <!-- Комиссия (для информации партнёра) -->
                ${product.commission_percent >= 15 ? `
                    <span class="absolute bottom-3 right-3 bg-ym-purple/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full" title="Комиссия партнёра">
                        💜 ${product.commission_percent}%
                    </span>
                ` : ''}
            </div>

            <!-- Контент -->
            <div class="p-4 sm:p-5 flex flex-col flex-1">
                <!-- Рейтинг -->
                <div class="flex items-center gap-2 mb-2">
                    <div class="flex text-sm">${stars}</div>
                    <span class="text-sm font-medium text-gray-700">${product.rating}</span>
                    <span class="text-xs text-gray-400">(${product.reviews_count} отзывов)</span>
                </div>

                <!-- Название -->
                <h3 class="font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-ym-purple transition-colors leading-snug">
                    ${product.title}
                </h3>

                <!-- Характеристики -->
                ${product.features ? `
                    <div class="flex flex-wrap gap-1.5 mb-3">
                        ${product.features.slice(0, 3).map(f => `
                            <span class="text-[11px] bg-ym-bg text-ym-purple px-2 py-0.5 rounded-full">${f}</span>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Блок «Почему рекомендую» — сворачиваемый -->
                <details class="mb-4 group/details">
                    <summary class="text-xs text-ym-purple font-medium cursor-pointer hover:text-ym-purple-light select-none">
                        💡 Почему рекомендую ▾
                    </summary>
                    <p class="text-xs text-gray-500 mt-2 leading-relaxed">${product.why_recommended}</p>
                </details>

                <!-- Спейсер для прижатия цены и кнопки вниз -->
                <div class="mt-auto">
                    <!-- Цена -->
                    <div class="flex items-baseline gap-2 mb-4">
                        <span class="text-2xl font-bold text-gray-900">${formatPrice(product.price)}</span>
                        ${product.old_price ? `
                            <span class="text-sm text-gray-400 line-through">${formatPrice(product.old_price)}</span>
                        ` : ''}
                    </div>

                    <!-- CTA кнопка -->
                    <a href="${affiliateUrl}"
                       target="_blank"
                       rel="noopener noreferrer nofollow sponsored"
                       class="cta-button block w-full text-center bg-ym-purple hover:bg-ym-purple-light text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                       onclick="trackClick('${product.id}', '${campaign}')"
                       data-product-id="${product.id}">
                        ${ctaText} →
                    </a>

                    <!-- Мелкий текст -->
                    <p class="text-[10px] text-gray-400 text-center mt-2">
                        Цена на ${new Date().toLocaleDateString('ru-RU')} · Яндекс Маркет
                    </p>
                </div>
            </div>
        </article>
    `;
}

// ===== РЕНДЕР КАРТОЧКИ ДЛЯ ОБЗОРА (расширенная) =====
function renderReviewCard(product, index) {
    const affiliateUrl = generateAffiliateUrl(product.affiliate_link, product.id, 'review_page');
    const discount = calcDiscount(product.price, product.old_price);
    const stars = renderStars(product.rating);

    return `
        <div class="bg-ym-bg rounded-2xl p-6 sm:p-8" id="product-${product.id}">
            <div class="flex items-center gap-3 mb-4">
                <span class="w-10 h-10 bg-ym-purple text-white rounded-full flex items-center justify-center font-bold text-lg">
                    ${index + 1}
                </span>
                <div>
                    <h3 class="text-xl font-bold text-gray-900">${product.title}</h3>
                    <div class="flex items-center gap-2 mt-1">
                        <div class="flex text-sm">${stars}</div>
                        <span class="text-sm text-gray-500">${product.rating} (${product.reviews_count} отзывов)</span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <!-- Изображение -->
                <div class="bg-white rounded-xl p-4 flex items-center justify-center">
                    <img src="${product.image}" alt="${product.title}" loading="lazy" class="max-h-48 object-contain"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2214%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22%3EФото%3C/text%3E%3C/svg%3E'">
                </div>

                <!-- Описание и характеристики -->
                <div class="sm:col-span-2">
                    <p class="text-gray-600 mb-4">${product.why_recommended}</p>

                    ${product.features ? `
                        <div class="mb-4">
                            <h4 class="font-semibold text-sm text-gray-700 mb-2">Ключевые характеристики:</h4>
                            <ul class="grid grid-cols-2 gap-2">
                                ${product.features.map(f => `
                                    <li class="flex items-center text-sm text-gray-600">
                                        <span class="text-ym-green mr-2">✓</span>${f}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    <div class="flex items-center gap-4 flex-wrap">
                        <div>
                            <span class="text-2xl font-bold text-gray-900">${formatPrice(product.price)}</span>
                            ${product.old_price ? `
                                <span class="text-sm text-gray-400 line-through ml-2">${formatPrice(product.old_price)}</span>
                                <span class="text-sm text-red-500 font-semibold ml-1">-${discount}%</span>
                            ` : ''}
                        </div>
                        <a href="${affiliateUrl}"
                           target="_blank"
                           rel="noopener noreferrer nofollow sponsored"
                           class="cta-button inline-flex items-center bg-ym-purple hover:bg-ym-purple-light text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-md"
                           onclick="trackClick('${product.id}', 'review')">
                            Смотреть на Маркете →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== РЕНДЕР СТРОКИ ТАБЛИЦЫ СРАВНЕНИЯ =====
function renderComparisonRow(product) {
    const affiliateUrl = generateAffiliateUrl(product.affiliate_link, product.id, 'comparison_table');
    return `
        <tr class="border-t border-gray-100 hover:bg-ym-bg/50 transition-colors">
            <td class="p-4 font-medium text-gray-900">${product.title}</td>
            <td class="p-4 text-center font-bold">${formatPrice(product.price)}</td>
            <td class="p-4 text-center">
                <span class="text-yellow-400">★</span> ${product.rating}
            </td>
            <td class="p-4 text-center">
                <a href="${affiliateUrl}" target="_blank" rel="noopener noreferrer nofollow sponsored"
                   class="text-ym-purple font-semibold hover:text-ym-purple-light text-sm"
                   onclick="trackClick('${product.id}', 'comparison')">
                    Перейти →
                </a>
            </td>
        </tr>
    `;
}

// ===== УДАЛЕНИЕ СКЕЛЕТОНОВ ЗАГРУЗКИ =====
function removeSkeletons() {
    document.querySelectorAll('.skeleton-card').forEach(el => el.remove());
}

// ===== ИНИЦИАЛИЗАЦИЯ ГЛАВНОЙ СТРАНИЦЫ =====
async function initMainPage() {
    const data = await loadProducts();
    if (!data) return;

    const grid = document.getElementById('products-grid');
    if (!grid) return;

    removeSkeletons();

    // Показываем товары (лимит для главной)
    const productsToShow = allProducts.slice(0, CONFIG.mainPageLimit);
    grid.innerHTML = productsToShow.map(p => renderProductCard(p, 'main_page')).join('');

    // Добавляем Schema.org Product для каждого товара
    injectProductSchema(productsToShow);
}

// ===== ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ КАТЕГОРИИ =====
async function initCategoryPage() {
    const data = await loadProducts();
    if (!data) return;

    // Получаем категорию из URL
    const params = new URLSearchParams(window.location.search);
    const category = params.get('cat');
    const searchQuery = params.get('search');

    // Обновляем заголовок и описание
    updateCategoryHeader(category);

    // Устанавливаем фильтр категории
    const filterCat = document.getElementById('filter-category');
    if (filterCat && category) {
        filterCat.value = category;
    }

    // Устанавливаем поисковый запрос
    const filterSearch = document.getElementById('filter-search');
    if (filterSearch && searchQuery) {
        filterSearch.value = searchQuery;
    }

    // Рендерим товары
    filterAndRenderProducts();

    // Слушатели фильтров
    if (filterCat) filterCat.addEventListener('change', filterAndRenderProducts);
    const filterSort = document.getElementById('filter-sort');
    if (filterSort) filterSort.addEventListener('change', filterAndRenderProducts);
    if (filterSearch) filterSearch.addEventListener('input', debounce(filterAndRenderProducts, 300));

    const filterReset = document.getElementById('filter-reset');
    if (filterReset) filterReset.addEventListener('click', resetFilters);
}

// ===== ОБНОВЛЕНИЕ ЗАГОЛОВКА КАТЕГОРИИ =====
function updateCategoryHeader(category) {
    const titleEl = document.getElementById('category-title');
    const descEl = document.getElementById('category-description');
    const breadcrumbEl = document.getElementById('breadcrumb-current');

    if (category && categoriesData[category]) {
        const cat = categoriesData[category];
        if (titleEl) titleEl.textContent = `${cat.emoji} ${cat.title}`;
        if (descEl) descEl.textContent = cat.description;
        if (breadcrumbEl) breadcrumbEl.textContent = cat.title;
        document.title = `${cat.title} — MarketPicks`;
    }
}

// ===== ФИЛЬТРАЦИЯ И РЕНДЕР =====
function filterAndRenderProducts() {
    const filterCat = document.getElementById('filter-category');
    const filterSort = document.getElementById('filter-sort');
    const filterSearch = document.getElementById('filter-search');

    const category = filterCat ? filterCat.value : 'all';
    const sort = filterSort ? filterSort.value : 'default';
    const search = filterSearch ? filterSearch.value.toLowerCase().trim() : '';

    let filtered = [...allProducts];

    // Фильтр по категории
    if (category !== 'all') {
        filtered = filtered.filter(p => p.category.includes(category));
    }

    // Фильтр по поиску
    if (search) {
        filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(search) ||
            p.why_recommended.toLowerCase().includes(search) ||
            (p.features && p.features.some(f => f.toLowerCase().includes(search)))
        );
    }

    // Сортировка
    switch (sort) {
        case 'price-asc':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filtered.sort((a, b) => b.price - a.price);
            break;
        case 'rating':
            filtered.sort((a, b) => b.rating - a.rating);
            break;
        case 'commission':
            filtered.sort((a, b) => b.commission_percent - a.commission_percent);
            break;
    }

    // Рендер
    const grid = document.getElementById('category-products-grid');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count');

    if (grid) {
        if (filtered.length > 0) {
            grid.innerHTML = filtered.map(p => renderProductCard(p, 'category_page')).join('');
            grid.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('hidden');
        } else {
            grid.innerHTML = '';
            grid.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
        }
    }

    if (resultsCount) {
        const word = getProductWord(filtered.length);
        resultsCount.textContent = `Найдено: ${filtered.length} ${word}`;
    }
}

// ===== СБРОС ФИЛЬТРОВ =====
function resetFilters() {
    const filterCat = document.getElementById('filter-category');
    const filterSort = document.getElementById('filter-sort');
    const filterSearch = document.getElementById('filter-search');

    if (filterCat) filterCat.value = 'all';
    if (filterSort) filterSort.value = 'default';
    if (filterSearch) filterSearch.value = '';

    // Убираем параметры из URL
    window.history.replaceState({}, '', window.location.pathname);

    filterAndRenderProducts();
}

// ===== ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ ОБЗОРА =====
async function initReviewPage() {
    const data = await loadProducts();
    if (!data) return;

    const reviewContainer = document.getElementById('review-products');
    const comparisonTbody = document.getElementById('comparison-tbody');

    if (!reviewContainer) return;

    // Для демо берём товары из категории "home" (можно менять логику)
    const reviewProducts = allProducts.filter(p => p.category.includes('home')).slice(0, 5);

    // Рендер карточек обзора
    reviewContainer.innerHTML = reviewProducts.map((p, i) => renderReviewCard(p, i)).join('');

    // Рендер таблицы сравнения
    if (comparisonTbody) {
        comparisonTbody.innerHTML = reviewProducts.map(p => renderComparisonRow(p)).join('');
    }

    // Schema.org для товаров обзора
    injectProductSchema(reviewProducts);
}

// ===== SCHEMA.ORG — PRODUCT =====
function injectProductSchema(products) {
    products.forEach(product => {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.title,
            "image": product.image,
            "description": product.why_recommended,
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": product.rating.toString(),
                "reviewCount": product.reviews_count.toString(),
                "bestRating": "5"
            },
            "offers": {
                "@type": "Offer",
                "price": product.price.toString(),
                "priceCurrency": "RUB",
                "availability": product.in_stock
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                "url": product.affiliate_link,
                "seller": {
                    "@type": "Organization",
                    "name": "Яндекс Маркет"
                }
            }
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    });
}

// ===== ОТСЛЕЖИВАНИЕ КЛИКОВ =====
function trackClick(productId, campaign) {
    // Отправка события в Яндекс.Метрику (если подключена)
    if (typeof ym !== 'undefined') {
        ym(/* ВАША_МЕТРИКА_ID */ 0, 'reachGoal', 'affiliate_click', {
            product_id: productId,
            campaign: campaign
        });
    }

    // Логирование для отладки
    console.log(`[MarketPicks] Клик: ${productId} | Кампания: ${campaign}`);
}

// ===== ОБРАБОТКА EMAIL-ФОРМЫ =====
function handleEmailSubmit(event) {
    event.preventDefault();
    const form = document.getElementById('email-form');
    const success = document.getElementById('email-success');

    // Здесь можно подключить реальный сервис рассылки:
    // - Mailchimp: https://mailchimp.com/help/add-a-signup-form-to-your-website/
    // - Sendsay: https://sendsay.ru/
    // - Unisender: https://www.unisender.com/

    if (form) form.style.display = 'none';
    if (success) success.classList.remove('hidden');

    // Отправка цели в метрику
    if (typeof ym !== 'undefined') {
        ym(0, 'reachGoal', 'email_subscribe');
    }

    return false;
}

// ===== УТИЛИТЫ =====

// Склонение слова «товар»
function getProductWord(count) {
    const lastTwo = count % 100;
    const lastOne = count % 10;

    if (lastTwo >= 11 && lastTwo <= 19) return 'товаров';
    if (lastOne === 1) return 'товар';
    if (lastOne >= 2 && lastOne <= 4) return 'товара';
    return 'товаров';
}

// Дебаунс для поиска
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== АВТОИНИЦИАЛИЗАЦИЯ ГЛАВНОЙ СТРАНИЦЫ =====
// Проверяем, что мы на главной (есть products-grid, но нет category-products-grid)
if (document.getElementById('products-grid') && !document.getElementById('category-products-grid')) {
    initMainPage();
}