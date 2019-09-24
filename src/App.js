import React, { Component } from 'react';
import './App.css';
import Airtable from 'airtable';
import moment from 'moment';
import pluralize from 'pluralize';

class App extends Component {
  // initialise state
  state = {
    title: null,
    author: null,
    highlighted: null,
    pages: null,
    content: null,
    definition: null,
    definitionSource: null,
    bookImage: null
  };

  componentDidMount() {
    const self = this;
    const bases = [
      new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('appwgp8cnAsLIUpuI'),
      new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('app2XCAIl9QhJYPkr'),
      new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('appwADT4du02NZBMU'),
      new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('appm6jVVBaS1DeQJC')
    ];
 
    // pick a random base
    const basePick = bases[Math.floor(Math.random() * Math.floor(4))];

    // get the max number of records in the base
    basePick('Clippings').select({
      view: "Grid view",
      fields: ["Id"],
      sort: [{field: "Id", direction: "desc"}],
      maxRecords: 1,
    }).firstPage(function(err, records) {
      if(err) {
        console.error(err);
        return;
      }
      const nRecords = records[0].get("Id");
      // now we can get a random record
      self.getClipping(basePick, Math.floor(Math.random() * Math.floor(nRecords) + 1));
    });
  }

  getClipping(base, recordNumber) {
    base('Clippings').select({
      view: "Grid view",
      filterByFormula: "{Id} = " + recordNumber,
      maxRecords: 1,
    }).firstPage((err, records) => {
      if(err) {
        console.error(err);
        return;
      }

      // check if we need to look up a definition or not
      let content = records[0].get('Content').trim();
      if(content.split(' ').length === 1) {
        // remove trailing grammar from single words that are sometimes part of the clipping
        content = content.replace(/[.,!;:'"“”‘’()]/g, '');
        // get singular version of word as plural definitions aren't very useful
        // e.g. tests = plural of test etc.
        content = pluralize.isPlural(content) ? pluralize.singular(content) : content;
        this.getDefinition(content);
      }

      // get book info
      const bookTitle = records[0].get('Title').trim();
      const bookAuthor = records[0].get('Author').trim();
      this.getBookInfo(bookTitle, bookAuthor);

      this.setState({
        title: bookTitle,
        author: bookAuthor,
        highlighted: 'Clipped on ' + moment(records[0].get('Created').trim(), 'MM/DD/YYYY h:mm a').format('dddd, MMMM Do YYYY @ h:mm a'),
        pages: this.calculatePageNumber(records[0].get('Location').trim()),
        content: '“' + content
      });
    });
  }

  // call the Wordnik API for a definition
  getDefinition(word) {
    const key = process.env.REACT_APP_WORDNIK_API_KEY;
    const url = `https://api.wordnik.com/v4/word.json/${word.toLowerCase()}/definitions?limit=1&includeRelated=false&useCanonical=true&includeTags=false&api_key=${key}`;

    fetch(url)
      .then(res => {
        if(res.ok) {
          return res.json();
        }
        console.error(res);
        return null;
    }).then(json => {
      this.setState({
        definition: json[0].text,
        definitionSource: json[0].attributionText
      });
    }).catch(err => {
      console.error('Error calling the Wordnik API: ', err.message);
    });
  }

  // call the Goodreads API for book information
  getBookInfo(title, author) {
    const key = process.env.REACT_APP_GOODREADS_API_KEY;
    const uriAuthor = encodeURIComponent(author);
    const uriTitle = encodeURIComponent(title);
    // Goodreads API doesn't allow CORS so I've setup a proxy backend Azure Function App
    // which forwards to the actual Goodreads API
    const url = `https://goodreads-proxy.azurewebsites.net/book/${uriAuthor}/${uriTitle}/${key}`;

    fetch(url)
      .then(res => {
        if(res.ok) {
          return res.text();
        }
        console.error(res);
        return null;
    }).then(xml => {
      // parse xml
      return new DOMParser().parseFromString(xml, "text/xml");
    }).then(data => {
      // console.log(data);
      const book = data.getElementsByTagName('book')[0];
      this.setState({
        bookImage: book.getElementsByTagName('image_url')[0].childNodes[0].nodeValue
      });
    }).catch(err => {
      console.error('Error calling the Goodreads API: ', err.message);
      this.setState({
        bookImage: null
      });
    });
  }

  // function which calculates the correct page number from the kindle location
  calculatePageNumber(location) {
    const locations = location.split('-');
    
    // locations will either be a single element for a single page or two elements for a range of pages.
    // Actual page number = kindle location / 16.69
    // Source: https://www.reddit.com/r/kindle/comments/2528dl/kindle_location_to_relative_page_number_with_a/
    const page = Math.floor(parseInt(locations[0], 10) / 16.69);
    return `p. ${page}`;
  }

  render() {
    return (
      <div className="main">
        <div className="col">
          <p className="content">{this.state.content}</p>
          {/* <p>{this.state.definition}</p> */}
          <p dangerouslySetInnerHTML={{__html: this.state.definition}}></p>
          <p className="definition-source">{this.state.definitionSource}</p>
          <p className="clipping-info">{this.state.highlighted}</p>
        </div>

        <div className="book-col">
          <div className="book-meta-col">
            <p>{this.state.title}</p>
            <p className="justify-end">&mdash; {this.state.author}</p>
            <small className="justify-end">{this.state.pages}</small>
          </div>
          {this.state.bookImage ? <img src={this.state.bookImage} alt="Book cover" /> : null}
        </div>
      </div>
    );
  }
}

export default App;