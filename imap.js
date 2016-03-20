// Save data to server before closing...
window.onbeforeunload = saveHandler;

// word <-> frequency
var words = {};
// (syno|anto)nyms[word] is the list of synonyms/antonyms of a given `word`
var synonyms = {};
var antonyms = {};

function loadDataFromServer(url, callback) {
  var request = new XMLHttpRequest();
  request.open("GET", url);
  request.onreadystatechange = function() {
    if(request.readyState === 4 && request.status === 200) {
      var responseType = request.getResponseHeader("Content-Type");
      //console.log(responseType);
      if(responseType === "application/json") {
        //console.log(request.responseText);
        callback(JSON.parse(request.responseText));
      }
    }
  };
  request.send(null); // GET request has no body, just send NULL
}

function loadCallBack(data) {
  // Populate words, synonyms, antonyms
  words = data["words"];
  synonyms = data["synonyms"];
  antonyms = data["antonyms"];
}

// For the synonym/antonym demo, use test data load from server
window.onload = function(){
    loadDataFromServer("http://127.0.0.1:8888/load", loadCallBack);
};

// Add w to map, i.e. map[w]++
// 
// A hacky work-around: if w takes the form: images/xyz.ext, then we know it is an image.
function addWord(w, map) {
  if (!map.hasOwnProperty(w)) { // new word
    map[w] = 1;
  } else {
    map[w]++;
  }
}

// add value to map[key]
function addToList(key, value, map) {
  if(!map.hasOwnProperty(key)) {
    map[key] = [value];
  } else {
    map[key].push(value);
  }
}

function showOne() {
  var w = document.getElementById("search").value;
  w = w.toLowerCase().trim();
  console.log(w);
  console.log(words.hasOwnProperty(w));
  console.log(words);
  // clear old answer if any
  d3.selectAll(".answer").remove();
  d3.select("#tooltip").classed("hidden", true);
  if (w === "" || !words.hasOwnProperty(w)) {
    d3.select("body").append("div")
      .attr("class", "answer")
      .text("You don't have any note for " + "\"" + w + "\" yet!");
      console.log("no-op");
  } else {
    console.log("makegraph");
    makeGraph(w);
  }
}

// when clicking on a node
function showSelected(word) {
  document.getElementById("search").value = word;
  d3.select(".answer").remove();
  d3.select("#tooltip").classed("hidden", true);
  makeGraph(word);
}

