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

    // testApiKey() 

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

    // updateApiStatus(message, type) 

    function updateApiStatus(message, type) {
        const statusElement = document.querySelector('.api-status');
        
        statusElement.textContent = message;
        statusElement.className = 'api-status';

        if (type) {
            statusElement.classList.add(type);
        }
    }

// Debounce API calls

function debounce(func, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, delay);
    };
}

