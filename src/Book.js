import React, { Component } from 'react';
import moment from 'moment';
import pluralize from 'pluralize';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft, faBook } from '@fortawesome/free-solid-svg-icons';
import { faClock } from '@fortawesome/free-regular-svg-icons';
import Utilities from './Util';
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

        // get clippings
        console.log(this.props.location);
        const encodedBookTitle = Utilities.encodeQueryString(this.props.location.state.book.originalTitle);
        const filter = `$filter=Title%20eq%20'${encodedBookTitle}'`;
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
            const clippings = data?.value.map(clipping => {
                return {
                    id: clipping.Id,
                    content: clipping.Content.trim(),
                    highlighted: moment(clipping.Created.trim(), 'MM/DD/YYYY hh:mm a'),
                    pages: Utilities.calculatePageNumber(clipping.Location.trim()),
                    definition: null
                };
            });

            this.setState({
                clippings: clippings.sort((a, b) => a.highlighted - b.highlighted)
            });

            // lookup any word definitions
            this.checkForDefinitions();
        })
        .catch(err => {
            console.error(err);
            return null;
        });
    }

    componentWillUnmount() {
        // kill any outstanding fetch requests to prevent updating 
        // state on an unmounted component if we navigate away from the home page
        this.controller.abort();
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
        const url = `https://api.wordnik.com/v4/word.json/${word.toLowerCase()}/definitions?limit=3&includeRelated=false&useCanonical=true&includeTags=false&api_key=${key}`;
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
            // some responses don't include the actual definition?! filter those out
            const definitions = json.filter(def => def.text);
            return {
                definition: definitions[0].text,
                definitionSource: definitions[0].attributionText
            };
        }).catch(err => {
            console.error('Error calling the Wordnik API: ', err.message);
        });
    }

    render() {
        // reformat the first and last clipping date to display date range the clippings were made
        const datesRead = this.state.clippings.length > 0 ? 
            this.state.clippings[0].highlighted.format("MMM Do YYYY") + " to " + 
            this.state.clippings[this.state.clippings.length - 1].highlighted.format("MMM Do YYYY")
            : null;

        // get the book image URL
        const bookImageUrl = Utilities.getBookCoverUrl(this.props.location.state.book.originalTitle);
        // console.log(bookImageUrl);

        return (
            <>
                <Container fluid>
                    <Row>
                        <Col id="hero-col">
                            <div id="hero-img" 
                                style={{ backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(40, 44, 52, 1)), url(${bookImageUrl}` }}>
                            </div>
                        </Col>
                    </Row>
                </Container>

                <Container id="content">
                    <Row>
                        <Col xs="auto">
                            <img id="book-cover" src={this.props.location.state.book.image} alt="Book cover" />
                        </Col>
                        <Col>
                            <h1>{this.props.location.state.book.originalTitle}</h1>
                            {
                                // tagline
                                this.props.location.state.book.title.split(":").length > 1 ? 
                                <p>{this.props.location.state.book.title.split(":")[1]}</p> : null
                            }
                            <h3>by {this.props.location.state.book.author}</h3>
                            <p className="book-meta">
                                <FontAwesomeIcon icon={faBook} /><span> </span>
                                {pluralize('Clipping', this.state.clippings.length, true)}
                            </p>
                            <p className="book-meta">
                                <FontAwesomeIcon icon={faClock} /><span> </span>
                                {datesRead}
                            </p>

                            {/* goodreads API info contains HTML */}
                            <p dangerouslySetInnerHTML={{ __html: this.props.location.state.book.description}}></p>
                        </Col>
                    </Row>

                    <div className="divider"></div>

                    <Row>
                        {
                            this.state.clippings.map(clipping => (
                                <Col xs={12} key={clipping.id}>
                                    <blockquote className="clipping-block">
                                        <div className="clipping">
                                            <p><FontAwesomeIcon icon={faQuoteLeft} size="xs" /> {clipping.content}</p>
                                            {/* wordnik api responses can contain HTML */
                                                clipping.definition ? 
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
                                            Clipped on {clipping.highlighted.format('dddd, MMMM Do YYYY @ hh:mm a')} <cite title="pages">{clipping.pages}</cite>
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