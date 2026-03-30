const fs = require('fs')
const crypto = require('crypto')

function usage() {
  console.log('Usage: node generate_puzzle2.cjs <input.txt> [nonce] [out.json]')
  console.log('Input format: each line is a grid row, tokens separated by spaces; use . or • for black cells')
}

const argv = process.argv.slice(2)
if (argv.length === 0) {
  usage()
  process.exit(1)
}

const inputPath = argv[0]
const nonce = argv[1] ?? 'xw-test-2024'
const outPath = argv[2] ?? 'scripts/puzzle_output.json'

const raw = fs.readFileSync(inputPath, 'utf8').trim().split(/\r?\n/).filter(Boolean)
const gridRows = raw.map((line) => line.trim().split(/\s+/).map((t) => (t === '•' ? '.' : t)))
const rowsN = gridRows.length
const colsN = gridRows[0].length
if (!gridRows.every((r) => r.length === colsN)) {
  console.error('Error: inconsistent row lengths in input')
  process.exit(2)
}

function encodeHex(grid){
  const bits = []
  for (let r=0;r<rowsN;r++){
    for (let c=0;c<colsN;c++){
      bits.push(grid[r][c]==='.'?1:0)
    }
  }
  while(bits.length%4!==0) bits.push(0)
  let hex = ''
  for (let i=0;i<bits.length;i+=4){
    const nib = (bits[i]<<3) | (bits[i+1]<<2) | (bits[i+2]<<1) | bits[i+3]
    hex += nib.toString(16).toUpperCase()
  }
  return hex
}

function isBlack(r,c){ return c<0||c>=colsN||r<0||r>=rowsN||gridRows[r][c]==='.' }
function isWhite(r,c){ return !isBlack(r,c) }

const across = []
const down = []
const cellNumbers = Array.from({length:rowsN},()=>Array(colsN).fill(null))
let display = 0
for (let r=0;r<rowsN;r++){
  for (let c=0;c<colsN;c++){
    if (isBlack(r,c)) continue
    const startsAcross = isBlack(r,c-1) && isWhite(r,c+1)
    const startsDown = isBlack(r-1,c) && isWhite(r+1,c)
    if (startsAcross || startsDown){ display++; cellNumbers[r][c]=display }
    if (startsAcross){ const cells=[]; for(let cc=c;cc<colsN && isWhite(r,cc);cc++){ cells.push({row:r,col:cc}) } across.push({start:{r,c},cells}) }
    if (startsDown){ const cells=[]; for(let rr=r;rr<rowsN && isWhite(rr,c);rr++){ cells.push({row:rr,col:c}) } down.push({start:{r,c},cells}) }
  }
}

const Awords = across.map(w => w.cells.map(x => gridRows[x.row][x.col]).join(''))
const Dwords = down.map(w => w.cells.map(x => gridRows[x.row][x.col]).join(''))

function sha256hex(s){ return crypto.createHash('sha256').update(s,'utf8').digest('hex') }

const Aids = Array.from({length:Awords.length}, (_,i) => `a${i+1}`)
const Dids = Array.from({length:Dwords.length}, (_,i) => `d${i+1}`)

const Ahashes = Awords.map((ans,i)=>sha256hex(sha256hex(ans + Aids[i]) + nonce))
const Dhashes = Dwords.map((ans,i)=>sha256hex(sha256hex(ans + Dids[i]) + nonce))

const out = {
  rows: rowsN,
  cols: colsN,
  grid: encodeHex(gridRows),
  cellNumbers,
  across: Awords.map((w,i)=>({ id: Aids[i], word: w, hash: Ahashes[i] })) ,
  down: Dwords.map((w,i)=>({ id: Dids[i], word: w, hash: Dhashes[i] })),
  nonce,
}

fs.mkdirSync(require('path').dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 2))
console.log(`Wrote ${outPath}`)
