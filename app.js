/* =========================================================
   WORDPATH — Bible Reader & Reflection Companion
   Improved JavaScript
   ========================================================= */

'use strict';

/* -------------------- BIBLE DATA -------------------- */

const BOOKS = [
    ['Genesis',50,'OT','genesis'],['Exodus',40,'OT','exodus'],
    ['Leviticus',27,'OT','leviticus'],['Numbers',36,'OT','numbers'],
    ['Deuteronomy',34,'OT','deuteronomy'],['Joshua',24,'OT','joshua'],
    ['Judges',21,'OT','judges'],['Ruth',4,'OT','ruth'],
    ['1 Samuel',31,'OT','1-samuel'],['2 Samuel',24,'OT','2-samuel'],
    ['1 Kings',22,'OT','1-kings'],['2 Kings',25,'OT','2-kings'],
    ['1 Chronicles',29,'OT','1-chronicles'],['2 Chronicles',36,'OT','2-chronicles'],
    ['Ezra',10,'OT','ezra'],['Nehemiah',13,'OT','nehemiah'],
    ['Esther',10,'OT','esther'],['Job',42,'OT','job'],
    ['Psalms',150,'OT','psalms'],['Proverbs',31,'OT','proverbs'],
    ['Ecclesiastes',12,'OT','ecclesiastes'],['Song of Solomon',8,'OT','song-of-solomon'],
    ['Isaiah',66,'OT','isaiah'],['Jeremiah',52,'OT','jeremiah'],
    ['Lamentations',5,'OT','lamentations'],['Ezekiel',48,'OT','ezekiel'],
    ['Daniel',12,'OT','daniel'],['Hosea',14,'OT','hosea'],['Joel',3,'OT','joel'],
    ['Amos',9,'OT','amos'],['Obadiah',1,'OT','obadiah'],['Jonah',4,'OT','jonah'],
    ['Micah',7,'OT','micah'],['Nahum',3,'OT','nahum'],['Habakkuk',3,'OT','habakkuk'],
    ['Zephaniah',3,'OT','zephaniah'],['Haggai',2,'OT','haggai'],
    ['Zechariah',14,'OT','zechariah'],['Malachi',4,'OT','malachi'],
    ['Matthew',28,'NT','matthew'],['Mark',16,'NT','mark'],['Luke',24,'NT','luke'],
    ['John',21,'NT','john'],['Acts',28,'NT','acts'],['Romans',16,'NT','romans'],
    ['1 Corinthians',16,'NT','1-corinthians'],['2 Corinthians',13,'NT','2-corinthians'],
    ['Galatians',6,'NT','galatians'],['Ephesians',6,'NT','ephesians'],
    ['Philippians',4,'NT','philippians'],['Colossians',4,'NT','colossians'],
    ['1 Thessalonians',5,'NT','1-thessalonians'],['2 Thessalonians',3,'NT','2-thessalonians'],
    ['1 Timothy',6,'NT','1-timothy'],['2 Timothy',4,'NT','2-timothy'],
    ['Titus',3,'NT','titus'],['Philemon',1,'NT','philemon'],
    ['Hebrews',13,'NT','hebrews'],['James',5,'NT','james'],
    ['1 Peter',5,'NT','1-peter'],['2 Peter',3,'NT','2-peter'],
    ['1 John',5,'NT','1-john'],['2 John',1,'NT','2-john'],
    ['3 John',1,'NT','3-john'],['Jude',1,'NT','jude'],
    ['Revelation',22,'NT','revelation']
];

const VERSION_NAMES = {
    kjv: 'English — King James Version',
    tagalog: 'Tagalog — Ang Biblia',
    waray: 'Waray-Waray'
};

const LANGUAGE_CODES = {
    kjv: ['kjv', 'king james'],
    tagalog: ['tagalog', 'tl', 'filipino'],
    waray: ['waray', 'waray-waray', 'waraywaray']
};
let translationCataloguePromise = null;

const STORAGE = {
    bookmarks: 'wordpath-bookmarks',
    completed: 'wordpath-completed',
    journal: 'wordpath-journal',
    theme: 'wordpath-dark',
    fontSize: 'wordpath-font-size'
};

const state = {
    book: 0,
    chapter: 1,
    version: 'kjv',
    verses: [],
    fontSize: 17,
    currentView: 'reader',
    bookmarks: loadJSON('wordpath-bookmarks', []),
    plan: null,
    completed: loadJSON('wordpath-completed', {}),
    chapterRequest: 0,
    quiz: {
        index: 0,
        score: 0,
        answered: false,
        questions: []
    }
};

const $ = id => document.getElementById(id);

/* -------------------- STORAGE & UTILITIES -------------------- */

function loadJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : (JSON.parse(value) ?? fallback);
    } catch (error) {
        console.warn(`WordPath could not read ${key}.`, error);
        return fallback;
    }
}

function persist(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`WordPath could not save ${key}.`, error);
        toast('Could not save on this device. Check browser storage settings.');
        return false;
    }
}

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function toast(message) {
    const element = $('toast');
    if (!element) return;

    element.textContent = message;
    element.classList.add('show');

    clearTimeout(toast.timer);

    toast.timer = setTimeout(
        () => element.classList.remove('show'),
        2600
    );
}

function selectedBook() {
    return BOOKS[state.book] || BOOKS[0];
}

function normalizeBook(value) {
    const query = String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

    if (query === 'psalm') {
        return BOOKS.findIndex(book => book[0] === 'Psalms');
    }

    return BOOKS.findIndex(book =>
        book[0].toLowerCase().replace(/[^a-z0-9]/g, '') === query ||
        book[3].replace(/[^a-z0-9]/g, '') === query
    );
}

function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

/* -------------------- BOOK & CHAPTER SELECTORS -------------------- */

function populateBooks() {
    const select = $('book-select');
    if (!select) return;

    select.innerHTML = '';

    [
        [
            'Old Testament',
            BOOKS.map((book, index) => ({ book, index }))
                .filter(item => item.book[2] === 'OT')
        ],
        [
            'New Testament',
            BOOKS.map((book, index) => ({ book, index }))
                .filter(item => item.book[2] === 'NT')
        ]
    ].forEach(([label, items]) => {
        const group = document.createElement('optgroup');
        group.label = label;

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = String(item.index);
            option.textContent = item.book[0];
            group.appendChild(option);
        });

        select.appendChild(group);
    });

    select.value = String(state.book);
}

function populateChapters() {
    const select = $('chapter-select');
    if (!select) return;

    const total = selectedBook()[1];

    state.chapter = Math.max(
        1,
        Math.min(Number(state.chapter) || 1, total)
    );

    select.innerHTML = Array.from(
        { length: total },
        (_, index) =>
            `<option value="${index + 1}">Chapter ${index + 1}</option>`
    ).join('');

    select.value = String(state.chapter);
}

/* -------------------- BIBLE API -------------------- */