function makeGraph(word) {
  // The size of svg
  var W = window.innerWidth;
  var H = window.innerHeight;

  var svg = d3.select("body").append("svg")
    .attr("width", W)
    .attr("height", H)
    .attr("class", "answer")

  var force = d3.layout.force()
    //.charge(-80)
    .linkDistance(200)
    .size([W, H]);

  var gNodeData = [{name: word, freq: words[word]}];
  var gLinkData = [];

  var aLen = antonyms.hasOwnProperty(word) ? antonyms[word].length : 0;
  for (var i = 0; i < aLen; i++) {
    gNodeData.push({name: antonyms[word][i], freq: words[antonyms[word][i]]});
    // source/target index should be index of gNodeData array, not wIdx
    gLinkData.push({source: 0, target: i+1, after: true});
  }

  var sLen = synonyms.hasOwnProperty(word) ? synonyms[word].length : 0;
  for (var i = aLen; i < aLen+sLen; i++) {
    gNodeData.push({name: synonyms[word][i-aLen], freq: words[synonyms[word][i-aLen]]});
    gLinkData.push({source: 0, target: i+1, after: false});
  }

  // data binding
  force.nodes(gNodeData)
       .charge(function(d){
          return d.freq * d.freq * -10;
       })
       .links(gLinkData)
       .start();

  var links = svg.selectAll(".link")
    .data(gLinkData)
    .enter()
    .append("line")
    .attr("class", "link")
    .style("stroke", function(d) {
      if (d.after) {
        return "red"; // antonym RED
      }
      return "blue"; // synonym BLUE 
    })
    .style("stroke-width", 2);

  var colors = d3.scale.category20();
  var nodes = svg.selectAll(".node")
    .data(gNodeData)
    .enter()
    .append(function(d) {
    	if(d.name.startsWith("images/")) {
    	    return document.createElementNS("http://www.w3.org/2000/svg", "svg:image");
    	} else return document.createElementNS("http://www.w3.org/2000/svg", "svg:circle");
    })
    .attr("class", "node")
    .attr("r", function(d){ 
	if(!d.name.startsWith("images/")) 
	    return d.freq; 
	return 0;
    })
    .style("fill", function(d){ return colors(d.freq); })
    //.on("click", function(d){ showSelected(d.name); })
    .call(force.drag); // enable dragging effect

    var images = nodes.filter(function(d){
       return d.name.startsWith("images/");
    })
    .attr("xlink:href", function(d){
    	console.log(d.name);
    	return d.name;
    })
    .attr("width", 50)
    .attr("height", 50)
    .on("click", function(d) {
      // don't create a new graph when click on the root word
      if(d.name === word) return;
      showSelected(d.name);
    })
    .call(force.drag);

  var labels = svg.selectAll(".label")
    .data(gNodeData)
    .enter()
    .append("text")    
    .attr("class", "label")
    .attr("text-anchor", "middle")
    .style("font-family", "sans-serif")
    .style("font-size", "13")
    .text(function(d){ 
	if(d.name.startsWith("images/")) return "";
	return d.name; 
    })
    .on("click", function(d) {
      // don't create a new graph when click on the root word
      if(d.name === word) return;
      showSelected(d.name);
    })
    .on("mouseover", function(d) {
      if(d.name.startsWith("images/")) return;

      var xPos = d.x;
      var yPos = d.y;
      var note = [];
      if(d.name === word) {
        note.push("It's me: " + d.name);
      }
      if(antonyms.hasOwnProperty(word) && antonyms[word].includes(d.name)) {
        note.push(d.name + " hates " + word);
      }
      if(synonyms.hasOwnProperty(word) && synonyms[word].includes(d.name)) {
        note.push(d.name + " loves " + word);
      }
      d3.select("#tooltip")
        .style("left", xPos+"px")
        .style("top", yPos+"px")
        .select("#story")
        .text(note.join("\n"));
      // Show the tooltip
      d3.select("#tooltip").classed("hidden", false);
    })
    .on("mouseout", function(){
      d3.select("#tooltip").classed("hidden", true);
    })
    .call(force.drag);

  // force layout automatically computes x/y values for links, nodes, labels
  force.on("tick", function(){
    links.attr("x1", function(d){ return d.source.x; })
         .attr("y1", function(d){ return d.source.y; })
         .attr("x2", function(d){ return d.target.x; })
         .attr("y2", function(d){ return d.target.y; });

    nodes.attr("cx", function(d){ return d.x; })
         .attr("cy", function(d){ return d.y; });

    labels.attr("x", function(d){ return d.x; })
          .attr("y", function(d){ return d.y; });

    images.attr("x", function(d){ return d.x; })
	  .attr("y", function(d){ return d.y; });

  });
}

// TODO(d): Add sanity check for user-provided input
function norm(word) {
    return word.toLowerCase().trim();
}

function addCollocation() {
  var word = document.getElementById("word").value;
  var antonym = document.getElementById("antonym").value;
  var synonym = document.getElementById("synonym").value;
    
  word = norm(word);
  antonym = norm(antonym);
  synonym = norm(synonym);
  
  addWord(word, words);
  // avoid duplicate links
  // TODO(d): Alternatively, consider use link frequency as edge width?
  if(antonym !== "") {
      addWord(antonym, words);
      if(!antonyms.hasOwnProperty(word) || !antonym[word].includes(antonym)) addToList(word, antonym, antonyms);
      if(!antonyms.hasOwnProperty(antonym) || !antonyms[antonym].includes(word)) addToList(antonym, word, antonyms);
  }
  if (synonym !== "") {
      addWord(synonym, words);
      if (!synonyms.hasOwnProperty(word) || !synonyms[word].includes(synonym)) addToList(word, synonym, synonyms);
      if (!synonyms.hasOwnProperty(synonym) || !synonyms[synonym].includes(word)) addToList(synonym, word, synonyms);
  }
}

// TODO(d): Use window.setInterval to save data to server periodically in
// addition to wating for user pressing Done button
function saveDataToServer(url, data, callback) {
  var request = new XMLHttpRequest();
  request.open("POST", url); // default to asynchronous request
  request.onreadystatechange = function() {
    if(request.readyState === 4 && callback) {
      callback(request);
    }
  };
  request.setRequestHeader("Content-Type", "application/json");
  request.send(JSON.stringify(data));
}

function saveCallBack(req) {
  // remove old status if any
  d3.selectAll(".status").remove();
  d3.select("body").append("div")
    .attr("class", ".status")
    .text("[Save data] " + req.status + ": " + req.statusText);
}

// saveHandler is called when user pushes the "Save" button
function saveHandler() {
  data = {"words": words, "antonyms": antonyms, "synonyms": synonyms};
  saveDataToServer("http://127.0.0.1:8888/save", data, saveCallBack);
}
