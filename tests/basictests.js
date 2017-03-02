var test = require('tape');
var GetWord2VecNeighbors = require('../index');
var assertNoError = require('assert-no-error');
var createNounfinder = require('nounfinder');
var createProbable = require('probable').createProbable;
var seedrandom = require('seedrandom');
var createWordnok = require('wordnok').createWordnok;
var config = require('../config');

var cases = [
  {
    name: 'Words from vision',
    seed: 'vision',
    words: ['logo', 'brand'],
    expected: ['trademark infringement'],
    nounWordsOnly: true
  },
  {
    name: 'empathy, trump',
    seed: 'empathy trump',
    words: ['empathy', 'trump'],
    expected: ['desperateness'],
    nounWordsOnly: true
  },
  {
    name: 'Weird short words',
    seed: 'weird',
    words: ['comp', 'ar'],
    expected: [ 'crit', 'uni'],
    nounWordsOnly: true
  },
  {
    name: 'Vermin',
    seed: 'vermin',
    words: ['mice', 'spider', 'insect'],
    expected:[ 'critter', 'snake', 'grasshopper', 'squirrel', 'critter', 'bee', 'gopher', 'insect eater', 'creepy critters', 'woolly bears' ],
    nounWordsOnly: true
  },
  {
    name: 'Not in word2vec model',
    seed: 'missing',
    words: ['match-up'],
    expected: undefined,
    nounWordsOnly: true
  },
  {
    name: 'Filter dumb phrases',
    seed: 'filter',
    words: ['promenade', 'spittal'],
    expected: [ 'promenade', 'seafront', 'quay', 'piazza', 'quayside', 'quay', 'seafront promenade', 'roof terrace', 'pavement cafés', 'cobblestone lanes' ],
    nounWordsOnly: true
  },

  {
    name: 'Words from vision (non-nouns allowed)',
    seed: 'vision',
    words: ['logo', 'brand'],
    expected: ['trademark infringement'],
    nounWordsOnly: false
  },
  {
    name: 'empathy, trump (non-nouns allowed)',
    seed: 'empathy trump',
    words: ['empathy', 'trump'],
    expected: [ 'genuine', 'underrates', 'indicitive', 'verbalized', 'true', 'desperateness', 'woefully misplaced', 'elicit yawns', 'elicits giggles', 'defy logic', 'elicit groans', 'conveniently glossed' ],
    nounWordsOnly: false
  },
  {
    name: 'Weird short words (non-nouns allowed)',
    seed: 'weird',
    words: ['comp', 'ar'],
    expected: [ 'crit', 'obv', 'uni', 'grat', 'actaully', 'acctually' ],
    nounWordsOnly: false
  },
  {
    name: 'Vermin (non-nouns allowed)',
    seed: 'vermin',
    words: ['mice', 'spider', 'insect'],
    expected: [ 'critter', 'snake', 'grasshopper', 'squirrel', 'critters', 'bee', 'gopher', 'insect eater', 'creepy crawly', 'creepy critters', 'woolly bears' ],
    nounWordsOnly: false
  },
  {
    name: 'Not in word2vec model (non-nouns allowed)',
    seed: 'missing',
    words: ['match-up'],
    expected: undefined,
    nounWordsOnly: false
  },
  {
    name: 'Filter dumb phrases (non-nouns allowed)',
    seed: 'filter',
    words: ['promenade', 'spittal'],
    expected: [ 'promenades', 'seafront', 'quay', 'piazza', 'quayside', 'quays', 'seafront promenade', 'roof terrace', 'pavement cafés', 'cobblestone lanes' ],
    nounWordsOnly: false
  },

  {
    name: 'No sampling',
    seed: 'no-sampling',
    words: ['magic', 'fire', 'cloud'],
    expected: [ 'blazing', 'dominoed', 'avalance', 'downpour', 'jubiliation', 'drizzling', 'scorching', 'palm trees swayed', 'lurks ominously', 'lurking menacingly', 'cheers resounded' ],
    nounWordsOnly: false,
    doNotSample: true
  },

  {
    name: 'No ** neighbors',
    seed: '**',
    words: ['crazy', 'stupid'],
    nounWordsOnly: false,
    expected: [
      'dumb',
      'insane',
      'weird',
      'scarey',
      'freaky',
      'dumbest',
      'wacko',
      'wacky',
      'scared shitless'
    ]
  }
];

var nounfinder = createNounfinder({
  wordnikAPIKey: config.wordnikAPIKey
});

var wordnok =  createWordnok({
  apiKey: config.wordnikAPIKey
});

cases.forEach(runTest);

function runTest(testCase) {
  test(testCase.name, runTest);

  function runTest(t) {
    var getWord2VecNeighbors = GetWord2VecNeighbors({
      gnewsWord2VecURL: config.gnewsWord2VecURL,
      nounfinder: nounfinder,
      probable: createProbable({
        random: seedrandom(testCase.seed)
      }),
      wordnok: wordnok,
      nounLikePhrasesOnly: true,
      nounWordsOnly: testCase.nounWordsOnly,
      doNotSample: testCase.doNotSample
    });
    getWord2VecNeighbors(testCase.words, checkNeighbors);

    function checkNeighbors(error, neighbors) {
      assertNoError(t.ok, error, 'No error while getting neighbors.');
      t.deepEqual(neighbors, testCase.expected, 'Neighbors are correct.');
      t.end();
    }
  }
}
