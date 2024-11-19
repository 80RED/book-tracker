# book-tracker
Final project for CS50 - track your reading list.

Forewarning: Since I don't know JavaScript and got lazy with CSS, I used AI for about 99% of it, and it's probably terribly written. As I get better at coding in the future, I plan to rewrite it myself and fix everything. For now, I just wanted to get something working.

## What does this site do?
You can search for books using the Google Books API and add them to your reading list with a status (either To-read, In-progress, or Completed). You can then view your books, filter through them, and update their reading status as you read through them.

**IMPORTANT: THERE IS NO SYNC** - Your data is stored locally in IndexedDB, which means any changes made without exporting before clearing cookies will be lost.

## YOU NEED AN API KEY 
It doesn't work without one. You need to be able to ping the google books api.

### How to Get Your API Key
  1. Create a project on Google Cloud Console
  2. Enable the Books API for your project using the Books API page
  3. Create an API key for your project using the Google Cloud Credentials page
  4. For security: Edit your key, click "Restrict key" under "API restrictions", and select only the "Books API"
  5. Click "Save", then use "Test Key" above to verify your key is working


