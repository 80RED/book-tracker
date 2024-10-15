
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

    if (!db.objectStoreNames.contains("activities")) {
        db.createObjectStore("activities", { autoIncrement: true });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
};