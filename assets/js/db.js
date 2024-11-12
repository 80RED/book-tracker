// Creating / opening Indexeddb

let db;

const request = window.indexedDB.open("db", 2);

request.onerror = (event) => {
    console.error("Error opening IndexedDB:", event.target.error);
};

request.onupgradeneeded = (event) => {
    db = event.target.result;

    if (!db.objectStoreNames.contains("books")) {
        const bookStore = db.createObjectStore("books", { autoIncrement: true });

        // indices
        bookStore.createIndex("title", "title", {unique: false});
        bookStore.createIndex("authors", "authors", {unique: false});
        bookStore.createIndex("mainCategory", "mainCategory", {unique: false});
        bookStore.createIndex("ISBN_10", "ISBN_10", {unique: true});
        bookStore.createIndex("ISBN_13", "ISBN_13", {unique: true});
        bookStore.createIndex("status", "status", {unique: false});
    }

    if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings")
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    loadSavedApiKey();
};


// API Key Management 

function loadSavedApiKey() {
    const apiKeyInput = document.getElementById('apiKey');
    if (!apiKeyInput) return;

    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('apiKey');

    request.onsuccess = () => {
        if (request.result) {
            document.getElementById('apiKey').value = request.result;
        }
    };
}

function saveApiKey(event) {
    event.preventDefault();

    const apiKey = document.getElementById('apiKey').value.trim();

    if (!apiKey) {
        updateApiStatus('Please enter an API key', 'error');
        return;
    }

    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    store.put(apiKey, 'apiKey');

    transaction.oncomplete = () => {
        updateApiStatus('API key saved successfully', 'success');
    };

    transaction.onerror = () => {
        updateApiStatus('Error saving API key', 'error');
    };
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('apiKey');
    const currentType = input.type;

    input.type = currentType === 'password' ? 'text' : 'password';
}

async function testApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();

    if (!apiKey) {
        updateApiStatus('Please enter an API key to test', 'error');
        return;
    }

    updateApiStatus('Testing API Key...', '');

    try {
        const response = await fetch (
            `https://www.googleapis.com/books/v1/volumes?q=test&key=${apiKey}&maxResults=1`
        );

    if (response.ok) {
        updateApiStatus('API key is valid', 'success');
    } else {
        const data = await response.json();
        updateApiStatus(`Invalid API key: ${data.error?.message || 'Unknown error'}`, 'error');
    }
    } catch (error) {
        updateApiStatus('Error testing API Key: Network or server error', 'error');
    }
}


    function updateApiStatus(message, type) {
        const statusElement = document.querySelector('.api-status');
        
        statusElement.textContent = message;
        statusElement.className = 'api-status';

        if (type) {
            statusElement.classList.add(type);
        }
    }

// Book search

let searchState = {
    currentQuery: '',
    page: 0,
    loading: false,
    hasMore: true
};

async function searchBooks(isLoadMore = false) {
    if (searchState.loading || !searchState.hasMore) return;
    
    const searchResults = document.getElementById('search-results');
    
    try {
        searchState.loading = true;
        
        const apiKey = await getApiKey();
        if (!apiKey) {
            throw new Error('No API key found. Please set your Google Books API key in settings.');
        }

        const startIndex = searchState.page * 5;
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchState.currentQuery)}&startIndex=${startIndex}&maxResults=5&key=${apiKey}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch books');
        }

        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            searchState.hasMore = false;
            if (startIndex === 0) {
                searchResults.innerHTML = '<p class="no-results">No books found</p>';
            }
            return;
        }

        const booksHTML = data.items.map(book => `
            <div class="book-card">
                <div class="book-cover">
                    ${book.volumeInfo.imageLinks 
                        ? `<img src="${book.volumeInfo.imageLinks.thumbnail}" alt="Cover of ${book.volumeInfo.title}"/>` 
                        : '<div class="no-cover">No Cover</div>'
                    }
                </div>
                <div class="book-info">
                    <h3 class="book-title">${book.volumeInfo.title}</h3>
                    <p class="book-authors">${book.volumeInfo.authors ? book.volumeInfo.authors.join(', ') : 'Unknown Author'}</p>
                </div>
                <button class="add-book-btn">Add</button>
            </div>
        `).join('');

        if (!isLoadMore) {
            searchResults.innerHTML = booksHTML;
        } else {
            const existingButton = searchResults.querySelector('.load-more-btn');
            if (existingButton) {
                existingButton.remove();
            }
            searchResults.insertAdjacentHTML('beforeend', booksHTML);
        }

        if (data.items.length === 5) {
            const loadMoreHTML = `
                <button class="load-more-btn">Load More Results</button>
            `;
            searchResults.insertAdjacentHTML('beforeend', loadMoreHTML);

            const loadMoreBtn = searchResults.querySelector('.load-more-btn');
            loadMoreBtn.addEventListener('click', () => {
                searchState.page += 1;
                searchBooks(true);
            });
        } else {
            searchState.hasMore = false;
        }

    } catch (error) {
        console.error('Search error:', error);
        if (!isLoadMore) {
            searchResults.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    } finally {
        searchState.loading = false;
    }
}

let searchTimeout;
function debounceSearch(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchState.currentQuery = query;
        searchState.page = 0;
        searchState.hasMore = true;

        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            if (query) {
                searchResults.classList.add('active');
                searchBooks(false); 
            } else {
                searchResults.classList.remove('active');
                searchResults.innerHTML = '';
            }
        }
    }, 300);
}

document.addEventListener('click', function(event) {
    const searchBar = document.querySelector('.apiSearchBar');
    const searchResults = document.getElementById('search-results');
    
    if (searchBar && searchResults) {
        if (!searchBar.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.classList.remove('active');
        }
    }
});

document.querySelector('.apiSearchBar').addEventListener('focus', function() {
    const searchResults = document.getElementById('search-results');
    if (this.value) {
        searchResults.classList.add('active');
    }
});

async function getApiKey() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get('apiKey');

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve (request.result);
    })
}


