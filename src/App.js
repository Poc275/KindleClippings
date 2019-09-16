import React, { Component } from 'react';
import './App.css';
import Airtable from 'airtable';
import moment from 'moment';

class App extends Component {
  // initialise state
  state = {
    title: null,
    author: null,
    highlighted: null,
    pages: null,
    content: null
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

      this.setState({
        title: records[0].get('Title').trim(),
        author: records[0].get('Author').trim(),
        highlighted: moment(records[0].get('Created').trim(), 'MM/DD/YYYY h:mm a').format('dddd, MMMM Do YYYY @ h:mm a'),
        pages: this.calculatePageNumber(records[0].get('Location').trim()),
        content: records[0].get('Content').trim()
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
      <div className="App">
        <header className="App-header">
          <p>{this.state.content}</p>
          <small>{this.state.title} &mdash; {this.state.author}, {this.state.pages}</small>
          <small>Clipped on {this.state.highlighted}</small>
        </header>
      </div>
    );
  }
}

export default App;