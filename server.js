'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// Create a new Schema with mongoose to represent a url in the database
var urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const URL = mongoose.model("URL", urlSchema);

//  
app.post("/api/shorturl/new", function (req, res) {
  // Need to fix the input url so that it ignores http(s):// and trailing /'s; otherwise, DNS lookup won't accept it
  let url = req.body.url;
  url = url.replace(/https*\:\/\//, '');
  url = url.replace(/\/$/, '');
 
  dns.lookup(url, async (err) => {
    if (err) {
      console.log(err);
      res.json({error: "invalid URL"});
    }
    else {
      let documents = await URL.find().exec();
      URL.find({original_url: url}).exec((err, data) => {
        if (err) console.log(err);
        else {
          if (data.length === 0) { // If there are no documents with that name in the database, create a new one
            let addedDocument = documents.length + 1;
            var newURL = new URL({original_url: url, short_url: addedDocument});
            newURL.save((err) => {
              if (err) throw err;
            });
            res.json({original_url: url, short_url: addedDocument})
          } else { // If the document already exists, pull out the contents
            res.json({original_url: url, short_url: data[0].short_url});
          }
        }
      });
    };
  });
});

// GET here
app.get("/api/shorturl/:short_url", (req, res) => {
  let urlID = req.params.short_url;
  URL.find({short_url: urlID}).exec((err, data) => {
    if (err) throw err;
    else {
      if (data.length === 0) res.json({"error": "No such short_url id exists"});
      else {
        var redirectedURL = "https://" + data[0].original_url;
        res.redirect(redirectedURL);
      }
    }
  });
}) 

app.listen(port, function () {
  console.log('Node.js listening ...');
});