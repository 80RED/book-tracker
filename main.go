package main

import (
	"compress/gzip"
	"io"
	"log"
	"net/http"
	"strings"

	"book-tracker/components"

	"github.com/a-h/templ"
)

// GZIP Compression

// gzipResponseWriter is a wrapper around http.ResponseWriter that allows us to write gzipped content.
type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

// Write writes the content to the gzip writer and then to the original writer.
func (w *gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

// gzipHandler is a middleware that compresses the response with gzip if the client accepts it.
func gzipHandler(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next(w, r)
			return
		}

		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w)
		defer gz.Close()

		gzw := &gzipResponseWriter{Writer: gz, ResponseWriter: w}
		next(gzw, r)
	}
}

// Handlers
func assetHandler() http.Handler {
	fs := http.FileServer(http.Dir("assets"))
	return http.StripPrefix("/assets/", fs)
}

func booksHandler(w http.ResponseWriter, r *http.Request) {
	content := components.Books()

	w.Header().Set("HX-Trigger", "initializeBooks")

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
	assetHandler := gzipHandler(func(w http.ResponseWriter, r *http.Request) {
		assetHandler().ServeHTTP(w, r)
	})

	http.Handle("/assets/", assetHandler)

	// Root handler that checks the path
	http.HandleFunc("/", gzipHandler(func(w http.ResponseWriter, r *http.Request) {
		// Clean the path to handle trailing slashes consistently
		path := strings.TrimRight(r.URL.Path, "/")

		switch path {
		case "", "/": // Handle both empty path and root path
			booksHandler(w, r)
		case "/books":
			booksHandler(w, r)
		case "/settings":
			settingsHandler(w, r)
		default:
			// Instead of redirecting, return 404 for unknown paths
			http.NotFound(w, r)
		}
	}))

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
