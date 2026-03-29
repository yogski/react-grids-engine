import type { CrosswordPuzzle } from './logic'

/**
 * Hand-crafted 9×9 test crossword for development and testing.
 *
 * Grid (• = black cell):
 *   • • C A R A V E L
 *   • • A • • • I • •
 *   B O W • • • X • •
 *   O • • • • • E L M
 *   T • O C E A N • O
 *   O C T • • • • • O
 *   • • T • • • T A R
 *   • • E • • • U • •
 *   H O R I Z O N • •
 *
 * Bitmask (1=black, 0=white, row-major MSB-first):
 *   110000000 110111011 000111011 011111000 010000010
 *   000111110 110111000 110111011 000000011
 * → hex: C06EC76F8410FB71BB018
 */
export const TEST_PUZZLE: CrosswordPuzzle = {
  v: 1,
  id: 'test-crossword-001',
  w: 9,
  h: 9,
  grid: 'C06EC76F8410FB71BB018',
  A: {
    s: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'],
    c: [
      'Popular sailing ship from the Age of Exploration',
      'Front of a ship',
      'Common wood in furniture',
      'Vast body of water',
      'Abbr. month name in Gregorian calendar',
      'Dark, thick liquid from wood',
      'Distant line at sea',
    ],
    h: [
      'b2c2d27a52e84d9ba43cb103334bdfd63ea5d2f7c8c731d185ce3270539de5da',
      '6d0be5186bbb752c273259eb5b63d9ca8eb8497f0674aa523b682ed2075b4abb',
      'a1e827cb247e918bd35c36df850bef41794cf58dcee9936669b9346b5d7f33f2',
      'e06535ab7289c0661e683a5b3f0db1a48eec39e3bf7505a565544a963543e522',
      '3fe2a9bab0914d6871a2f103dbc76f5d1db810622a50f987174554cf1685ed00',
      '4eec8580e02ea2b8fd087cf87e1edc308d24d3be4a1335c48e204296f5cf58bc',
      '0698fd92309091fe510f78e6c88a223c5191b69f9e3e7ae7f3d979ab5bfc34c0',
    ],
  },
  D: {
    s: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'],
    c: [
      'Cry of a crow',
      'Female fox',
      'Amazon river dolphin',
      'To anchor a ship',
      'Semi-aquatic weasel',
      'Large cask for storing liquids',
    ],
    h: [
      '005eb91acd320a1cbb748ba202f2bc67a074ab000dabb2ccce96ad523bd72516',
      '0760914996dd876d882d48250845c6bb5cc0058b11075a8d2a4a336629d5d09c',
      '6376991a52c7b1d95aa177f35587412a8d63d34dba896b5d87c8a8b45d46ed99',
      'b22e6842cb2f4a2f69e8a023d9c33fdf7461b19c9336985acb31dd832eab4308',
      '42ca66eb144036ef7668ef8923acda6e0017d9e2f79228c2b4411ec26eb41e08',
      'd095518fca68b73985690fdea2d73dcffa4d8ec4d2fb9a66b3d93fe24ba5e265',
    ],
  },
  nonce: 'xw-test-2024',
}
