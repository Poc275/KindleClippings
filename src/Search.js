import React, { Component } from 'react';
import pluralize from 'pluralize';
import moment from 'moment';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
import bases from './Bases';
import Utilities from './Util';
import './Search.css';

class Search extends Component {

    state = {
        searchResults: []
    }

    async componentDidMount() {
        await this.search();
        // use a regex to highlight the matching text that ignores case (i flag)
        const regex = new RegExp(this.props.match.params.query, "gi");
        this.highlight(regex);
    }

    search() {
        const self = this;
        const promises = bases.map(base => {
            return new Promise((resolve, reject) => {
                base('Clippings').select({
                    view: "Grid view",
                    filterByFormula: `SEARCH("${this.props.match.params.query.toLowerCase()}", LOWER({Content}))`,
                    sort: [{field: "Title", direction: "desc"}]
                }).eachPage(function page(records, fetchNextPage) {
                    records.forEach(function(record) {
                        self.setState({
                            searchResults: [...self.state.searchResults, {
                                title: record.get('Title'),
                                author: record.get('Author'),
                                content: record.get('Content'),
                                highlighted: moment(record.get('Created').trim(), 'MM/DD/YYYY h:mm a').format('dddd, MMMM Do YYYY @ h:mm a'),
                                pages: Utilities.calculatePageNumber(record.get('Location').trim()),
                            }]
                        });
                    });
        
                    fetchNextPage();
                }, function done(err) {
                    if(err) {
                        console.error(err);
                        reject(err);
                    }
                    
                    resolve();
                });
            });
        });

        return Promise.all(promises);
    }

    highlight(regex) {
        const clippings = document.getElementsByClassName("clipping");
        for(let i = 0; i < clippings.length; i++) {
            const content = clippings[i].innerHTML;
            // mark the matching text ($&) using the HTML <mark> element
            const withHighlightSpan = content.replaceAll(regex, `<mark>$&</mark>`);
            clippings[i].innerHTML = withHighlightSpan;
        }
    }

    render() {
        return (
            <Container fluid>
                <Row>
                    <Col>
                        <h2 className="search-heading">Search Results</h2>
                        <h4>Found {pluralize('result', this.state.searchResults.length, true)} for “{this.props.match.params.query}”</h4>
                        <div className="search-divider"></div>
                    </Col>
                </Row>
                
                <Row>
                    { this.state.searchResults.map((res, idx) => (
                        <React.Fragment key={idx}>
                            {/* only show book cover on small screens and larger (hide on xs) */}
                            <Col sm={2} className="d-none d-sm-block">
                                <img src={Utilities.getBookCoverUrl(res.title)} 
                                     alt="book cover"
                                     title={`${res.title} by ${res.author}`} />
                            </Col>
                            <Col xs={12} sm={10}>
                                <blockquote className="clipping-block">
                                    <div className="clipping">
                                        <p><FontAwesomeIcon icon={faQuoteLeft} size="xs" /> {res.content}</p>
                                    </div>
                                    <footer className="clipping-meta">
                                        {res.title} | Clipped on {res.highlighted} <cite title="pages">{res.pages}</cite>
                                    </footer>
                                </blockquote>
                            </Col>
                        </React.Fragment>
                    ))}
                </Row>
            </Container>
        )
    }
}

export default Search;