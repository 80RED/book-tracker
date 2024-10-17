package main

import (
	"log"
	"net/http"
)

func staticFileHandler() http.Handler {
	fs := http.FileServer(http.Dir("assets"))
	return http.StripPrefix("/static/", fs)
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	} else {
		http.ServeFile(w, r, "index.html")
	}
}

func main() {

	// Set up file server for static assets
	http.Handle("/static/", staticFileHandler())

	// Handler for the root path
	http.HandleFunc("/", rootHandler)

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
