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
    }
};

export default Utilities;