async function fetchJSON(url, timeoutMs = 18000) {
    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        timeoutMs
    );

    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json'
            },
            signal: controller.signal,
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(
                `Bible service returned HTTP ${response.status}.`
            );
        }

        return await response.json();

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(
                'The request took too long. Check your connection and try again.'
            );
        }

        throw error;

    } finally {
        clearTimeout(timer);
    }
}

function normalizeVerses(rawVerses) {
    if (Array.isArray(rawVerses)) {
        return rawVerses.map((verse, index) => {
            if (typeof verse === 'string') {
                return {
                    number: index + 1,
                    text: verse.trim()
                };
            }

            return {
                number: Number(
                    verse.number ??
                    verse.verse ??
                    verse.verseNumber ??
                    index + 1
                ),
                text: String(
                    verse.text ??
                    verse.content ??
                    verse.value ??
                    ''
                ).trim()
            };

        }).filter(verse =>
            Number.isInteger(verse.number) &&
            verse.number > 0 &&
            verse.text
        );
    }

    if (rawVerses && typeof rawVerses === 'object') {
        return Object.entries(rawVerses)
            .filter(([key, value]) =>
                /^\d+$/.test(key) &&
                typeof value === 'string'
            )
            .map(([number, text]) => ({
                number: Number(number),
                text: text.trim()
            }))
            .filter(verse => verse.text)
            .sort((a, b) => a.number - b.number);
    }

    if (typeof rawVerses === 'string') {
        return rawVerses.split(/\r?\n/)
            .filter(Boolean)
            .map((text, index) => ({
                number: index + 1,
                text: text.trim()
            }));
    }

    return [];
}

async function fetchKJV(book, chapter) {
    const filename = `${book[3].replace(/-/g, '_')}.json`;

    const url =
        `https://raw.githubusercontent.com/nolanbaxter/kjv-bible/main/${filename}`;

    const data = await fetchJSON(url);

    const chapters = data.chapters || data;

    const chapterData =
        chapters[chapter] ??
        chapters[String(chapter)] ??
        chapters[`chapter_${chapter}`] ??
        chapters[`Chapter ${chapter}`];

    if (!chapterData) {
        throw new Error(
            'This KJV chapter was not found in the selected Bible dataset.'
        );
    }

    let verses = normalizeVerses(
        chapterData.verses ?? chapterData
    );

    if (!verses.length && Array.isArray(chapterData)) {
        verses = normalizeVerses(chapterData);
    }

    if (!verses.length) {
        throw new Error(
            'The KJV dataset returned an unexpected chapter format.'
        );
    }

    return {
        verses,
        attribution: 'King James Version (public-domain text; KJV Bible JSON corpus)',
        version: VERSION_NAMES.kjv
    };
}

async function getPublishedTranslationCode(language) {
    if (!translationCataloguePromise) {
        translationCataloguePromise = fetchJSON('https://api.getbible.net/v3/translations.json').catch(error => { translationCataloguePromise = null; throw error; });
    }

    const catalogue = await translationCataloguePromise;
    const entries = Object.entries(catalogue || {});
    const aliases = LANGUAGE_CODES[language] || [];

    const match = entries.find(([code, info]) => {
        const searchable = [
            code,
            info?.abbreviation,
            info?.name,
            info?.nameLocal,
            info?.language,
            info?.language?.name,
            info?.language?.nameLocal
        ].filter(Boolean).join(' ').toLowerCase().replace(/[_-]/g, ' ');

        return aliases.some(alias => searchable.includes(alias.replace(/[_-]/g, ' ')));
    });

    if (match) return match[0];
    if (language === 'kjv') return 'kjv';
    if (language === 'tagalog') return 'tagalog';

    throw new Error('A complete Waray-Waray Bible translation is not currently listed in the connected public Bible catalogue. Please use English or Tagalog until a verified Waray text source is connected.');
}

async function fetchChapter(bookIndex, chapter, version = state.version) {
    const book = BOOKS[bookIndex];
    const chapterNumber = Number(chapter);

    if (!book) throw new Error('Please select a valid Bible book.');
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > book[1]) {
        throw new Error(`Choose a chapter from 1 to ${book[1]}.`);
    }
    if (!VERSION_NAMES[version]) throw new Error('Please select English, Tagalog, or Waray-Waray.');

    const translationCode = await getPublishedTranslationCode(version);
    const bookNumber = bookIndex + 1;
    const url = `https://api.getbible.net/v3/${encodeURIComponent(translationCode)}/${bookNumber}/${chapterNumber}.json`;

    const json = await fetchJSON(url);
    const verses = normalizeVerses(json.verses || json.chapter?.verses || json.text);
    if (!verses.length) {
        throw new Error(`The ${VERSION_NAMES[version]} source returned no verses for ${book[0]} ${chapterNumber}.`);
    }

    const translation = json.translation || json.version || {};
    const attribution =
        json.copyright || translation.copyright || translation.distribution_license ||
        (version === 'kjv' ? 'King James Version (public-domain text)' : 'Text supplied by the GetBible public Scripture catalogue; review the translation distribution terms before redistribution.');

    return {
        verses,
        attribution,
        version: translation.name || translation.nameLocal || VERSION_NAMES[version]
    };
}

/* -------------------- CHAPTER LOADING -------------------- */

async function loadChapter(options = {}) {
    if (!options.keepView) showView('reader');

    const bookSelect = $('book-select');
    const chapterSelect = $('chapter-select');
    const versionSelect = $('version-select');

    if (bookSelect) state.book = Number(bookSelect.value);
    if (chapterSelect) state.chapter = Number(chapterSelect.value);
    if (versionSelect) state.version = versionSelect.value;

    const book = selectedBook();
    const chapter = state.chapter;
    const version = state.version;
    const requestId = ++state.chapterRequest;

    setText('passage-title', `${book[0]} ${chapter}`);
    setText('testament-label', book[2] === 'OT' ? 'OLD TESTAMENT' : 'NEW TESTAMENT');
    setText('translation-line', `${VERSION_NAMES[version]} · Chapter ${chapter}`);
    setText('chapter-position', `${book[0]} · ${chapter}`);
    setText('reader-status', 'Connecting to the Bible text service…');
    setText('copyright-note', 'Checking translation attribution…');
    setText('chapter-bookmark', chapterSaved() ? '★' : '☆');

    const verseContainer = $('verses');

    if (verseContainer) {
        verseContainer.innerHTML = `
            <div class="loading-card">
                <span class="loader"></span>
                <p>Loading the full chapter…</p>
            </div>`;
    }

    try {
        const result = await fetchChapter(state.book, chapter, version);

        if (requestId !== state.chapterRequest) return;

        state.verses = result.verses;

        setText(
            'translation-line',
            `${result.version || VERSION_NAMES[version]} · Chapter ${chapter}`
        );

        setText(
            'copyright-note',
            result.attribution
                ? `Translation attribution: ${result.attribution}`
                : 'Bible text provided by an external Bible service. Check the selected translation’s license before redistribution.'
        );

        setText(
            'reader-status',
            `${result.verses.length} verses · Select ☆ beside a verse to save it`
        );

        renderVerses();

    } catch (error) {
        if (requestId !== state.chapterRequest) return;

        state.verses = [];

        if (verseContainer) {
            verseContainer.innerHTML = `
                <div class="empty-state">
                    <strong>We couldn’t load this chapter.</strong>
                    <p>${esc(error.message || 'An unexpected error occurred.')}</p>
                    <p>Check your internet connection, then try again. Bible chapters are retrieved online.</p>
                    <button class="secondary-btn" id="retry-load" type="button">
                        Try again
                    </button>
                </div>`;

            $('retry-load')?.addEventListener('click', () =>
                loadChapter({ keepView: true })
            );
        }

        setText('reader-status', 'Unable to load Scripture');
        setText(
            'copyright-note',
            'An internet connection is required to retrieve Bible chapters.'
        );
    }
}

