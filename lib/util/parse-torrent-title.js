import PTT from 'parse-torrent-title'

const parser = new PTT.Parser()
PTT.addDefaults({
    addHandler(name, handler, transformer, options) {
        // The pinned parser treats any occurrence of "saga" as a collection
        // marker and truncates titles such as "The Twilight Saga: New Moon".
        // Keep the other collection rules, but let "saga" remain title text.
        if (name === 'complete' && handler instanceof RegExp && handler.source.includes('|saga')) {
            handler = new RegExp(handler.source.replace('|saga', ''), handler.flags)
        }
        parser.addHandler(name, handler, transformer, options)
    }
})

const DomainNameRegex = /^www\.[a-zA-Z0-9]+\.[a-zA-Z]{2,}[ \-]+/i
const SourcePrefixRegex = /^\[[a-zA-Z0-9 ._]+\][ \-]*/

function parse(title) {
    title = title.replace(DomainNameRegex, '')
    title = title.replace(SourcePrefixRegex, '')
    return parser.parse(title)
}

export default { parse }
