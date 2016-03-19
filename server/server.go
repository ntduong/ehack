package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
)

const dataFile = "saved_data.json"

func loadHandler(w http.ResponseWriter, req *http.Request) {
	file, err := os.Open(dataFile)
	if err != nil {
		log.Fatalf("failed to open file %q: %v", dataFile, err)
	}
	content, err := ioutil.ReadAll(file)
	if err != nil {
		log.Fatalf("failed to read from file %q: %v", dataFile, err)
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprint(w, string(content))
}

type data struct {
	Words      map[string]int      `json:"words,omitempty"`
	ComeBefore map[string][]string `json:"comeBefore,omitempty"`
	ComeAfter  map[string][]string `json:"comeAfter,omitempty"`
}

func saveHandler(w http.ResponseWriter, req *http.Request) {
	body, err := ioutil.ReadAll(req.Body)
	defer req.Body.Close()
	if err != nil {
		log.Fatalf("failed to read request body: %v", err)
	}
	/*
		var vocabData data
		if err = json.Unmarshal(body, &vocabData); err != nil {
			log.Fatalf("failed to parse body: %v", err)
		}
	*/

	// Make it super simple: just save data to file on disk,
	// instead of writing to some database (extension, maybe?)
	ioutil.WriteFile(dataFile, body, os.FileMode(0777))
}

func main() {
	http.HandleFunc("/save", saveHandler)
	http.HandleFunc("/load", loadHandler)
	http.Handle("/", http.FileServer(http.Dir("/home/duong/prog/havefun/ehack/")))
	log.Fatal(http.ListenAndServe(":9000", nil))
}