/* -------------------- VERSE DISPLAY & FILTER -------------------- */

function renderVerses() {
    const container = $('verses');
    if (!container) return;

    const query = ($('verse-filter')?.value || '').trim().toLowerCase();

    const visible = state.verses.filter(verse =>
        !query ||
        verse.text.toLowerCase().includes(query) ||
        String(verse.number) === query
    );

    if (!visible.length) {
        container.innerHTML = `
            <div class="empty-state">
                No verses in this chapter match that word.
            </div>`;
        return;
    }

    container.innerHTML = visible.map(verse => {
        const reference =
            `${selectedBook()[0]} ${state.chapter}:${verse.number}`;

        const saved = state.bookmarks.some(item =>
            item.reference === reference &&
            item.version === state.version
        );

        return `
            <p class="verse-line" id="verse-${verse.number}">
                <span class="verse-num">${verse.number}</span>

                <span class="verse">${esc(verse.text)}</span>

                <span class="verse-actions">
                    <button
                        class="verse-save ${saved ? 'saved' : ''}"
                        data-save-verse="${verse.number}"
                        type="button"
                        title="Save verse"
                        aria-label="Save ${esc(reference)}"
                    >${saved ? '★' : '☆'}</button>

                    <button
                        class="verse-tool"
                        data-copy-verse="${verse.number}"
                        type="button"
                        title="Copy verse"
                        aria-label="Copy ${esc(reference)}"
                    >⧉</button>
                </span>
            </p>`;
    }).join('');

    container.style.fontSize = `${state.fontSize}px`;
}

function chapterSaved() {
    return state.bookmarks.some(item =>
        item.reference === `${selectedBook()[0]} ${state.chapter}` &&
        item.version === state.version &&
        item.isChapter
    );
}

function updateBookmarkCount() {
    setText('bookmark-count', state.bookmarks.length);
}

/* -------------------- BOOKMARKS -------------------- */

function saveVerse(number) {
    const verse = state.verses.find(
        item => Number(item.number) === Number(number)
    );

    if (!verse) return;

    const reference =
        `${selectedBook()[0]} ${state.chapter}:${verse.number}`;

    const index = state.bookmarks.findIndex(item =>
        item.reference === reference &&
        item.version === state.version
    );

    if (index >= 0) {
        state.bookmarks.splice(index, 1);
        toast('Bookmark removed.');
    } else {
        state.bookmarks.unshift({
            reference,
            text: verse.text,
            version: state.version,
            versionName: VERSION_NAMES[state.version],
            savedAt: new Date().toISOString()
        });

        toast('Verse saved to your bookmarks.');
    }

    persist(STORAGE.bookmarks, state.bookmarks);

    updateBookmarkCount();
    renderVerses();

    if (state.currentView === 'saved') {
        renderSaved();
    }
}

function saveChapter() {
    const reference =
        `${selectedBook()[0]} ${state.chapter}`;

    const index = state.bookmarks.findIndex(item =>
        item.reference === reference &&
        item.version === state.version &&
        item.isChapter
    );

    if (index >= 0) {
        state.bookmarks.splice(index, 1);
        toast('Chapter bookmark removed.');
    } else {
        state.bookmarks.unshift({
            reference,
            text: `Bookmark for ${reference}`,
            version: state.version,
            versionName: VERSION_NAMES[state.version],
            isChapter: true,
            savedAt: new Date().toISOString()
        });

        toast('Chapter bookmarked.');
    }

    persist(STORAGE.bookmarks, state.bookmarks);

    setText(
        'chapter-bookmark',
        chapterSaved() ? '★' : '☆'
    );

    updateBookmarkCount();
    renderVerses();
}

function renderSaved() {
    const list = $('saved-list');
    if (!list) return;

    if (!state.bookmarks.length) {
        list.innerHTML = `
            <div class="empty-state">
                No bookmarks yet. Open a chapter and tap ☆ beside a verse to keep it here.
            </div>`;
        return;
    }

    list.innerHTML = state.bookmarks.map((item, index) => `
        <article class="saved-item">
            <div>
                <blockquote>
                    ${item.isChapter
                        ? esc(item.text)
                        : `“${esc(item.text)}”`}
                </blockquote>

                <strong>
                    ${esc(item.reference)} ·
                    ${esc((item.version || 'kjv').toUpperCase())}
                </strong>

                <p>
                    <button
                        class="secondary-btn"
                        data-open-bookmark="${index}"
                        type="button"
                    >
                        Open passage →
                    </button>
                </p>
            </div>

            <button
                data-remove-bookmark="${index}"
                type="button"
                aria-label="Remove ${esc(item.reference)}"
            >
                Remove
            </button>
        </article>
    `).join('');
}

/* -------------------- SECTION NAVIGATION -------------------- */

function showView(view) {
    const allowed = [
        'reader',
        'daily',
        'saved',
        'plans',
        'quiz',
        'journal',
        'saints'
    ];

    if (!allowed.includes(view)) return;

    state.currentView = view;

    allowed.forEach(name => {
        const element = $(
            name === 'reader'
                ? 'reader-section'
                : `${name}-section`
        );

        element?.classList.toggle('hidden', name !== view);
    });

    document.querySelectorAll('.nav-link').forEach(link =>
        link.classList.toggle(
            'active',
            link.dataset.view === view
        )
    );

    if (view === 'saved') renderSaved();
    if (view === 'daily') loadDailyVerse();
    if (view === 'journal') renderJournal();
    if (view === 'quiz') startQuiz();
    if (view === 'saints') renderSaints();

    window.scrollTo({
        top: view === 'reader' ? 300 : 260,
        behavior: 'smooth'
    });
}

/* -------------------- VERSE OF THE DAY -------------------- */

const DAILY = [
    ['Psalm 119:105', 18, 119, 105],
    ['John 3:16', 42, 3, 16],
    ['Proverbs 3:5', 19, 3, 5],
    ['Matthew 11:28', 39, 11, 28],
    ['Romans 8:28', 44, 8, 28],
    ['Isaiah 41:10', 22, 41, 10],
    ['Philippians 4:6', 49, 4, 6]
];

