var request = require('request');
var sb = require('standard-bail')();
var pluck = require('lodash.pluck');
var compact = require('lodash.compact');
var queue = require('d3-queue').queue;
var IsVerb = require('./is-verb');
var callNextTick = require('call-next-tick');

var underscoreRegex = /_/g;
var uppercaseRegex = /[A-Z]/g;
var dotcomRegex = /[^\s]+\.[^\s]+/;

var badPhraseStarts = [
  'TO_',
  'WHEN_',
  'WITH_',
  'IN_PART',
  'WILL_',
  'SIEG_HEIL',
  'CHING_CHING',
  'FATTER_WALLET'
];

var badPhraseEnds = [
  '_OF',
  '_TO',
  '_THE'
];

function GetWord2VecNeighbors({
  gnewsWord2VecURL,
  nounfinder,
  probable,
  wordnok,
  nounLikePhrasesOnly,
  nounWordsOnly,
  doNotSample
}) {

  var isVerb = IsVerb({
    wordnok: wordnok
  });

  return getWord2VecNeighbors;

  function getWord2VecNeighbors(words, done) {
    var wordsToGetNeighborsOf;
    if (doNotSample) {
      wordsToGetNeighborsOf = words;
    }
    else {
      var sampleSize = probable.rollDie(words.length);
      wordsToGetNeighborsOf = probable.sample(words, sampleSize);
    }
    console.log(wordsToGetNeighborsOf);

    var opts = {
      method: 'GET',
      json: true,
      url: gnewsWord2VecURL,
      qs: {
        words: wordsToGetNeighborsOf.join(',')
      }
    };
    request(opts, sb(pickWords, done));
  }

  function pickWords(res, body, done) {
    if (body && body.message === 'Key not found in database') {
      done();
      return;
    }
    // console.log(JSON.stringify(body, null, '  '));
    // In the context of w2v results, we can throw out two-letter words.
    var words = pluck(body, 'word').filter(wordIsOK);
    var phrases = [];
    var normalWords = [];

    words.forEach(putWordInBucket);
    phrases = phrases.filter(phraseIsOK);

    if (nounWordsOnly) {
      var nounFindingQueue = queue(2);
      nounFindingQueue.defer(nounfinder.getNounsFromWords, normalWords);
      // WARNING: nounLikePhrasesOnly only kicks in if nounWordsOnly is true.
      if (nounLikePhrasesOnly) {
        nounFindingQueue.defer(getPhrasesEndingInNouns, phrases);
      }
      nounFindingQueue.awaitAll(recombineBuckets);
    }
    else {
      callNextTick(done, null, normalWords.concat(phrases).map(replaceUnderscores));
    }

    function putWordInBucket(word) {
      if (word.indexOf('_') === -1) {
        normalWords.push(word);
      }
      else {
        phrases.push(word);
      }
    }

    function recombineBuckets(error, wordGroups) {
      if (error) {
        done(error);
      }
      else {
        var wordNouns = wordGroups[0];
        if (wordGroups.length > 1) {
          var phrasesWithNouns = wordGroups[1];
        }
        // console.log('normalWords', normalWords, 'phrases', phrases);
        // console.log('wordNouns', wordNouns, 'phrasesWithNouns', phrasesWithNouns);
        done(
          null, wordNouns.concat(compact(phrasesWithNouns).map(replaceUnderscores))
        );
      }
    }

    function getPhrasesEndingInNouns(phrases, done) {
      var q = queue();
      phrases.forEach(queueCheck);
      q.awaitAll(done);

      function queueCheck(phrase) {
        q.defer(findOutIfPhraseIsSuitable, phrase);
      }

      function findOutIfPhraseIsSuitable(phrase, findDone) {
        var phraseWords = phrase.split('_');
        if (phraseWords.length < 1) {
          callNextTick(findDone);
        }
        else {
          var q = queue();
          q.defer(nounfinder.getNounsFromWords, phraseWords.slice(-1));
          q.defer(isVerb, phraseWords[0]);
          q.await(passPhrase);
        }

        function passPhrase(error, phraseNouns, isVerb) {
          if (error) {
            findDone(error);
          }
          else {
            findDone(null, phraseNouns.length > 0 && !isVerb ? phrase : null);
          }
        }        
      }
    }
  }
}

function replaceUnderscores(w) {
  return w.replace(underscoreRegex, ' ');
}

function wordIsOK(word) {
  return word && word.length > 2 &&
    !word.match(uppercaseRegex) && !word.match(dotcomRegex);
}

function phraseIsOK(phrase) {
  return !badPhraseStarts.some(startsWith) &&
    !badPhraseEnds.some(endsWith) &&
    phrase.indexOf('*') === -1;

  function startsWith(badStart) {
    return phrase.startsWith(badStart);
  }

  function endsWith(badEnd) {
    return phrase.endsWith(badEnd);
  }
}

module.exports = GetWord2VecNeighbors;
