import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl from 'react-bootstrap/FormControl';
import './Home.css';
import Utilities from './Util';

class Home extends Component {
    constructor() {
        super();
        this.controller = new AbortController();
        this.signal = this.controller.signal;
    }

    state = {
        books: [],
        searchString: ""
    };

    async componentDidMount() {
        const books = await this.getBooks();

        books.forEach(async book => {
            // check cache before fetching book info
            if(sessionStorage.getItem(book.GoodreadsId)) {
                // console.log('Reading book from cache!');
                const parsedBook = JSON.parse(sessionStorage.getItem(book.GoodreadsId));
                this.setState({
                    books: [...this.state.books, parsedBook]
                });

            } else {
                // book not in cache, make API call
                // console.log('Reading book from API');
                const bookInfo = await this.getBookInfo(book.GoodreadsId);
                // console.log(bookInfo);

                let description = "";
                if(bookInfo) {
                    if(bookInfo.getElementsByTagName("description").length > 0 && 
                        bookInfo.getElementsByTagName("description")[0].childNodes.length > 0) {
                            description = bookInfo.getElementsByTagName("description")[0].childNodes[0].nodeValue;
                    }

                    const bookWithInfo = {
                        id: bookInfo.getElementsByTagName("id")[0].childNodes[0].nodeValue,
                        title: bookInfo.getElementsByTagName("title")[0].childNodes[0].nodeValue,
                        originalTitle: book.Title,
                        author: bookInfo.getElementsByTagName("authors")[0].getElementsByTagName("author")[0].getElementsByTagName("name")[0].childNodes[0].nodeValue,
                        image: bookInfo.getElementsByTagName('image_url')[0].childNodes[0].nodeValue,
                        // year: bookInfo.getElementsByTagName("publication_year")[0].childNodes[0].nodeValue,
                        // month: bookInfo.getElementsByTagName("publication_month")[0].childNodes[0].nodeValue,
                        // day: bookInfo.getElementsByTagName("publication_day")[0].childNodes[0].nodeValue,
                        description: description
                    };

                    sessionStorage.setItem(book.GoodreadsId, JSON.stringify(bookWithInfo));
                    
                    this.setState({
                        books: [...this.state.books, bookWithInfo]
                    });
                }
            }
        });
    }

    componentWillUnmount() {
        // kill any outstanding fetch requests to prevent updating 
        // state on an unmounted component if we navigate away from the home page
        this.controller.abort();
    }

    getBooks() {
        const url = "https://kindleclippings.table.core.windows.net/books()";
        const signature = Utilities.getSharedKeySignature("/kindleclippings/books()");

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
            return data?.value;
        })
        .catch(err => {
            console.error(err);
            return null;
        });
    }

    // call the Goodreads API for book information
    async getBookInfo(id) {
        const key = process.env.REACT_APP_GOODREADS_API_KEY;

        // Goodreads API doesn't allow CORS so I've setup a proxy backend Azure Function App
        // which forwards to the actual Goodreads API
        const url = `https://goodreads-proxy.azurewebsites.net/book/show/${id}/${key}`;
        // pass abort signal so we can cancel the fetch request when component unmounts
        const signal = this.signal;

        return fetch(url, { signal }).then(res => {
            if(res.ok) {
                return res.text();
            }
            console.error('Goodreads API response not OK:', res);
            throw new Error('Goodreads API response not OK: ' + res);
        }).then(xml => {
            return new DOMParser().parseFromString(xml, 'text/xml');
        }).then(data => {
            return data.getElementsByTagName('book')[0];
        }).catch(err => {
            console.error('Error calling the Goodreads API:', err.message);
        });
    }

    searchInputOnChange = (event) => {
        this.setState({
            searchString: event.target.value
        });
    }

    render() {
        const alphabet = ["0-9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

        return (
            <Container className="mt-3">
                <h1>Kindle Clippings</h1>
                <p>This site contains all of my Kindle clippings. For more information about this project please visit <a href="https://poc275.me/kindle-clippings">my portfolio</a>.</p>
                <p>Made with <a href="https://www.clippings.io/">Clippings.io</a>, <a href="https://www.goodreads.com/">Goodreads</a> and <a href="https://developer.wordnik.com/">Wordnik</a>.</p>
                <p>View clippings by book, get a random clipping, or do a keyword/s search.</p>

                <Row>
                    <Col md={3} className="mb-3">
                        <Button variant="primary" href="/random">Random Clipping!</Button>
                    </Col>

                    <Col md={9}>
                        <InputGroup>
                            <FormControl
                                placeholder="Search..."
                                aria-label="Keyword/s search"
                                aria-describedby="search-btn"
                                onChange={this.searchInputOnChange}
                            />
                            <Button variant="link" id="search-btn" href={`/search/${this.state.searchString}`} disabled={this.state.searchString === ""}>
                                Search
                            </Button>
                        </InputGroup>
                    </Col>
                </Row>

                {
                    // display books by first letter
                    alphabet.map(letter => {
                        let filteredBooks = [];

                        if(letter === "0-9") {
                            // group books starting with a number together
                            filteredBooks = this.state.books.filter(({ title }) => {
                                return title.substr(0, 1).match(/[0-9]/g)
                            });
                        } else {
                            filteredBooks = this.state.books.filter(({ title }) => {
                                // if book starts 'The ' (4 character substring) then put it in the shelf the next word begins with
                                if(title.startsWith('The')) {
                                    return title.substring(4).startsWith(letter)
                                }
                                return title.startsWith(letter)
                            });
                        }

                        return (
                            filteredBooks.length > 0 ? 
                                <Row key={letter} className="letter-row">
                                    <Col>
                                        <h2 className="letter-heading"><span className="letter-heading-text">{letter}</span></h2>
                                        {
                                            filteredBooks.map(book => (
                                                <Link 
                                                    key={book.id} 
                                                    to={{
                                                        pathname: `/book/${book.originalTitle}`,
                                                        state: { book: book }
                                                    }}>
                                                        {/* <img src={book.image} alt="Book cover" title={book.title + ' - ' + book.author} style={{ height: '98px', padding: 0, margin: 0 }} /> */}
                                                        <Image className="book-cover" src={book.image} alt="Book cover" title={`${book.title} by ${book.author}`} />
                                                </Link>
                                            ))
                                        }
                                    </Col>
                                </Row>
                            : null
                        )
                    })
                }
            </Container>
        );
    }
}

export default Home;