function dailySelection() {
    const now = new Date();

    const dayNumber = Math.floor(
        Date.UTC(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        ) / 86400000
    );

    return DAILY[
        ((dayNumber % DAILY.length) + DAILY.length) %
        DAILY.length
    ];
}

async function loadDailyVerse() {
    const item = dailySelection();

    setText('daily-reference', `${item[0]} · ${VERSION_NAMES[state.version]}`);
    setText('daily-text', 'Loading today’s verse…');

    try {
        const result = await fetchChapter(
            item[1],
            item[2],
            state.version
        );

        const verse = result.verses.find(
            entry => Number(entry.number) === item[3]
        );

        if (!verse) {
            throw new Error('Daily verse was not found.');
        }

        setText('daily-text', `“${verse.text}”`);

    } catch (error) {
        setText(
            'daily-text',
            '“Thy word is a lamp unto my feet, and a light unto my path.”'
        );

        setText(
            'daily-reference',
            `Psalm 119:105 · ${VERSION_NAMES[state.version]} (sample fallback)`
        );
    }
}

/* -------------------- BIBLE REFERENCE SEARCH -------------------- */

function readReference(raw) {
    const input = String(raw || '').trim();

    const match = input.match(
        /^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/
    );

    if (!match) {
        toast('Use a reference like John 3:16, John 3, or Psalm 23.');
        return;
    }

    const bookIndex = normalizeBook(match[1]);

    if (bookIndex < 0) {
        toast('Book not recognized. Try its full name, like 1 Corinthians.');
        return;
    }

    const chapter = Number(match[2]);
    const firstVerse = match[3] ? Number(match[3]) : null;
    const lastVerse = match[4] ? Number(match[4]) : firstVerse;
    const book = BOOKS[bookIndex];

    if (chapter < 1 || chapter > book[1]) {
        toast(`${book[0]} has ${book[1]} chapters. Choose a valid chapter.`);
        return;
    }

    if (
        firstVerse !== null &&
        (firstVerse < 1 ||
        (lastVerse !== null && lastVerse < firstVerse))
    ) {
        toast('Please enter a valid verse number or verse range.');
        return;
    }

    state.book = bookIndex;
    state.chapter = chapter;

    if ($('book-select')) {
        $('book-select').value = String(bookIndex);
    }

    populateChapters();

    if ($('chapter-select')) {
        $('chapter-select').value = String(chapter);
    }

    loadChapter().then(() => {
        if (firstVerse === null) return;

        if ($('verse-filter')) {
            $('verse-filter').value = '';
        }

        renderVerses();

        const first = $(`verse-${firstVerse}`);

        if (!first) {
            toast('That verse number was not found in the loaded chapter.');
            return;
        }

        first.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        if (lastVerse && lastVerse > firstVerse) {
            const last = $(`verse-${lastVerse}`);

            if (last) {
                document.querySelectorAll('.verse-line.range-highlight')
                    .forEach(element =>
                        element.classList.remove('range-highlight')
                    );

                for (
                    let number = firstVerse;
                    number <= lastVerse;
                    number++
                ) {
                    $(`verse-${number}`)?.classList.add('range-highlight');
                }

                setTimeout(() => {
                    document.querySelectorAll('.verse-line.range-highlight')
                        .forEach(element =>
                            element.classList.remove('range-highlight')
                        );
                }, 2500);
            }
        }
    });
}

/* -------------------- READING PLANS -------------------- */

const PLANS = {
    peace: {
        title: 'Peace for the Week',
        days: [
            ['Psalms', 23],
            ['Matthew', 6],
            ['John', 14],
            ['Philippians', 4],
            ['Isaiah', 41],
            ['Psalms', 46],
            ['Romans', 8]
        ]
    },

    jesus: {
        title: 'Meet Jesus',
        days: [
            ['John', 1],
            ['Mark', 1],
            ['Luke', 5],
            ['Matthew', 5],
            ['John', 10],
            ['Luke', 15],
            ['Matthew', 11],
            ['John', 13],
            ['John', 14],
            ['Mark', 4],
            ['Luke', 22],
            ['John', 19],
            ['John', 20],
            ['Matthew', 28]
        ]
    },

    foundations: {
        title: 'Start with Scripture',
        days: [
            ['Genesis', 1],
            ['Psalms', 1],
            ['Proverbs', 3],
            ['Matthew', 5],
            ['John', 1],
            ['Romans', 8],
            ['Psalms', 23],
            ['Luke', 15],
            ['Ephesians', 2],
            ['Philippians', 4],
            ['Isaiah', 40],
            ['John', 15],
            ['1 Corinthians', 13],
            ['Psalms', 46],
            ['Matthew', 6],
            ['James', 1],
            ['Romans', 12],
            ['Colossians', 3],
            ['Psalms', 121],
            ['John', 14],
            ['Micah', 6],
            ['Hebrews', 11],
            ['Galatians', 5],
            ['Psalms', 91],
            ['Matthew', 11],
            ['2 Timothy', 3],
            ['1 John', 4],
            ['Romans', 5],
            ['Revelation', 21],
            ['Psalms', 150]
        ]
    }
};

function renderPlan(id) {
    const plan = PLANS[id];
    const container = $('plan-progress');

    if (!plan || !container) return;

    state.plan = id;

    const completed = safeArray(state.completed[id]);

    container.classList.remove('hidden');

    container.innerHTML = `
        <h3>${esc(plan.title)}</h3>

        <p>
            ${completed.length} of ${plan.days.length} readings completed
        </p>

        ${plan.days.map((day, index) => `
            <label class="plan-day">
                <input
                    type="checkbox"
                    data-plan-day="${index}"
                    ${completed.includes(index) ? 'checked' : ''}
                >

                <span>
                    Day ${index + 1}: ${esc(day[0])} ${day[1]}
                </span>

                <button
                    class="secondary-btn"
                    data-plan-open="${index}"
                    type="button"
                    style="margin-left:auto;padding:7px 10px"
                >
                    Read →
                </button>
            </label>
        `).join('')}
    `;

    container.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    });
}

/* -------------------- BIBLE QUIZ -------------------- */

