import test from 'node:test'
import assert from 'node:assert/strict'
import PTT from '../lib/util/parse-torrent-title.js'
import { filterMatchingEpisode, matchesDownloadEpisode, matchesSeason } from '../lib/util/episode-matcher.js'

const cases = [
    ['Russian episode in season pack', 'Холостяк. Сезон 6', 'Выпуск 01.mkv', '', 6, 1, true],
    ['episode before label', 'Холостяк. Сезон: 6', '1-ый выпуск.mkv', '', 6, 1, true],
    ['ordinal season', 'Холостяк. 6-й сезон', '01.mkv', '', 6, 1, true],
    ['Russian episode range', 'Холостяк. Сезон 6', 'Выпуски 01-03.mkv', '', 6, 2, true],
    ['Russian series range overrides parser season guess', 'Show. Season 6', 'Серии 01-03.mkv', '', 6, 2, true],
    ['episode outside range', 'Холостяк. Сезон 6', 'Выпуски 01-03.mkv', '', 6, 4, false],
    ['wrong season regression', 'Холостяк. Сезон 6', 'Серия 1.mkv', '', 7, 1, false],
    ['missing season is ambiguous', 'Холостяк', 'Выпуск 01.mkv', '', 6, 1, false],
    ['multi-season pack is ambiguous', 'Холостяк. Сезоны 1-9', 'Выпуск 01.mkv', '', 6, 1, false],
    ['folder provides season', 'Холостяк. Сезоны 1-9', 'Выпуск 01.mkv', 'Холостяк/Сезон 6/Выпуск 01.mkv', 6, 1, true],
    ['Windows folder provides season', 'Холостяк. Сезоны 1-9', '01.mkv', 'Холостяк\\Season 06\\01.mkv', 6, 1, true],
    ['folder rejects another season', 'Холостяк. Сезоны 1-9', 'Выпуск 01.mkv', 'Холостяк/Сезон 7/Выпуск 01.mkv', 6, 1, false],
    ['conflicting folder and filename', 'Холостяк', 'S06E01.mkv', 'Сезон 7/S06E01.mkv', 6, 1, false],
    ['standard episode remains supported', 'Show', 'Show.S06E01.mkv', '', 6, 1, true],
    ['standard range', 'Show', 'Show.S06E01-E03.mkv', '', 6, 2, true],
    ['x notation', 'Show', 'Show.6x01.mkv', '', 6, 1, true],
    ['specials', 'Show', 'Show.S00E01.mkv', '', 0, 1, true],
    ['wrong episode', 'Show. Season 6', 'S06E02.mkv', '', 6, 1, false],
    ['pairs do not cross-match', 'Show', 'S01E02.S02E03.mkv', '', 1, 3, false],
    ['sample is not a full episode', 'Show', 'Show.S06E01.Sample.mkv', '', 6, 1, false],
    ['resolution is not episode', 'Show. Season 6', '1080p.mkv', '', 6, 108, false],
    ['episode token alone with parent season', 'Show. Season 6', 'E01.mkv', '', 6, 1, true]
]

for (const [label, name, filename, path, season, episode, expected] of cases) {
    test(label, () => {
        const torrent = { name, info: PTT.parse(name), videos: [{ name: filename, path, info: PTT.parse(filename) }] }
        assert.equal(filterMatchingEpisode(torrent, season, episode), expected)
        assert.equal(torrent.videos.length, expected ? 1 : 0)
    })
}

test('legacy provider season packs and explicit download episodes remain supported', () => {
    assert.equal(matchesSeason({ name: 'Show.S01-S03' }, 2), true)
    assert.equal(matchesSeason({ name: 'Show.Сезоны 1-3' }, 4), false)
    assert.equal(matchesDownloadEpisode({ name: 'Show.S02E03.mkv', info: {} }, 2, 3), true)
    assert.equal(matchesDownloadEpisode({ name: 'Серия 3.mkv', info: {} }, 2, 3), false)
})
