import Typography from 'typography';
import twinPeaksTheme from 'typography-theme-twin-peaks';

const typography = new Typography({
    ...twinPeaksTheme,
    overrideThemeStyles: () => ({
        body: {
            backgroundColor: "#282C34",
            color: "#FFFFFE",
        },
        h1: {
            color: "#FFFFFE",
        },
        h2: {
            color: "#FFFFFE",
        },
        h3: {
            color: "#FFFFFE",
        },
        h4: {
            color: "#FFFFFE",
        },
        a: {
            backgroundImage: "none",
            textShadow: "none",
        },
        blockquote: {
            color: "#FFFFFE",
            fontStyle: "normal",
            paddingLeft: 0,
            borderLeft: "none",
        },
        hr: {
            borderTop: "1px solid #FFFFFE",
        },
        'footer cite': {
            color: "#FFFFFE",
        },
        '@media only screen and (max-width: 480px)': {
            blockquote: {
                color: "#FFFFFE",
                fontStyle: "normal",
                paddingLeft: 0,
                borderLeft: "none",
            }
        }
    })
});

typography.injectStyles();