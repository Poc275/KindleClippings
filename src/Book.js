import React, { Component } from 'react';

class Book extends Component {

    render() {
        // console.log(this.props.location.state.book);
        return (
            <p dangerouslySetInnerHTML={{ __html: this.props.location.state.book.description}}></p>
        );
    }
}

export default Book;