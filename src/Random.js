import React, { Component } from 'react';
import './Random.css';
import moment from 'moment';
import pluralize from 'pluralize';
import bases from './Bases';
import Utilities from './Util';

class Random extends Component {
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
 
    // pick a random base
    const basePick = bases[Math.floor(Math.random() * Math.floor(bases.length))];

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
        pages: Utilities.calculatePageNumber(records[0].get('Location').trim()),
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

  render() {
    return (
      <div id="random-main">
        <div id="random-clipping-col">
          <p id="random-content">{this.state.content}</p>
          {/* <p>{this.state.definition}</p> */}
          <p dangerouslySetInnerHTML={{__html: this.state.definition}}></p>
          <p id="random-definition-source">{this.state.definitionSource}</p>
          <p id="random-clipping-info">{this.state.highlighted}</p>
        </div>

        <div id="random-book-col">
          <div id="random-book-meta-col">
            <p>{this.state.title}</p>
            <p className="random-justify-end">&mdash; {this.state.author}</p>
            <small className="random-justify-end">{this.state.pages}</small>
          </div>
          {this.state.bookImage ? <img src={this.state.bookImage} alt="Book cover" id="random-img" /> : null}
        </div>
      </div>
    );
  }
}

export default Random;