const QUIZ_QUESTIONS = [
    {
        q: 'Who built the ark?',
        a: ['Moses', 'Noah', 'Abraham', 'David'],
        correct: 1,
        note: 'Noah built the ark as God instructed him.'
    },
    {
        q: 'Who led the Israelites out of Egypt?',
        a: ['Joshua', 'Joseph', 'Moses', 'Aaron'],
        correct: 2,
        note: 'Moses led the Israelites out of Egypt.'
    },
    {
        q: 'Where was Jesus born?',
        a: ['Nazareth', 'Jerusalem', 'Bethlehem', 'Capernaum'],
        correct: 2,
        note: 'Jesus was born in Bethlehem.'
    },
    {
        q: 'Who defeated Goliath?',
        a: ['David', 'Saul', 'Jonathan', 'Solomon'],
        correct: 0,
        note: 'David defeated Goliath with a sling and a stone.'
    },
    {
        q: 'How many disciples did Jesus choose?',
        a: ['7', '10', '12', '14'],
        correct: 2,
        note: 'Jesus chose twelve disciples.'
    },
    {
        q: 'Who was swallowed by a great fish?',
        a: ['Jonah', 'Elijah', 'Peter', 'Job'],
        correct: 0,
        note: 'Jonah was swallowed by a great fish.'
    },
    {
        q: 'What is the first book of the Bible?',
        a: ['Exodus', 'Genesis', 'Psalms', 'Matthew'],
        correct: 1,
        note: 'Genesis is the first book of the Bible.'
    },
    {
        q: 'Which apostle denied Jesus three times?',
        a: ['John', 'James', 'Thomas', 'Peter'],
        correct: 3,
        note: 'Peter denied knowing Jesus three times before the rooster crowed.'
    },
    {
        q: 'Who received the Ten Commandments?',
        a: ['Moses', 'Noah', 'Isaiah', 'Paul'],
        correct: 0,
        note: 'Moses received the commandments on Mount Sinai.'
    },
    {
        q: 'Which book tells about the creation of the world?',
        a: ['Revelation', 'Acts', 'Genesis', 'Romans'],
        correct: 2,
        note: 'Genesis opens with the account of creation.'
    },
    {
        q: 'Who was known for great wisdom and was a king of Israel?',
        a: ['Solomon', 'Samson', 'Samuel', 'Gideon'],
        correct: 0,
        note: 'King Solomon was renowned for his wisdom.'
    },
    {
        q: 'What was Jesus’ first recorded miracle in the Gospel of John?',
        a: [
            'Healing a blind man',
            'Walking on water',
            'Turning water into wine',
            'Feeding five thousand'
        ],
        correct: 2,
        note: 'Jesus turned water into wine at a wedding in Cana.'
    }
];

function shuffle(items) {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index--) {
        const random = Math.floor(Math.random() * (index + 1));

        [copy[index], copy[random]] =
            [copy[random], copy[index]];
    }

    return copy;
}

function startQuiz() {
    state.quiz = {
        index: 0,
        score: 0,
        answered: false,
        questions: shuffle(QUIZ_QUESTIONS).slice(0, 8)
    };

    renderQuizQuestion();
}

function renderQuizQuestion() {
    const quiz = state.quiz;
    const total = quiz.questions.length;
    const question = quiz.questions[quiz.index];
    const nextButton = $('quiz-next');

    setText('quiz-score', `Score: ${quiz.score}`);
    setText('quiz-feedback', 'Choose an answer to continue.');

    if (!question) {
        setText('quiz-progress', 'QUIZ COMPLETE');

        setText(
            'quiz-question',
            `You scored ${quiz.score} out of ${total}!`
        );

        if ($('quiz-options')) {
            $('quiz-options').innerHTML = `
                <p>
                    Well done! Keep learning and growing in Scripture.
                </p>`;
        }

        setText(
            'quiz-feedback',
            quiz.score === total
                ? 'Perfect score! Excellent work.'
                : 'Thank you for playing. Try again to improve your score.'
        );

        if (nextButton) {
            nextButton.disabled = true;
            nextButton.textContent = 'Quiz completed';
        }

        if ($('quiz-progress-fill')) {
            $('quiz-progress-fill').style.width = '100%';
        }

        return;
    }

    setText(
        'quiz-progress',
        `QUESTION ${quiz.index + 1} OF ${total}`
    );

    setText('quiz-question', question.q);

    if ($('quiz-progress-fill')) {
        $('quiz-progress-fill').style.width =
            `${(quiz.index / total) * 100}%`;
    }

    if (nextButton) {
        nextButton.disabled = true;

        nextButton.textContent =
            quiz.index === total - 1
                ? 'See results →'
                : 'Next question →';
    }

    const options = $('quiz-options');
    if (!options) return;

    options.innerHTML = question.a.map((answer, index) => `
        <button
            class="quiz-option"
            type="button"
            data-quiz-answer="${index}"
        >
            <span>${String.fromCharCode(65 + index)}.</span>
            ${esc(answer)}
        </button>
    `).join('');
}

function answerQuiz(index) {
    const quiz = state.quiz;
    const question = quiz.questions[quiz.index];

    if (!question || quiz.answered) return;

    quiz.answered = true;

    const correct = index === question.correct;

    if (correct) {
        quiz.score++;
    }

    document.querySelectorAll('[data-quiz-answer]').forEach(button => {
        const answerIndex = Number(button.dataset.quizAnswer);

        button.disabled = true;

        if (answerIndex === question.correct) {
            button.classList.add('correct');
        } else if (answerIndex === index) {
            button.classList.add('incorrect');
        }
    });

    setText('quiz-score', `Score: ${quiz.score}`);

    setText(
        'quiz-feedback',
        `${correct ? 'Correct!' : 'Not quite.'} ${question.note}`
    );

    if ($('quiz-next')) {
        $('quiz-next').disabled = false;
    }
}

function nextQuizQuestion() {
    if (!state.quiz.answered) return;

    state.quiz.index++;
    state.quiz.answered = false;

    renderQuizQuestion();
}

/* -------------------- PRAYER JOURNAL -------------------- */

let journalEntries = loadJSON(STORAGE.journal, []);

if (!Array.isArray(journalEntries)) {
    journalEntries = [];
}

function renderJournal() {
    const list = $('journal-list');
    if (!list) return;

    setText(
        'journal-count',
        `${journalEntries.length} ${
            journalEntries.length === 1 ? 'entry' : 'entries'
        }`
    );

    if (!journalEntries.length) {
        list.innerHTML = `
            <div class="empty-state">
                Your reflections will appear here after you save your first entry.
            </div>`;
        return;
    }

    list.innerHTML = journalEntries.map((entry, index) => `
        <article class="journal-entry-card">
            <h4>${esc(entry.title)}</h4>

            <div class="journal-entry-meta">
                ${esc(entry.date)} · ${esc(entry.mood)}
                ${entry.reference ? ` · ${esc(entry.reference)}` : ''}
            </div>

            <p>
                ${esc(
                    entry.body.length > 320
                        ? entry.body.slice(0, 320) + '…'
                        : entry.body
                )}
            </p>

            <div class="journal-entry-actions">
                <button
                    type="button"
                    data-journal-copy="${index}"
                >
                    Copy
                </button>

                <button
                    type="button"
                    data-journal-delete="${index}"
                >
                    Delete
                </button>
            </div>
        </article>
    `).join('');
}

async function copyText(text) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    const field = document.createElement('textarea');

    field.value = text;
    field.setAttribute('readonly', '');

    field.style.position = 'fixed';
    field.style.opacity = '0';

    document.body.appendChild(field);

    field.select();

    const copied = document.execCommand('copy');

    field.remove();

    if (!copied) {
        throw new Error('Copy is not available in this browser.');
    }

    return true;
}

/* -------------------- SAINTS LIBRARY -------------------- */

