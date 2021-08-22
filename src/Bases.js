import Airtable from 'airtable';

// List of all Airtable bases
const bases = [
    new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('appwgp8cnAsLIUpuI'),
    new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('app2XCAIl9QhJYPkr'),
    new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('appwADT4du02NZBMU'),
    new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('appm6jVVBaS1DeQJC'),
    new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('appklQU840y2TrAy8'),
    new Airtable({apiKey: process.env.REACT_APP_AIRTABLE_API_KEY}).base('app92pxeMLKnwiZrQ')
];

export default bases;