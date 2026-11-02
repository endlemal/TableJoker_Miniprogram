import assert from 'node:assert/strict'
import { rankPlayers, parseRankIndex, moveRank } from '../src/common/room-ranking.js'
const members = ['A','B','C','D'].map(name => ({ name }))
const state = { mode: 'score', index: {}, order: [] }
const assets = { A: 20, B: 50, C: 50, D: 10 }
const names = () => rankPlayers(members, assets, state).map(r => r.name)
assert.deepEqual(names(), ['B','C','A','D'])
assert.ok(rankPlayers(members, assets, state).every(r => r.index === ''))
state.mode = 'index'; state.index = { A: 2, B: 1, C: 1 }
assert.deepEqual(names(), ['B','C','A','D'])
state.order = moveRank(names(), 'D', 0);state.mode = 'manual'
assert.deepEqual(names(), ['D','B','C','A'])
assert.deepEqual(state.index, { A: 2, B: 1, C: 1 })
assets.A = 100
assert.deepEqual(names(), ['D','B','C','A'])
state.mode = 'score';assert.deepEqual(names(), ['A','B','C','D'])
state.mode = 'index';state.index.B = '';assert.deepEqual(names(), ['C','A','D','B'])
assert.equal(parseRankIndex(''), '')
assert.equal(parseRankIndex('  '), '')
assert.equal(parseRankIndex('03'), 3)
for (const v of ['0','-1','1.2','abc','1000000']) assert.equal(parseRankIndex(v), null)
assert.deepEqual(moveRank(['A','B','C'], 'C', -10), ['C','A','B'])
assert.deepEqual(moveRank(['A','B','C'], 'A', 99), ['B','C','A'])
console.log('PASS blank/duplicate index, stable ties, drag ordering, independent sort modes, validation')
