# Kindle Clippings

A web app that displays clippings that I've made on my Kindle.

Made with [Clippings.io](https://www.clippings.io/) which allows you to export clippings, 
[Goodreads](https://www.goodreads.com/) for book information, and [Wordnik](https://www.wordnik.com/) for word definitions.

More info here: https://poc275.me/kindle-clippings/

Site available here: https://kindle-clippings.netlify.app/

## TODO
- [Az Function proxies are to be deprecated in September 2025](https://azure.microsoft.com/en-gb/updates/community-support-for-azure-functions-proxies-will-end-on-30-september-2025/)

## Web site write up TODO
- Mention on the site about moving to Table Storage from Airtable
- Show how to generate a signature to access via REST API
- Explain the pagination headers and how they don't automatically appear due to CORS limitations
    - CORS requests (check with `res.type`) will only allow a limited set of headers to be queried
    - This is a server-side restriction to prevent XSS explots
    - So you need the server to expose the headers you want
    - Which you can do via the portal > Storage account > CORS settings > Exposed headers
    - You want to expose `x-ms-continuation-NextPartitionKey` and `x-ms-continuation-NextRowKey` to check for pagination
    - Inspired by this SO thread: https://stackoverflow.com/questions/43344819/reading-response-headers-with-fetch-api