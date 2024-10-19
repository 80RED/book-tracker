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
};

request.onsuccess = (event) => {
    db = event.target.result;
};


// Starting API call / Search results 

// Manage user API key

// Debounce API calls

function debounce(func, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, delay);
    };
}

