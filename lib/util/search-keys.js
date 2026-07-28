import fetch from 'node-fetch'

const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql'
const WIKIDATA_USER_AGENT = 'DebridSearchAltTitles/0.1 (https://github.com/Moltenship/stremio-addon-debrid-search)'

async function getSearchKeys(cinemetaDetails) {
    const names = [
        cinemetaDetails?.name,
        cinemetaDetails?.originalName,
        cinemetaDetails?.original_name,
        ...(await getWikidataTitles(cinemetaDetails?.imdb_id || cinemetaDetails?.id))
    ]

    return unique(names.flatMap(toTitleVariants))
}

async function getWikidataTitles(imdbId) {
    if (!imdbId?.match(/^tt\d+$/i)) {
        return []
    }

    const query = `
SELECT ?label ?altLabel WHERE {
  ?item wdt:P345 "${imdbId}".
  OPTIONAL { ?item rdfs:label ?label FILTER(LANG(?label) IN ("en", "ru")) }
  OPTIONAL { ?item skos:altLabel ?altLabel FILTER(LANG(?altLabel) IN ("en", "ru")) }
}`

    const url = `${WIKIDATA_SPARQL_URL}?query=${encodeURIComponent(query)}`

    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/sparql-results+json',
                'User-Agent': WIKIDATA_USER_AGENT
            },
            signal: AbortSignal.timeout(2500)
        })

        if (!response.ok) {
            return []
        }

        const body = await response.json()
        return (body?.results?.bindings || []).flatMap(binding => [
            binding?.label?.value,
            binding?.altLabel?.value
        ])
    } catch (err) {
        console.log("Failed to fetch Wikidata aliases: " + err)
        return []
    }
}

function toTitleVariants(title) {
    if (!title) {
        return []
    }

    const normalized = normalizeTitle(title)
    const withoutPunctuation = normalizeTitle(title.replace(/[:._()[\]{}'"]/g, ' '))
    const withoutDash = normalizeTitle(withoutPunctuation.replace(/-/g, ' '))

    return [normalized, withoutPunctuation, withoutDash]
}

function normalizeTitle(title) {
    return title
        .replace(/ё/gi, match => match === 'Ё' ? 'Е' : 'е')
        .replace(/[‐-―]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
}

function unique(values) {
    const seen = new Set()
    return values.filter(value => {
        if (!value) {
            return false
        }

        const key = value.toLowerCase()
        if (seen.has(key)) {
            return false
        }

        seen.add(key)
        return true
    })
}

export { getSearchKeys }
