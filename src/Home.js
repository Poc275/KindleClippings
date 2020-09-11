import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Airtable from 'airtable';

class Home extends Component {
    constructor() {
        super();
        this.controller = new AbortController();
        this.signal = this.controller.signal;
    }

    state = {
        books: []
    };

    async componentDidMount() {
        const books = await this.getBooks();
        // console.log('getBooks() returned:', books);

        books.forEach(async book => {
            // check cache before fetching book info
            if(sessionStorage.getItem(book.goodreadsId)) {
                // console.log('Reading book from cache!');
                const parsedBook = JSON.parse(sessionStorage.getItem(book.goodreadsId));
                this.setState({
                    books: [...this.state.books, parsedBook]
                });

            } else {
                // book not in cache, make API call
                // console.log('Reading book from API');
                const bookInfo = await this.getBookInfo(book.goodreadsId);
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
                        originalTitle: book.title,
                        author: bookInfo.getElementsByTagName("authors")[0].getElementsByTagName("author")[0].getElementsByTagName("name")[0].childNodes[0].nodeValue,
                        image: bookInfo.getElementsByTagName('image_url')[0].childNodes[0].nodeValue,
                        // year: bookInfo.getElementsByTagName("publication_year")[0].childNodes[0].nodeValue,
                        // month: bookInfo.getElementsByTagName("publication_month")[0].childNodes[0].nodeValue,
                        // day: bookInfo.getElementsByTagName("publication_day")[0].childNodes[0].nodeValue,
                        description: description
                    };

                    sessionStorage.setItem(book.goodreadsId, JSON.stringify(bookWithInfo));
                    
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
        const base = new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('appZ1EK6b3jNQEZs1');
        const books = [];

        return new Promise((resolve, reject) => {
            base('Index').select({
                view: "Grid view",
                sort: [{field: "Title"}]
            }).eachPage(function page(records, fetchNextPage) {
                records.forEach(function(record) {
                    books.push({
                        title: record.get('Title'),
                        goodreadsId: record.get('GoodreadsId')
                    });
                });
    
                fetchNextPage();
            }, function done(err) {
                if(err) {
                    console.error(err);
                    reject(err);
                }
    
                resolve(books);
            });
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

    render() {
        return (
            <>
                {
                    this.state.books.map(book => (
                        <Link 
                            key={book.id} 
                            to={{
                                pathname: `/book/${book.title}`,
                                state: { book: book }
                            }}>
                                <img src={book.image} alt="Book cover" title={book.title + ' - ' + book.author} style={{ height: '98px', padding: 0, margin: 0 }} />
                        </Link>
                    ))
                }
            </>
        );
    }
}

export default Home;