const SAINTS = [
    {
        name: 'Saint Peter',
        title: 'Apostle and witness',
        category: 'apostle',
        virtue: 'Faith and courage',
        patronage: 'Often associated with fishermen and the Church',
        reflection: 'Peter’s story reminds us that faith can grow even after failure. A sincere return to God can become a new beginning.'
    },
    {
        name: 'Saint Paul',
        title: 'Apostle to the Gentiles',
        category: 'apostle',
        virtue: 'Perseverance and mission',
        patronage: 'Often associated with missionaries and writers',
        reflection: 'Paul’s life speaks of transformation, commitment, and sharing hope with others.'
    },
    {
        name: 'Saint Francis of Assisi',
        title: 'Brother to all creation',
        category: 'charity',
        virtue: 'Simplicity and compassion',
        patronage: 'Often associated with animals and ecology',
        reflection: 'His example invites us to live simply, care for creation, and serve people with humility.'
    },
    {
        name: 'Saint Teresa of Calcutta',
        title: 'Servant of the poor',
        category: 'charity',
        virtue: 'Mercy and service',
        patronage: 'Often associated with charitable works',
        reflection: 'Small acts of love, offered with sincerity, can bring dignity and comfort to others.'
    },
    {
        name: 'Saint Vincent de Paul',
        title: 'Priest and servant',
        category: 'charity',
        virtue: 'Generosity and service',
        patronage: 'Often associated with charitable organizations',
        reflection: 'His life encourages practical compassion and care for people experiencing poverty.'
    },
    {
        name: 'Saint Augustine',
        title: 'Bishop and teacher',
        category: 'prayer',
        virtue: 'Wisdom and conversion',
        patronage: 'Often associated with theologians and seekers',
        reflection: 'Augustine’s journey reminds us to keep seeking truth and to let love shape our choices.'
    },
    {
        name: 'Saint Thomas Aquinas',
        title: 'Priest and theologian',
        category: 'prayer',
        virtue: 'Wisdom and learning',
        patronage: 'Often associated with students and scholars',
        reflection: 'Faith and thoughtful study can work together in the search for truth.'
    },
    {
        name: 'Saint Monica',
        title: 'Mother and faithful example',
        category: 'prayer',
        virtue: 'Patience and prayer',
        patronage: 'Often associated with mothers and difficult family situations',
        reflection: 'Her example highlights patient love, persistent prayer, and hope for loved ones.'
    },
    {
        name: 'Saint Joan of Arc',
        title: 'Witness of courage',
        category: 'courage',
        virtue: 'Courage and conviction',
        patronage: 'Often associated with courage and service',
        reflection: 'Her story invites reflection on conscience, bravery, and remaining steadfast in difficult circumstances.'
    },
    {
        name: 'Saint Maximilian Kolbe',
        title: 'Priest and martyr',
        category: 'courage',
        virtue: 'Self-giving love',
        patronage: 'Often associated with families and prisoners',
        reflection: 'His witness is remembered as an extraordinary act of self-sacrifice and love for another.'
    },
    {
        name: 'Saint Stephen',
        title: 'The first Christian martyr',
        category: 'courage',
        virtue: 'Faithfulness and forgiveness',
        patronage: 'Remembered as a deacon and martyr',
        reflection: 'Stephen’s witness calls us to hold to our convictions and respond to others without hatred.'
    },
    {
        name: 'Saint Mary Magdalene',
        title: 'Disciple and witness',
        category: 'apostle',
        virtue: 'Devotion and hope',
        patronage: 'Remembered as a witness to the Resurrection',
        reflection: 'Her story points to faithful devotion and the hope at the heart of the Resurrection.'
    }
];

function renderSaints() {
    const grid = $('saints-grid');
    if (!grid) return;

    const query = ($('saint-search')?.value || '').trim().toLowerCase();
    const category = $('saint-filter')?.value || 'all';

    const matches = SAINTS.filter(saint => {
        const text = `
            ${saint.name}
            ${saint.title}
            ${saint.virtue}
            ${saint.patronage}
            ${saint.reflection}
        `.toLowerCase();

        return (
            (category === 'all' || saint.category === category) &&
            (!query || text.includes(query))
        );
    });

    if (!matches.length) {
        grid.innerHTML = `
            <div class="empty-state">
                No saints match your search. Try another name or filter.
            </div>`;
        return;
    }

    grid.innerHTML = matches.map(saint => `
        <article class="saint-card">
            <div class="saint-card-symbol" aria-hidden="true">✦</div>

            <p class="eyebrow">${esc(saint.title)}</p>

            <h3>${esc(saint.name)}</h3>

            <strong>${esc(saint.virtue)}</strong>

            <p>${esc(saint.reflection)}</p>

            <small>${esc(saint.patronage)}</small>
        </article>
    `).join('');
}

/* -------------------- EVENT LISTENERS -------------------- */

