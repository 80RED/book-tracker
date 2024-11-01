// Creating / opening Indexeddb

let db;

const request = window.indexedDB.open("db", 1);

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

    // saveApiKey(event)
    // TODO

function toggleApiKeyVisibility() {
    const input = document.getElementById('apiKey');
    const currentType = input.type;

    input.type = currentType === 'password' ? 'text' : 'password';
}

    // testApiKey() 
    // TODO

    // updateApiStatus(message, type) 
    // TODO

// Debounce API calls

function debounce(func, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, delay);
    };
}

