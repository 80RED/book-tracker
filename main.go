package main

import (
	"log"
	"net/http"
	"path/filepath"
)

func handler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/" {
		http.ServeFile(w, r, `index.html`)
		return
	}

	if filepath.Ext(r.URL.Path) != "" {
		http.ServeFile(w, r, "assets"+r.URL.Path)
		return
	}

	http.NotFound(w, r)
}

func main() {
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