function bindEvents() {

    document.querySelectorAll('.nav-link').forEach(button => {
        button.addEventListener('click', () =>
            showView(button.dataset.view)
        );
    });

    $('start-reading')?.addEventListener('click', () => {
        showView('reader');

        $('reader-section')?.scrollIntoView({
            behavior: 'smooth'
        });
    });

    $('book-select')?.addEventListener('change', () => {
        state.book = Number($('book-select').value);
        state.chapter = 1;
        populateChapters();
    });

    $('chapter-select')?.addEventListener('change', () => {
        state.chapter = Number($('chapter-select').value);
    });

    $('version-select')?.addEventListener('change', () => {
        state.version = $('version-select').value;
        loadChapter({ keepView: true });
        if (state.currentView === 'daily') loadDailyVerse();
    });

    $('load-chapter')?.addEventListener('click', () =>
        loadChapter()
    );

    $('reference-form')?.addEventListener('submit', event => {
        event.preventDefault();
        readReference($('reference-search')?.value);
    });

    $('verse-filter')?.addEventListener('input', renderVerses);

    $('clear-filter')?.addEventListener('click', () => {
        if ($('verse-filter')) {
            $('verse-filter').value = '';
        }

        renderVerses();
    });

    $('chapter-bookmark')?.addEventListener('click', saveChapter);

    $('verses')?.addEventListener('click', async event => {
        const saveButton = event.target.closest('[data-save-verse]');
        const copyButton = event.target.closest('[data-copy-verse]');

        if (saveButton) {
            saveVerse(saveButton.dataset.saveVerse);
        }

        if (copyButton) {
            const number = Number(copyButton.dataset.copyVerse);

            const verse = state.verses.find(
                item => Number(item.number) === number
            );

            if (!verse) return;

            const text =
                `${verse.text} — ${selectedBook()[0]} ${state.chapter}:${number} (${VERSION_NAMES[state.version]})`;

            try {
                await copyText(text);
                toast('Verse copied.');
            } catch {
                toast('Copy is not available in this browser.');
            }
        }
    });

    /* PREVIOUS CHAPTER */

    $('previous-chapter')?.addEventListener('click', () => {

        if (state.chapter > 1) {
            state.chapter--;

        } else if (state.book > 0) {
            state.book--;

            state.chapter = BOOKS[state.book][1];

            if ($('book-select')) {
                $('book-select').value = String(state.book);
            }

        } else {
            toast('You are at the beginning of the Bible.');
            return;
        }

        populateChapters();
        loadChapter();
    });

    /* NEXT CHAPTER */

    $('next-chapter')?.addEventListener('click', () => {

        if (state.chapter < selectedBook()[1]) {
            state.chapter++;

        } else if (state.book < BOOKS.length - 1) {
            state.book++;
            state.chapter = 1;

            if ($('book-select')) {
                $('book-select').value = String(state.book);
            }

        } else {
            toast('You have reached the end of the Bible.');
            return;
        }

        populateChapters();
        loadChapter();
    });

    /* FONT SIZE */

    $('font-down')?.addEventListener('click', () => {
        state.fontSize = Math.max(13, state.fontSize - 1);
        applyFontSize();
    });

    $('font-up')?.addEventListener('click', () => {
        state.fontSize = Math.min(25, state.fontSize + 1);
        applyFontSize();
    });

    /* DARK MODE */

    $('theme-toggle')?.addEventListener('click', toggleTheme);

    /* BOOKMARK EVENTS */

    $('saved-list')?.addEventListener('click', event => {

        const openButton = event.target.closest('[data-open-bookmark]');
        const removeButton = event.target.closest('[data-remove-bookmark]');

        if (removeButton) {
            const index = Number(removeButton.dataset.removeBookmark);

            if (Number.isInteger(index) && state.bookmarks[index]) {
                state.bookmarks.splice(index, 1);

                persist(STORAGE.bookmarks, state.bookmarks);

                updateBookmarkCount();
                renderSaved();
            }
        }

        if (openButton) {
            const item =
                state.bookmarks[Number(openButton.dataset.openBookmark)];

            if (item) {
                const reference = item.reference;

                if (item.version && $('version-select')) {
                    $('version-select').value = item.version;
                }

                state.version = item.version || state.version;

                readReference(reference);
            }
        }
    });

    /* DAILY VERSE BUTTONS */

    $('daily-read')?.addEventListener('click', () => {
        readReference(
            ($('daily-reference')?.textContent || '').split(' · ')[0]
        );
    });

    $('daily-save')?.addEventListener('click', async () => {

        const reference =
            ($('daily-reference')?.textContent || '').split(' · ')[0];

        const match = reference.match(/^(.+?)\s+(\d+):(\d+)$/);

        if (!match) return;

        const bookIndex = normalizeBook(match[1]);

        if (bookIndex < 0) return;

        try {
            const result = await fetchChapter(
                bookIndex,
                Number(match[2]),
                state.version
            );

            const verse = result.verses.find(
                item => Number(item.number) === Number(match[3])
            );

            if (!verse) {
                throw new Error('Verse not found.');
            }

            const exists = state.bookmarks.some(item =>
                item.reference === reference &&
                item.version === state.version
            );

            if (exists) {
                toast('That verse is already saved.');
                return;
            }

            state.bookmarks.unshift({
                reference,
                text: verse.text,
                version: state.version,
                versionName: VERSION_NAMES[state.version],
                savedAt: new Date().toISOString()
            });

            persist(STORAGE.bookmarks, state.bookmarks);

            updateBookmarkCount();

            toast('Daily verse saved.');

        } catch {
            toast('Connect to the internet to save this verse.');
        }
    });

    /* READING PLAN EVENTS */

    document.querySelectorAll('.plan-start').forEach(button => {
        button.addEventListener('click', () =>
            renderPlan(button.dataset.plan)
        );
    });

    $('plan-progress')?.addEventListener('change', event => {

        if (
            !event.target.matches('[data-plan-day]') ||
            !state.plan
        ) {
            return;
        }

        const index = Number(event.target.dataset.planDay);

        const done = safeArray(state.completed[state.plan]);

        state.completed[state.plan] = event.target.checked
            ? [...new Set([...done, index])]
            : done.filter(item => item !== index);

        persist(STORAGE.completed, state.completed);

        renderPlan(state.plan);
    });

    $('plan-progress')?.addEventListener('click', event => {

        const button = event.target.closest('[data-plan-open]');

        if (!button || !state.plan) return;

        const day = PLANS[state.plan].days[
            Number(button.dataset.planOpen)
        ];

        if (day) {
            readReference(`${day[0]} ${day[1]}`);
        }
    });

    /* PRAYER JOURNAL FORM */

    $('journal-form')?.addEventListener('submit', event => {

        event.preventDefault();

        const title = $('journal-title')?.value.trim() || '';
        const body = $('journal-entry')?.value.trim() || '';

        if (!title || !body) {
            toast('Add a title and reflection first.');
            return;
        }

        journalEntries.unshift({
            title,
            body,
            mood: $('journal-mood')?.value || 'Reflective',
            reference: $('journal-verse')?.value.trim() || '',

            date: new Date().toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),

            createdAt: new Date().toISOString()
        });

        if (persist(STORAGE.journal, journalEntries)) {
            $('journal-form').reset();

            renderJournal();

            toast('Your reflection was saved on this device.');
        }
    });

    /* JOURNAL COPY AND DELETE */

    $('journal-list')?.addEventListener('click', async event => {

        const deleteButton =
            event.target.closest('[data-journal-delete]');

        const copyButton =
            event.target.closest('[data-journal-copy]');

        if (deleteButton) {

            journalEntries.splice(
                Number(deleteButton.dataset.journalDelete),
                1
            );

            persist(STORAGE.journal, journalEntries);

            renderJournal();

            toast('Journal entry deleted.');
        }

        if (copyButton) {

            const entry =
                journalEntries[Number(copyButton.dataset.journalCopy)];

            if (!entry) return;

            try {
                await copyText(
                    `${entry.title}\n${entry.body}${entry.reference ? `\n${entry.reference}` : ''}`
                );

                toast('Journal entry copied.');

            } catch {
                toast('Copy is not available in this browser.');
            }
        }
    });

    /* QUIZ EVENTS */

    $('quiz-options')?.addEventListener('click', event => {

        const button = event.target.closest('[data-quiz-answer]');

        if (button) {
            answerQuiz(Number(button.dataset.quizAnswer));
        }
    });

    $('quiz-next')?.addEventListener('click', nextQuizQuestion);

    $('quiz-restart')?.addEventListener('click', startQuiz);

    /* SAINTS SEARCH AND FILTER */

    $('saint-search')?.addEventListener('input', renderSaints);

    $('saint-filter')?.addEventListener('change', renderSaints);

    /* INSTALL APP */

    $('install-app')?.addEventListener('click', installApp);
}

/* -------------------- THEME, FONT & PWA -------------------- */

function applyFontSize() {
    const verses = $('verses');

    if (verses) {
        verses.style.fontSize = `${state.fontSize}px`;
    }

    persist(STORAGE.fontSize, state.fontSize);
}

