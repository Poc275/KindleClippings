import CryptoJS from "crypto-js";

/**
 * Utility functions.
 */
const Utilities = {
    // function which calculates the correct page number from the kindle location
    calculatePageNumber: (location) => {
        const locations = location.split('-');
        
        // locations will either be a single element for a single page or two elements for a range of pages.
        // Actual page number = kindle location / 16.69
        // Source: https://www.reddit.com/r/kindle/comments/2528dl/kindle_location_to_relative_page_number_with_a/
        const page = Math.floor(parseInt(locations[0], 10) / 16.69);
        return `p. ${page}`;
    },

    // function which returns the formatted URL for a book's cover image stored in Azure Blob Storage
    getBookCoverUrl: (title) => {
        return `https://kindleclippings.blob.core.windows.net/hires-book-covers/${title.replaceAll(' ', '_').replace(/[.,!;:'"“”‘’()?]/g, '')}.jpg`;
    },

    // shared key signature generator
    getSharedKeySignature: (canonicResource) => {
        const date = new Date().toUTCString();
        const stringToSign = `${date}\n${canonicResource}`;
        const key = process.env.REACT_APP_AZ_STORAGE_ACCOUNT_KEY;
        const hash = CryptoJS.HmacSHA256(stringToSign, CryptoJS.enc.Base64.parse(key));
        const signature = hash.toString(CryptoJS.enc.Base64);

        return signature;
    },

    // table storage query strings must be encoded
    // https://learn.microsoft.com/en-us/rest/api/storageservices/querying-tables-and-entities#query-string-encoding
    encodeQueryString: (query) => {
        // single quotes must be escaped by a second single quote
        return encodeURIComponent(query).replace(/(')+/, "''");
    }
};

export default Utilities;