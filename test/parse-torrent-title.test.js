import test from 'node:test'
import assert from 'node:assert/strict'
import PTT from '../lib/util/parse-torrent-title.js'

test('Saga in a movie title does not truncate the subtitle or mark a collection', () => {
    const info = PTT.parse('The.Twilight.Saga.New.Moon.2009.2160p.UHD.BDREMUX.DV.HDR.HEVC-Нечипорук.mkv')
    assert.equal(info.title, 'The Twilight Saga New Moon')
    assert.equal(info.year, 2009)
    assert.equal(info.resolution, '4k')
    assert.equal(info.codec, 'hevc')
    assert.deepEqual(info.hdr, ['DV', 'HDR'])
    assert.notEqual(info.complete, true)
})

test('Saga remains part of series titles', () => {
    const info = PTT.parse('Vinland.Saga.S02E03.1080p.mkv')
    assert.equal(info.title, 'Vinland Saga')
    assert.equal(info.season, 2)
    assert.equal(info.episode, 3)
})

test('explicit collection markers still identify packs', () => {
    const info = PTT.parse('The.Twilight.Saga.Complete.Collection.1080p')
    assert.equal(info.title, 'The Twilight Saga')
    assert.equal(info.complete, true)
    assert.equal(PTT.parse('Example.Trilogy.1080p').complete, true)
})
