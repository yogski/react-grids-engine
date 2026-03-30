import type { CrosswordPuzzle } from './logic'

/**
 * Hand-crafted 10x10 test crossword for development and testing.
 *
 * Grid (• = black cell):
 *   R A I H • • U R A T
 *   A • • A G A M • • E
 *   S O A L • • A J A L
 *   U • • T • • M • • A
 *   A • S E N T I R • G
 *   H U T • • • • A R A
 *   • • I K H L A S • •
 *   M A K I • • S U I T
 *   P • E • • • • A • K
 *   R A S I • • S H I O
 *
 * Bitmask (1=black, 0=white, row-major MSB-first):
 *   // todo: generate this bitmask from the grid above
 *   // todo: generate hex
 */
export const TEST_PUZZLE_2: CrosswordPuzzle = {
  v: 1,
  id: 'test-crossword-002',
  w: 10,
  h: 10,
  grid: '0C1860C1B640878C0C305E830',
  A: {
    s: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13'],
    c: [
      'Ambil atau capai',
      'Jalur atau garis yang tampak pada permukaan (kayu, daun, dsb)',
      'Besar, kuat, tegap',
      'Perkara, urusan',
      'Saat meninggal dunia',
      'Teplok, cempor',
      'Hari Ulang Tahun',
      'Tanaman dari jenis fikus, bisa berupa pohon atau perdu',
      'Tulus, tidak mengharapkan balasan',
      'Mengumpat, menghina secara kasar',
      'Bunyi siulan',
      'Kelompok bintang yang membentuk pola tertentu di langit',
      'Zodiak Tionghoa',
    ],
    h: [
      '9ddd76b01509d03f0377906d9c81d5cced0b72750feaa71f5418379dff85310b',
      '9ce3759993f875aae7c652d28aa4482d36266bc8a21fbb7fc1bb4d0800eb6107',
      'abbd59a221de892bd71e043ba1d4e3d268af32671a54af2a979d8a8868810368',
      'f28cbe47ffd29e8eef72b2554316c185a0ac2f05b1606d1445bee0a927549ef7',
      '747555210cbfe6a1889d3199f115671d4f94124552ce5630ab46293c13d908c7',
      'b320206995e438e884bf0e9247e5f65e1f996c0010a43fc873921c23f6cf5847',
      'ef206c29de294da9d40a92922fcbdbcdafd2345ffc9a97c5f2119ad49b3c57cd',
      '522a4d404d2381114d9a3fcbf1a0fc7d826c13a12217e9e9ec9ba5b3cccac335',
      'db5e6a66b687b3b63f064ac8465493a7f2666d10872f6555b1ec9df14bc80bec',
      '30db7cc2116f3b19ce07a6436e8d1b525208d9a9623d2cf783962766520c2c6b',
      '0cc2bb1e53fd4469a2bcfa823f5fa49524e356c1cd8ced982f0494e7122251bc',
      '556dc5733b492fe02ac696a1ec6c83c8f3cfac88f80d2c5153e60a656d619cad',
      'b3559216e4217d5f629187badbef895fe94df40a8fb50e3b11a1230d4ddee0c1',
    ],
  },
  D: {
    s: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'],
    c: [
      'Tindakan korupsi atau suap',
      'Tempat pemberhentian kendaraan umum',
      'Rasa MSG',
      'Danau kecil',
      'Sekolah Tinggi Ilmu Kesehatan',
      'Tindakan korupsi atau suap',
      'Kata sapaan kepada orang tua atau guru',
      'Poros',
      'Majelis Permusyawaratan Rakyat',
      'Keputusan wasit tinju/bela diri bahwa salah seorang tak bisa melanjutkan pertandingan',
    ],
    h: [
      'ac2a27b97e8a30da6c01bd1644d776b51333a457bd3299da2c0172beccd01ff6',
      '389424f8b546fa3fa2df01c3df2941d5a3e93143f88fe79f60812bb7b08140e1',
      '0dec07597f974eec4c828b54f89cce86d641a7cf6ae1425e88c56d4115aa0234',
      'e6458b4cccc76117eb373c6bf9de95450c2378f4559673c8ef1ea85818b36ee0',
      '1eca07c0afb8af451bb78e5d71b9c55ec0f7e83ccf9a3f52df975bdb91061055',
      '8ba0dccf0a25e178a027a778b2c0763d275a7196744810eeba8ce500ea6b4de1',
      'f439102ee2f438db9d4d2b977ff17b793fcc7584e664a5a9e38a6b92b612d01d',
      '8c9bd409b1acf23c7efa3f19a226b37f75bac08b43914525bdfa18451dc1a9c7',
      '959e8b04c16e85e55eea32a1328b7ce294ba5afe8da94e33de6d2194de14e551',
      'ace9e98da82bbe65ee910139e4c024532eabee92dd07ab2e4cc2cd51d4ea0575',
    ],
  },
  nonce: 'xw-test-2024',
}
