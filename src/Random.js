import React, { Component } from 'react';
import './Random.css';
import moment from 'moment';
import pluralize from 'pluralize';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
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
    // need to find a better way to do this!
    const TOTAL_RECORDS = 6862;
    const randomId = Math.floor(Math.random() * Math.floor(TOTAL_RECORDS) + 1);

    const filter = `$filter=Id%20eq%20'${randomId}'`;
    const url = `https://kindleclippings.table.core.windows.net/clippings()?${filter}`;
    const signature = Utilities.getSharedKeySignature("/kindleclippings/clippings()");

    return fetch(url, {
      method: "GET",
      headers: {
        'Authorization': `SharedKeyLite kindleclippings:${signature}`,
        'x-ms-version': '2021-04-10',
        'x-ms-date': new Date().toUTCString(),
        'Accept': 'application/json;odata=nometadata'
      }
    })
    .then(res => {
      // console.log(res);
      return res.ok ? res.json() : null;
    })
    .then(data => {
      // console.log(data);
      if (data && data?.value.length === 1) {
        const record = data.value[0];
        let content = record.Content.trim();
        if(content.split(' ').length === 1) {
          // remove trailing grammar from single words that are sometimes part of the clipping
          content = content.replace(/[.,!;:'"“”‘’()]/g, '');
          // get singular version of word as plural definitions aren't very useful
          // e.g. tests = plural of test etc.
          content = pluralize.isPlural(content) ? pluralize.singular(content) : content;
          this.getDefinition(content);
        }

        // get book info
        const bookTitle = record.Title.trim();
        const bookAuthor = record.Author.trim();

        this.setState({
          title: bookTitle,
          author: bookAuthor,
          highlighted: moment(record.Created.trim(), 'MM/DD/YYYY h:mm a').format('dddd, MMMM Do YYYY @ h:mm a'),
          pages: Utilities.calculatePageNumber(record.Location.trim()),
          content: content
        });
      }
    })
    .catch(err => {
      console.error(err);
      return null;
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
        <Row className="mt-3">
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