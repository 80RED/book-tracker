// Creating / opening Indexeddb

let db;
let currentLibraryBook = null;

const request = window.indexedDB.open("db", 7);

request.onerror = (event) => {
    console.error("Error opening IndexedDB:", event.target.error);
};

request.onupgradeneeded = (event) => {
    db = event.target.result;

    if (!db.objectStoreNames.contains("books")) {
        const bookStore = db.createObjectStore("books", { autoIncrement: true });

        // indices
        bookStore.createIndex("title", "title", {unique: false});
        bookStore.createIndex("authors", "authors", {unique: false, multiEntry: true});
        bookStore.createIndex("categories", "categories", {unique: false, multiEntry: true});
        bookStore.createIndex("isbn10", "isbn10", {unique: true});
        bookStore.createIndex("isbn13", "isbn13", {unique: true});
        bookStore.createIndex("status", "status", {unique: false});
    }

    if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings")
    }
};

let selectedBook = null;

request.onsuccess = (event) => {
    db = event.target.result;
    loadSavedApiKey();

    if (window.location.pathname === "/books" || window.location.pathname === "/") {
        const libraryContainer = document.querySelector('.library-container');
        if (libraryContainer) {
            loadLibrary();
        }
    }
};

// Modal HTML Injection

function injectBookModal() {
    const modalHTML = `
        <div class="modal-overlay" id="bookModal">
            <div class="book-modal">
                <div class="book-modal-header">
                    <div class="book-modal-cover">
                        <!-- Image will be inserted here -->
                    </div>
                    <div class="book-modal-title">
                        <h2></h2>
                        <div class="authors"></div>
                    </div>
                </div>
                
                <div class="book-modal-info">
                    <div class="book-info-grid">
                        <div class="info-item">
                            <div class="info-label">Pages</div>
                            <div class="info-value pages"></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Categories</div>
                            <div class="info-value categories"></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">ISBN-10</div>
                            <div class="info-value isbn10"></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">ISBN-13</div>
                            <div class="info-value isbn13"></div>
                        </div>
                    </div>
                    
                    <div class="book-description"></div>
                </div>
                
                <div class="book-modal-actions">
                    <select class="status-select" id="bookStatus">
                        <option value="to-read">To Read</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                    <button class="modal-btn cancel" onclick="closeBookModal()">Cancel</button>
                    <button class="modal-btn add" onclick="addBookToLibrary()">Add to Library</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showBookModal(book) {
    console.log('showBookModal called with book:', book); 
    
    if (!book || !book.volumeInfo) {
        console.error('Invalid book data');
        return;
    }
    
    selectedBook = book;
    const modal = document.getElementById('bookModal');
    
    if (!modal) {
        console.error('Modal element not found');
        return;
    }
    
    const modalCover = modal.querySelector('.book-modal-cover');
    modalCover.innerHTML = book.volumeInfo.imageLinks 
        ? `<img src="${book.volumeInfo.imageLinks.thumbnail}" alt="Cover of ${book.volumeInfo.title}"/>`
        : '<div class="no-cover">No Cover</div>';
    
    modal.querySelector('.book-modal-title h2').textContent = book.volumeInfo.title;
    modal.querySelector('.authors').textContent = book.volumeInfo.authors 
        ? book.volumeInfo.authors.join(', ') 
        : 'Unknown Author';
    
    modal.querySelector('.pages').textContent = book.volumeInfo.pageCount || 'Unknown';
    modal.querySelector('.categories').textContent = book.volumeInfo.categories 
        ? book.volumeInfo.categories.join(', ') 
        : 'Uncategorized';
    
    const industryIdentifiers = book.volumeInfo.industryIdentifiers || [];
    const isbn10 = industryIdentifiers.find(id => id.type === 'ISBN_10');
    const isbn13 = industryIdentifiers.find(id => id.type === 'ISBN_13');
    
    modal.querySelector('.isbn10').textContent = isbn10 ? isbn10.identifier : 'N/A';
    modal.querySelector('.isbn13').textContent = isbn13 ? isbn13.identifier : 'N/A';
    
    modal.querySelector('.book-description').textContent = book.volumeInfo.description || 'No description available.';
    
    modal.querySelector('#bookStatus').value = 'to-read';
    
    modal.classList.add('active');
    console.log('Modal should be visible now, active class added'); 
}

function closeBookModal() {
    const modal = document.getElementById('bookModal');
    modal.classList.remove('active');
    selectedBook = null;
}

async function addBookToLibrary() {
    if (!selectedBook) return;
    
    const status = document.getElementById('bookStatus').value;
    const bookData = {
        title: selectedBook.volumeInfo.title,
        authors: selectedBook.volumeInfo.authors || ['Unknown Author'],
        description: selectedBook.volumeInfo.description || '',
        pageCount: selectedBook.volumeInfo.pageCount,
        categories: Array.from(new Set(selectedBook.volumeInfo.categories || ['Uncategorized'])),
        imageLinks: selectedBook.volumeInfo.imageLinks || {},
        isbn10: selectedBook.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || '',
        isbn13: selectedBook.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || '',
        status: status
    };

    const transaction = db.transaction(['books'], 'readwrite');
    const store = transaction.objectStore('books');

    try {
        let bookExists = false;

        const checkIndex = async (indexName, value) => {
            try {
                const index = store.index(indexName);
                return new Promise((resolve) => {
                    const request = index.get(value);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve(null);
                });
            } catch (e) {
                console.error(`Error accessing index ${indexName}:`, e);
                return null;
            }
        };

        if (bookData.isbn10) {
            const existingBook = await checkIndex('isbn10', bookData.isbn10);
            if (existingBook) bookExists = true;
        }

        if (!bookExists && bookData.isbn13) {
            const existingBook = await checkIndex('isbn13', bookData.isbn13);
            if (existingBook) bookExists = true;
        }

        if (!bookExists && (!bookData.isbn10 && !bookData.isbn13)) {
            try {
                const titleIndex = store.index('title');
                const existingBooks = await new Promise((resolve) => {
                    const request = titleIndex.getAll(bookData.title);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve([]);
                });

                bookExists = existingBooks.some(book => 
                    book.authors.join(',') === bookData.authors.join(',')
                );
            } catch (e) {
                console.error('Error checking title index:', e);
            }
        }

        if (bookExists) {
            showToast('This book is already in your library!', 'error');
            closeBookModal();
            return;
        }

        const addRequest = store.add(bookData);
        
        addRequest.onsuccess = () => {
            closeBookModal();
            const searchResults = document.getElementById('search-results');
            searchResults.classList.remove('active');
            document.body.classList.remove('search-active');
            showToast('Book added to your library!', 'success');
            loadLibrary();
        };
        
        addRequest.onerror = (event) => {
            console.error('Error adding book:', event);
            showToast('Error adding book to library.', 'error');
        };

    } catch (error) {
        console.error('Error checking for existing book:', error);
        alert('Error checking for existing book');
    } finally {
        transaction.oncomplete = () => {
            console.log('Transaction completed');
        };
        transaction.onerror = () => {
            console.error('Transaction error:', transaction.error);
        };
    }
}

function updateBookStatus(newStatus) {
    if (!currentLibraryBook) return;
    
    const request = indexedDB.open("db", 7);
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['books'], 'readwrite');
        const store = transaction.objectStore('books');
        
        const getRequest = store.index('isbn13').get(currentLibraryBook.isbn13);
        
        getRequest.onsuccess = () => {
            const book = getRequest.result;
            if (book) {
                book.status = newStatus;
                store.put(book);
                showToast('Book status updated successfully', 'success');
                closeLibraryModal();
                loadLibrary(); // Refresh display
            }
        };
    };
}

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

function createBookCard(book) {
    const div = document.createElement('div');
    div.className = 'book-card';
    div.innerHTML = `
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
        <button class="choose-book-btn">Choose</button>
    `;

    const chooseBtn = div.querySelector('.choose-book-btn');
    chooseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Choose button clicked for book:', book.volumeInfo.title); 
        showBookModal(book);
    });

    return div;
}

let searchState = {
    currentQuery: '',
    page: 0,
    loading: false,
    hasMore: true
};

async function searchBooks(isLoadMore = false) {
    if (searchState.loading || (!isLoadMore && !searchState.hasMore)) return;
    
    const searchResults = document.getElementById('search-results');
    
    try {
        searchState.loading = true;
        
        const existingLoadMore = searchResults.querySelector('.load-more-btn');
        if (existingLoadMore) {
            existingLoadMore.remove();
        }

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

        if (!isLoadMore) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('expanded'); 
        }

        data.items.forEach(book => {
            searchResults.appendChild(createBookCard(book));
        });

        if (data.items.length === 5) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.textContent = 'Load More Results';
            loadMoreBtn.addEventListener('click', function(e) {
                e.preventDefault(); 
                e.stopPropagation(); 
                
                searchResults.classList.add('expanded');
                
                searchState.page += 1;
                searchBooks(true);
            });
            searchResults.appendChild(loadMoreBtn);
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
            if (query.trim()) {
                searchResults.classList.add('active');
                document.body.classList.add('search-active');
                searchResults.classList.remove('expanded');
                searchBooks(false);
            } else {
                searchResults.classList.remove('active', 'expanded');
                document.body.classList.remove('search-active');
                searchResults.innerHTML = '';
            }
        }
    }, 300);
}

document.querySelector('.apiSearchBar')?.addEventListener('focus', function() {
    const searchResults = document.getElementById('search-results');
    if (this.value.trim()) {
        searchResults.classList.add('active');
        document.body.classList.add('search-active');
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

function injectLibraryComponents() {
    const libraryContainer = document.querySelector('.library-container');
    
    if (libraryContainer && !libraryContainer.querySelector('.library-search')) {
        const searchInput = document.createElement('input');
        searchInput.className = 'library-search';
        searchInput.type = 'text';
        searchInput.placeholder = 'Search by title, author, category or status...';
        searchInput.oninput = (e) => filterLibrary(e.target.value);

        // Insert the search input at the very beginning of .library-container
        libraryContainer.insertAdjacentElement('afterbegin', searchInput);
    }

    const modalHTML = `
        <div class="library-modal" id="libraryModal">
            <div class="library-modal-content">
                <div class="modal-header">
                    <h2 id="modal-title"></h2>
                    <button class="close-modal" onclick="closeLibraryModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="book-details">
                        <div class="book-cover" id="modal-cover"></div>
                        <div class="book-info">
                            <p id="modal-authors"></p>
                            <p id="modal-categories"></p>
                            <p id="modal-pages"></p>
                            <div class="status-control">
                                <label for="modal-status">Status:</label>
                                <select id="modal-status">
                                    <option value="to-read">To Read</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="book-description" id="modal-description"></div>
                    <div class="modal-actions">
                        <button class="modal-btn delete">Delete Book</button>    
                        <button class="modal-btn update" onclick="updateBookStatus()">Update</button>                       
                    </div>
                </div>
            </div>
        </div>
    `;

    
    if (!document.getElementById('libraryModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    loadLibrary();
}

function loadLibrary() {
    const request = indexedDB.open("db", 7);
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['books'], 'readonly');
        const store = transaction.objectStore('books');
        const request = store.getAll();

        request.onsuccess = () => {
            const books = request.result;
            displayBooks(books);
        };
    };
}

function displayBooks(books) {
    const container = document.querySelector('.library-container');
    if (!container) {
        console.error('Library container not found');
        return;
    }

    // Retain the search bar if it exists
    const existingSearch = container.querySelector('.library-search');
    
    // Clear only the book cards area, not the search bar
    container.innerHTML = '';
    
    // Re-add the search bar if it was removed
    if (existingSearch) {
        container.appendChild(existingSearch);
    }

    const bookCardsContainer = document.createElement('div');
    bookCardsContainer.className = 'book-cards';
    container.appendChild(bookCardsContainer);

    if (!books || books.length === 0) {
        const message = document.createElement('p');
        message.textContent = 'No books in your library yet. Search above to add books!';
        message.className = 'no-books-message';
        bookCardsContainer.appendChild(message);
        return;
    }

    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'library-card';
        card.innerHTML = `
            <div class="card-cover">
                ${book.imageLinks?.thumbnail ? 
                    `<img src="${book.imageLinks.thumbnail}" alt="Cover of ${book.title}"/>` : 
                    '<div class="no-cover">No Cover</div>'
                }
            </div>
            <div class="card-info">
                <h3 class="card-title">${book.title}</h3>
                <p class="card-authors">${book.authors.join(', ')}</p>
                <span class="card-status ${book.status}">${formatStatus(book.status)}</span>
            </div>
        `;
        
        card.addEventListener('click', () => openLibraryModal(book));
        bookCardsContainer.appendChild(card);
    });
}

function formatStatus(status) {
    return status.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function filterLibrary(searchTerm) {
    const request = indexedDB.open("db", 7);
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['books'], 'readonly');
        const store = transaction.objectStore('books');
        const request = store.getAll();

        request.onsuccess = () => {
            const searchInput = document.querySelector('.library-search');
            const currentFocus = document.activeElement === searchInput;
            
            const books = request.result;
            const filtered = books.filter(book => {
                const search = searchTerm.toLowerCase();
                return (
                    book.title.toLowerCase().includes(search) ||
                    book.authors.some(author => author.toLowerCase().includes(search)) ||
                    book.categories.some(category => category.toLowerCase().includes(search)) ||
                    book.status.toLowerCase().includes(search)
                );
            });
            
            displayBooks(filtered);
            
            if (currentFocus) {
                document.querySelector('.library-search').focus();
            }
        };
    };
}

function openLibraryModal(book) {
    currentLibraryBook = book;
    const modal = document.getElementById('libraryModal');
    
    document.getElementById('modal-title').textContent = book.title;
    document.getElementById('modal-authors').textContent = `Authors: ${book.authors.join(', ')}`;
    document.getElementById('modal-categories').textContent = `Categories: ${book.categories.join(', ')}`;
    document.getElementById('modal-pages').textContent = `Pages: ${book.pageCount}`;
    document.getElementById('modal-description').textContent = book.description;
    
    const coverContainer = document.getElementById('modal-cover');
    coverContainer.innerHTML = book.imageLinks?.thumbnail ? 
        `<img src="${book.imageLinks.thumbnail}" alt="Cover of ${book.title}"/>` : 
        '<div class="no-cover">No Cover</div>';
    
    document.getElementById('modal-status').value = book.status;
    
    const deleteBtn = modal.querySelector('.modal-btn.delete');
    deleteBtn.onclick = () => deleteBook(book.isbn13);
    
    modal.classList.add('active');
}

function deleteBook(isbn13) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    
    const request = indexedDB.open("db", 7);
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['books'], 'readwrite');
        const store = transaction.objectStore('books');
        
        const deleteRequest = store.index('isbn13').getKey(isbn13);
        
        deleteRequest.onsuccess = () => {
            const key = deleteRequest.result;
            if (key) {
                store.delete(key);
                showToast('Book deleted successfully', 'success');
                closeLibraryModal();
                loadLibrary();
            }
        };
    };
}

function closeLibraryModal() {
    const modal = document.getElementById('libraryModal');
    modal.classList.remove('active');
    currentLibraryBook = null;
}

function updateBookStatus() {
    if (!currentLibraryBook) return;
    
    const newStatus = document.getElementById('modal-status').value;
    const request = indexedDB.open("db", 7);
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['books'], 'readwrite');
        const store = transaction.objectStore('books');
        
        const getRequest = store.index('isbn13').openCursor(currentLibraryBook.isbn13);
        
        getRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const book = cursor.value;
                book.status = newStatus;
                const updateRequest = cursor.update(book);
                
                updateRequest.onsuccess = () => {
                    showToast('Book status updated successfully', 'success');
                    closeLibraryModal();
                    loadLibrary();
                };
            }
        };
    };
}

document.addEventListener('DOMContentLoaded', function() {
    injectBookModal();
    injectToastContainer();
    injectLibraryComponents();

    const cancelBtn = document.querySelector('.modal-btn.cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            closeBookModal();
        });
    }

    document.addEventListener('click', function(event) {
        const searchBar = document.querySelector('.apiSearchBar');
        const searchResults = document.getElementById('search-results');
        const modal = document.getElementById('bookModal');
        const modalContent = modal?.querySelector('.book-modal');
        
        const clickedWithinSearch = searchBar?.contains(event.target) || 
                                  searchResults?.contains(event.target);

        const clickedWithinModal = modalContent?.contains(event.target);

        if (modal?.classList.contains('active')) {
            if (!clickedWithinModal) {
                closeBookModal();
            }
            return; 
        }

        if (!clickedWithinSearch) {
            searchResults?.classList.remove('active');
            document.body.classList.remove('search-active');
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeBookModal();
        }
    });

    document.querySelector('.apiSearchBar')?.addEventListener('focus', function() {
        const searchResults = document.getElementById('search-results');
        if (this.value.trim()) {
            searchResults.classList.add('active');
            document.body.classList.add('search-active');
        }
    });

    document.getElementById('libraryModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'libraryModal') {
            closeLibraryModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('libraryModal')?.classList.contains('active')) {
            closeLibraryModal();
        }
    });
});

function injectToastContainer() {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
}

function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        ${message}
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    toastContainer.appendChild(toast);

    toast.offsetHeight;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}