// Create hidden file input
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.json';
fileInput.style.display = 'none';
fileInput.id = 'libraryImport';
document.body.appendChild(fileInput);

// Handle click on Import button
function handleImportClick() {
    fileInput.click();
}

// Handle file selection
fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        importLibrary(e.target.files[0]);
        // Reset file input
        e.target.value = '';
    }
});

function exportLibrary() {
    const request = indexedDB.open("db", 7);
    
    request.onerror = (event) => {
        showToast('Error accessing database', 'error');
    };

    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['books', 'settings'], 'readonly');
        const bookStore = transaction.objectStore('books');
        const settingsStore = transaction.objectStore('settings');
        
        // Get all books
        const booksRequest = bookStore.getAll();
        const settingsRequest = settingsStore.get('apiKey');
        
        Promise.all([
            new Promise(resolve => {
                booksRequest.onsuccess = () => resolve(booksRequest.result);
            }),
            new Promise(resolve => {
                settingsRequest.onsuccess = () => resolve(settingsRequest.result);
            })
        ]).then(([books, apiKey]) => {
            const exportData = {
                books: books,
                settings: {
                    apiKey: apiKey
                },
                version: 1
            };
            
            // Create blob and download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '80reads-library-' + new Date().toISOString().split('T')[0] + '.json';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showToast('Library exported successfully', 'success');
        });
    };
}

function importLibrary(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate the imported data structure
            if (!data.books || !Array.isArray(data.books)) {
                throw new Error('Invalid library file format');
            }
            
            const request = indexedDB.open("db", 7);
            
            request.onerror = () => {
                showToast('Error accessing database', 'error');
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['books', 'settings'], 'readwrite');
                const bookStore = transaction.objectStore('books');
                const settingsStore = transaction.objectStore('settings');
                
                // Clear existing data
                bookStore.clear();
                
                // Import books
                data.books.forEach(book => {
                    bookStore.add(book);
                });
                
                // Import settings if present
                if (data.settings && data.settings.apiKey) {
                    settingsStore.put(data.settings.apiKey, 'apiKey');
                }
                
                transaction.oncomplete = () => {
                    showToast('Library imported successfully', 'success');
                    // Reload the library display
                    loadLibrary();
                    // Reload the API key if present
                    loadSavedApiKey();
                };
                
                transaction.onerror = () => {
                    showToast('Error importing library', 'error');
                };
            };
            
        } catch (error) {
            showToast('Invalid library file format', 'error');
            console.error('Import error:', error);
        }
    };
    
    reader.readAsText(file);
}