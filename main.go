package main

import (
	"log"
	"net/http"

	"book-tracker/components"

	"github.com/a-h/templ"
)

func assetHandler() http.Handler {
	fs := http.FileServer(http.Dir("assets"))
	return http.StripPrefix("/assets/", fs)
}

func booksHandler(w http.ResponseWriter, r *http.Request) {
	content := components.Books()
	renderContent(w, r, content)
}

func aboutHandler(w http.ResponseWriter, r *http.Request) {
	content := components.About()
	renderContent(w, r, content)
}

func settingsHandler(w http.ResponseWriter, r *http.Request) {
	content := components.Settings()
	renderContent(w, r, content)
}

func renderContent(w http.ResponseWriter, r *http.Request, content templ.Component) {
	if r.Header.Get("HX-Request") == "true" {
		templ.Handler(content).ServeHTTP(w, r)
	} else {
		templ.Handler(components.Base(content)).ServeHTTP(w, r)
	}
}

func main() {
	http.Handle("/assets/", assetHandler())
	http.HandleFunc("/", booksHandler)
	http.HandleFunc("/books", booksHandler)
	http.HandleFunc("/about", aboutHandler)
	http.HandleFunc("/settings", settingsHandler)

	log.Println("Server starting on :8080")
	http.ListenAndServe(":8080", nil)
}
