import React from 'react';
import ReactDOM from 'react-dom';
// import './index.css';
import Random from './Random';
import Home from './Home';
import Book from './Book';
import Search from './Search';
import * as serviceWorker from './serviceWorker';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import './custom.scss';
import typography from './typography';

ReactDOM.render(
    <Router>
        <Route exact path='/' component={Home} />
        <Route path='/book/:bookId' component={Book} />
        <Route exact path='/random' component={Random} />
        <Route path='/search/:query' component={Search} />
    </Router>, 
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
