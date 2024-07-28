import React, { Component } from 'react';
import pluralize from 'pluralize';
import moment from 'moment';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
import Utilities from './Util';
import './Search.css';

class Search extends Component {

    state = {
        searchResults: []
    }

    async componentDidMount() {
        this.search();
    }

    // Table Storage API doesn't provide a search function nor is there a LIKE equivalent...
    // Need to find a more optimum solution but for now just do a whole table scan :| and filter for the search term
    search(nextPartitionKey = null, nextRowKey = null) {
        // add paginated headers to url if present
        const url = nextPartitionKey && nextRowKey ? 
            `https://kindleclippings.table.core.windows.net/clippings()?NextPartitionKey=${nextPartitionKey}&NextRowKey=${nextRowKey}` : 
            `https://kindleclippings.table.core.windows.net/clippings()`;
        const signature = Utilities.getSharedKeySignature("/kindleclippings/clippings()");
        let paginate = false;

        fetch(url, {
            method: "GET",
            headers: {
                'Authorization': `SharedKeyLite kindleclippings:${signature}`,
                'x-ms-version': '2021-04-10',
                'x-ms-date': new Date().toUTCString(),
                'Accept': 'application/json;odata=nometadata'
            }
        })
        .then(res => {
            // check for pagination headers
            nextPartitionKey = res.headers.get('x-ms-continuation-NextPartitionKey');
            nextRowKey = res.headers.get('x-ms-continuation-NextRowKey');
            paginate = nextPartitionKey !== null && nextRowKey !== null;

            return res.ok ? res.json() : null;
        })
        .then(data => {
            // console.log(data);
            const relevantResults = data?.value
                .filter(x => x.Content.toLowerCase().includes(this.props.match.params.query.toLowerCase()))
                .map(x => {
                    return {
                        title: x.Title,
                        author: x.Author,
                        content: x.Content,
                        highlighted: moment(x.Created.trim(), 'MM/DD/YYYY h:mm a').format('dddd, MMMM Do YYYY @ h:mm a'),
                        pages: Utilities.calculatePageNumber(x.Location.trim())
                    }
                });
            this.setState({
                searchResults: [...this.state.searchResults, ...relevantResults]
            }, () => {
                // use a regex to highlight the matching text that ignores case (i flag)
                // needs the state update to be complete, so doing it in the setState callback
                const regex = new RegExp(this.props.match.params.query, "gi");
                this.highlight(regex);
            });

            if(paginate) {
                this.search(nextPartitionKey, nextRowKey);
            }
        })
        .catch(err => {
            console.error(err);
            return null;
        });
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