import React, { Component } from 'react';
import moment from 'moment';
import pluralize from 'pluralize';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft, faBook } from '@fortawesome/free-solid-svg-icons';
import { faClock } from '@fortawesome/free-regular-svg-icons';
import bases from './Bases';
import './Book.css';

class Book extends Component {
    constructor() {
        super();
        this.controller = new AbortController();
        this.signal = this.controller.signal;
    }

    state = {
        clippings: []
    };

    componentDidMount() {
        // scroll to the top when navigating to this route
        window.scrollTo(0, 0);
        
        const promises = bases.map(base => {
            return new Promise((resolve, reject) => {
                // retrieve clippings for this book, use the original title as this is the "key" to link 
                // from the index of books to the individual clippings bases
                base('Clippings').select({
                    view: "Grid view",
                    filterByFormula: `SEARCH("${this.props.location.state.book.originalTitle}", {Title})`
                }).eachPage((records, fetchNextPage) => {
                    records.forEach(async record => {
                        // Airtable SEARCH isn't an exact match, so double check it
                        if(record.get('Title') === this.props.location.state.book.originalTitle) {
                            this.setState({
                                clippings: [...this.state.clippings, {
                                    id: record.get('Id'),
                                    content: record.get('Content').trim(),
                                    highlighted: moment(record.get('Created').trim(), 'MM/DD/YYYY h:mm a').format('dddd, MMMM Do YYYY @ h:mm a'),
                                    pages: this.calculatePageNumber(record.get('Location').trim()),
                                    definition: null
                                }]
                            });
                        }
                    });

                    fetchNextPage();
                }, (err) => {
                    // called when all records retrieved
                    if(err) { 
                        console.error(err);
                        reject();
                    }

                    resolve();
                });
            });
        });

        Promise.all(promises).then(() => {
            // all clippings retrieved, retrieve any definitions
            this.checkForDefinitions();
        });
    }

    // componentDidUpdate(prevProps) {
    //     // make sure we're scrolled to the top of the page when navigating to this route
    //     if(this.props.location.pathname !== prevProps.location.pathname) {
    //         window.scrollTo(0, 0);
    //     }
    // }

    componentWillUnmount() {
        // kill any outstanding fetch requests to prevent updating 
        // state on an unmounted component if we navigate away from the home page
        this.controller.abort();
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

    // function which checks if any clippings need a definition retrieving 
    // uses a separate function so we can throttle Wordnik requests to prevent a 429 error
    checkForDefinitions() {
        // count of definitions we need to lookup
        // used to space out Wordnik requests in setTimeout() below
        let definitionCount = 0;

        // check for single words which require a definition lookup
        this.state.clippings.forEach(clipping => {
            if(clipping.content.split(' ').length === 1) {
                // remove trailing grammar from single words that are sometimes part of the clipping
                let content = clipping.content.replace(/[.,!;:'"“”‘’()]/g, '');
                // get singular version of word as plural definitions aren't very useful
                // e.g. tests = plural of test etc.
                content = pluralize.isPlural(content) ? pluralize.singular(content) : content;

                // use a setTimeout to throttle Wordnik requests to prevent 429 errors
                setTimeout(async () => {
                    // console.log("Getting Definition" + Date.now());
                    const definition = await this.getDefinition(content);

                    // update state with the definition
                    if(definition) {
                        this.setState(prevState => ({
                            clippings: prevState.clippings.map(prevClipping => (
                                // if clipping id matches the clipping with definition id then update 
                                // the definition property, otherwise just keep the same clipping
                                prevClipping.id === clipping.id ? { ...prevClipping, definition: definition } : prevClipping
                            ))
                        }));
                    }
                }, definitionCount++ * 10000);
            }
        });
    }

    getDefinition(word) {
        const key = process.env.REACT_APP_WORDNIK_API_KEY;
        const url = `https://api.wordnik.com/v4/word.json/${word.toLowerCase()}/definitions?limit=1&includeRelated=false&useCanonical=true&includeTags=false&api_key=${key}`;
        // pass abort signal so we can cancel the fetch request when component unmounts
        const signal = this.signal;
    
        return fetch(url, { signal })
          .then(res => {
            if(res.ok) {
              return res.json();
            }
            console.error(res);
            throw new Error('Wordnik API response not OK: ' + res);
        }).then(json => {
            return {
                definition: json[0].text,
                definitionSource: json[0].attributionText
            };
        }).catch(err => {
            console.error('Error calling the Wordnik API: ', err.message);
        });
    }

    render() {
        // reformat the first and last clipping date to display date range the clippings were made
        const datesRead = this.state.clippings.length > 0 ? 
            moment(this.state.clippings[0].highlighted, "dddd, MMMM Do YYYY @ h:mm a").format("MMM Do YYYY") + " to " + 
            moment(this.state.clippings[this.state.clippings.length - 1].highlighted, "ddd, MMMM Do YYYY @ h:mm a").format("MMM Do YYYY")
            : null;

        // get the book image URL which will be the book title without any punctuation or spaces
        const bookImageUrl = this.props.location.state.book.originalTitle.replaceAll(' ', '_').replace(/[.,!;:'"“”‘’()?]/g, '');
        console.log(bookImageUrl);

        return (
            <>
                <Container fluid>
                    <Row>
                        <Col id="hero-col">
                            <div id="hero-img" 
                                style={{ backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(40, 44, 52, 1)), 
                                    url(https://kindleclippings.blob.core.windows.net/hires-book-covers/${bookImageUrl}.jpg` }}>
                            </div>
                        </Col>
                    </Row>
                </Container>

                <Container id="content">
                    <Row>
                        <Col xs="auto">
                            <img src={this.props.location.state.book.image} alt="Book cover" />
                        </Col>
                        <Col>
                            <h1>{this.props.location.state.book.title}</h1>
                            <h2>by {this.props.location.state.book.author}</h2>
                            <p className="book-meta">
                                <FontAwesomeIcon icon={faBook} /><span> </span>
                                {pluralize('Clipping', this.state.clippings.length, true)}
                            </p>
                            <p className="book-meta">
                                <FontAwesomeIcon icon={faClock} /><span> </span>
                                {datesRead}
                            </p>
                            {/* <h6>{this.props.location.state.book.originalTitle}</h6> */}
                            <p dangerouslySetInnerHTML={{ __html: this.props.location.state.book.description}}></p>
                        </Col>
                    </Row>

                    <hr className="divider" />

                    <Row>
                        {
                            this.state.clippings.map(clipping => (
                                <Col xs={12} key={clipping.id}>
                                    <blockquote className="clipping-block">
                                        <div className="clipping">
                                            <p><FontAwesomeIcon icon={faQuoteLeft} size="xs" /> {clipping.content}</p>
                                            {clipping.definition ? 
                                                <>
                                                    <p className="definition" 
                                                        dangerouslySetInnerHTML={{ __html: clipping.definition.definition}}></p> 
                                                    <p className="definition-source" 
                                                        dangerouslySetInnerHTML={{ __html: clipping.definition.definitionSource}}></p>
                                                </>
                                                : null
                                            }
                                        </div>

                                        <footer className="clipping-meta">
                                            Clipped on {clipping.highlighted} <cite title="pages">{clipping.pages}</cite>
                                        </footer>
                                    </blockquote>
                                </Col>
                            ))
                        }
                    </Row>
                </Container>
            </>
        );
    }
}

export default Book;