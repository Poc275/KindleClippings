import React, { Component } from 'react';
import './Random.css';
import moment from 'moment';
import pluralize from 'pluralize';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
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
    definitionSource: null
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

      this.setState({
        title: bookTitle,
        author: bookAuthor,
        highlighted: moment(records[0].get('Created').trim(), 'MM/DD/YYYY h:mm a').format('dddd, MMMM Do YYYY @ h:mm a'),
        pages: Utilities.calculatePageNumber(records[0].get('Location').trim()),
        content: content
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

  render() {
    return (
      <Container id="random-container">
        <Row>
          <Col sm={2} className="d-none d-sm-block">
            <img src={this.state.title ? Utilities.getBookCoverUrl(this.state.title) : null} 
              alt="book cover"
              title={`${this.state.title} by ${this.state.author}`} />
          </Col>

          <Col xs={12} sm={10}>
            <blockquote className="clipping-block">
              <div className="clipping">
                <p><FontAwesomeIcon icon={faQuoteLeft} size="xs" /> {this.state.content}</p>
                {this.state.definition ? 
                  <>
                    <p className="definition" 
                        dangerouslySetInnerHTML={{ __html: this.state.definition}}></p> 
                    <p className="definition-source" 
                        dangerouslySetInnerHTML={{ __html: this.state.definitionSource}}></p>
                  </>
                  : null
                }
              </div>

              <footer className="clipping-meta">
                {this.state.title} | Clipped on {this.state.highlighted} <cite title="pages">{this.state.pages}</cite>
              </footer>
            </blockquote>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default Random;