function applySavedTheme() {
    try {
        const dark = localStorage.getItem(STORAGE.theme) === '1';

        document.body.classList.toggle('dark', dark);

    } catch (error) {
        console.warn(
            'WordPath could not restore the theme preference.',
            error
        );
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark');

    try {
        localStorage.setItem(
            STORAGE.theme,
            document.body.classList.contains('dark') ? '1' : '0'
        );

    } catch (error) {
        console.warn(
            'WordPath could not save the theme preference.',
            error
        );
    }
}

/* -------------------- PWA INSTALLATION -------------------- */

let installPromptEvent = null;

window.addEventListener('beforeinstallprompt', event => {

    event.preventDefault();

    installPromptEvent = event;

    const button = $('install-app');

    if (button) {
        button.hidden = false;
    }
});

window.addEventListener('appinstalled', () => {

    installPromptEvent = null;

    const button = $('install-app');

    if (button) {
        button.textContent = 'Installed';
    }

    toast('WordPath was installed successfully.');
});

async function installApp() {

    if (!installPromptEvent) {
        toast(
            'To install WordPath, use your browser menu and choose Install app or Add to Home screen.'
        );

        return;
    }

    installPromptEvent.prompt();

    try {
        await installPromptEvent.userChoice;

    } finally {
        installPromptEvent = null;
    }
}

/* -------------------- INITIALIZATION -------------------- */

const AUTH_STORAGE_KEY = 'wordpath-local-accounts-v1';
const AUTH_SESSION_KEY = 'wordpath-active-session-v1';

function readAccounts() {
    const accounts = loadJSON(AUTH_STORAGE_KEY, []);
    return Array.isArray(accounts) ? accounts : [];
}

function setAuthMessage(message, success = false) {
    const element = $('auth-message');
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('success', success);
}

async function passwordDigest(password, salt) {
    if (!window.crypto?.subtle) {
        throw new Error('Secure password storage requires HTTPS or localhost. Open WordPath from a secure web address.');
    }
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 120000,
        hash: 'SHA-256'
    }, key, 256);
    return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

function showAuthMode(mode) {
    const login = mode === 'login';
    $('login-form')?.classList.toggle('hidden', !login);
    $('register-form')?.classList.toggle('hidden', login);
    $('show-login')?.classList.toggle('active', login);
    $('show-register')?.classList.toggle('active', !login);
    setText('auth-title', login ? 'Welcome back' : 'Create your account');
    setAuthMessage('');
}

function openAuthenticatedApp(account) {
    $('auth-screen')?.classList.add('hidden');
    $('app-shell')?.classList.remove('hidden');
    setText('signed-in-user', account.name || account.email);
    try {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ email: account.email }));
    } catch (error) {
        console.warn('Could not save the current sign-in session.', error);
    }
    initializeAuthenticatedApp();
}

function closeAuthenticatedApp() {
    try { sessionStorage.removeItem(AUTH_SESSION_KEY); } catch (error) { /* storage may be blocked */ }
    $('app-shell')?.classList.add('hidden');
    $('auth-screen')?.classList.remove('hidden');
    $('login-form')?.reset();
    $('register-form')?.reset();
    showAuthMode('login');
    setAuthMessage('You have been logged out.', true);
}

function bindAuthEvents() {
    $('show-login')?.addEventListener('click', () => showAuthMode('login'));
    $('show-register')?.addEventListener('click', () => showAuthMode('register'));
    $('logout-button')?.addEventListener('click', closeAuthenticatedApp);

    $('register-form')?.addEventListener('submit', async event => {
        event.preventDefault();
        const name = $('register-name').value.trim();
        const email = $('register-email').value.trim().toLowerCase();
        const password = $('register-password').value;
        const confirm = $('register-confirm').value;
        if (password.length < 8) return setAuthMessage('Use a password with at least 8 characters.');
        if (password !== confirm) return setAuthMessage('The passwords do not match.');

        const accounts = readAccounts();
        if (accounts.some(account => account.email === email)) {
            return setAuthMessage('An account with this email already exists. Please log in.');
        }

        try {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const saltText = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');
            const passwordHash = await passwordDigest(password, saltText);
            accounts.push({ name, email, salt: saltText, passwordHash, createdAt: new Date().toISOString() });
            if (!persist(AUTH_STORAGE_KEY, accounts)) return setAuthMessage('Could not save your account in this browser.');
            $('register-form').reset();
            showAuthMode('login');
            $('login-email').value = email;
            setAuthMessage('Account created. Please log in with your new credentials.', true);
        } catch (error) {
            setAuthMessage(error.message || 'Registration failed. Please try again.');
        }
    });

    $('login-form')?.addEventListener('submit', async event => {
        event.preventDefault();
        const email = $('login-email').value.trim().toLowerCase();
        const password = $('login-password').value;
        const account = readAccounts().find(item => item.email === email);
        if (!account) return setAuthMessage('No account was found for that email. Create an account first.');
        try {
            const candidate = await passwordDigest(password, account.salt);
            if (candidate !== account.passwordHash) return setAuthMessage('Incorrect email or password.');
            $('login-form').reset();
            openAuthenticatedApp(account);
        } catch (error) {
            setAuthMessage(error.message || 'Login failed. Please try again.');
        }
    });
}

let authenticatedAppInitialized = false;
function initializeAuthenticatedApp() {
    if (authenticatedAppInitialized) return;
    authenticatedAppInitialized = true;

    populateBooks();
    populateChapters();
    if ($('version-select')) $('version-select').value = state.version;

    const savedFontSize = Number(loadJSON(STORAGE.fontSize, 17));
    state.fontSize = Number.isFinite(savedFontSize) ? Math.max(13, Math.min(25, savedFontSize)) : 17;
    applySavedTheme();
    applyFontSize();
    updateBookmarkCount();
    bindEvents();
    loadChapter({ keepView: true });

    const installButton = $('install-app');
    if (installButton && !installPromptEvent) installButton.title = 'Install WordPath from your browser menu if supported.';

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        navigator.serviceWorker.register('./service-worker.js').catch(error =>
            console.info('WordPath service worker is not active:', error.message)
        );
    }
}

function initializeWordPath() {
    bindAuthEvents();
    showAuthMode('login');
    let activeEmail = '';
    try {
        activeEmail = JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || '{}').email || '';
    } catch (error) { /* no active session */ }

    const account = readAccounts().find(item => item.email === activeEmail);
    if (account) openAuthenticatedApp(account);
    else {
        $('auth-screen')?.classList.remove('hidden');
        $('app-shell')?.classList.add('hidden');
    }
}

/* -------------------- STARTUP ERROR REPORTING -------------------- */

window.addEventListener('error', event => {
    console.error('WordPath runtime error:', event.message, event.filename, event.lineno);
});

window.addEventListener('unhandledrejection', event => {
    console.error('WordPath asynchronous error:', event.reason);
});

/* -------------------- START WORDPATH -------------------- */

if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        initializeWordPath,
        { once: true }
    );

} else {

    initializeWordPath();

}

