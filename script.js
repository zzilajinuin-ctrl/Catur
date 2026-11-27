const game = new Chess();
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const turnEl = document.getElementById('turn');
const historyEl = document.getElementById('history');
const emptyHistory = document.getElementById('empty-history');
let selected = null;
let flipped = false;
let legalTargets = [];
let lastMove = null;

const glyph = {
  wk:'♔', wq:'♕', wr:'♖', wb:'♗', wn:'♘', wp:'♙',
  bk:'♚', bq:'♛', br:'♜', bb:'♝', bn:'♞', bp:'♟'
};

function render(){
  boardEl.innerHTML = '';
  const files = flipped ? 'hgfedcba' : 'abcdefgh';
  const ranks = flipped ? '12345678' : '87654321';
  for(const rank of ranks){
    for(const file of files){
      const square = file + rank;
      const piece = game.get(square);
      const el = document.createElement('button');
      const isLight = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 1;
      el.className = 'square ' + (isLight ? 'light' : 'dark');
      if(selected === square) el.classList.add('selected');
      if(lastMove && (lastMove.from === square || lastMove.to === square)) el.classList.add('last');
      if(legalTargets.includes(square)) el.classList.add(piece ? 'capture' : 'legal');
      el.dataset.square = square;
      if(piece){
        const span = document.createElement('span');
        span.className = 'piece ' + (piece.color === 'w' ? 'white' : 'black');
        span.textContent = glyph[piece.color + piece.type];
        el.appendChild(span);
      }
      if((!flipped && file === 'a') || (flipped && file === 'h')){
        const coord = document.createElement('span'); coord.className='coords'; coord.textContent=rank; el.appendChild(coord);
      }
      if((!flipped && rank === '1') || (flipped && rank === '8')){
        const coord = document.createElement('span'); coord.className='coords'; coord.style.left='auto';coord.style.right='5px';coord.style.top='auto';coord.style.bottom='3px';coord.textContent=file;el.appendChild(coord);
      }
      el.addEventListener('click',()=>onSquareClick(square));
      boardEl.appendChild(el);
    }
  }
  updatePanel();
}
function onSquareClick(square){
  if(game.game_over()) return;
  const piece = game.get(square);
  if(selected && legalTargets.includes(square)){
    const move = game.move({from:selected,to:square,promotion:'q'});
    if(move){lastMove={from:move.from,to:move.to};selected=null;legalTargets=[];render();return;}
  }
  if(piece && piece.color === game.turn()){
    selected = square;
    legalTargets = game.moves({square,verbose:true}).map(m=>m.to);
  }else{selected=null;legalTargets=[];}
  render();
}
function updatePanel(){
  const turn = game.turn() === 'w' ? 'White' : 'Black';
  let message = turn + ' to move';
  if(game.in_checkmate()) message = 'Checkmate — ' + (turn === 'White' ? 'Black' : 'White') + ' wins';
  else if(game.in_draw()) message = 'Draw';
  else if(game.in_check()) message = turn + ' is in check';
  statusEl.textContent = message;
  turnEl.textContent = game.game_over() ? 'Permainan selesai' : 'Giliran ' + (turn === 'White' ? 'putih' : 'hitam');
  document.getElementById('undo').disabled = game.history().length === 0;
  const moves = game.history();
  historyEl.innerHTML = '';
  emptyHistory.style.display = moves.length ? 'none' : 'block';
  for(let i=0;i<moves.length;i+=2){
    const li=document.createElement('li');
    li.innerHTML='<span>'+(Math.floor(i/2)+1)+'.</span>'+moves[i]+(moves[i+1]?'　'+moves[i+1]:'');
    historyEl.appendChild(li);
  }
  const captured = {w:[],b:[]};
  const initial = {p:8,n:2,b:2,r:2,q:1};
  const current = {w:{p:0,n:0,b:0,r:0,q:0},b:{p:0,n:0,b:0,r:0,q:0}};
  for(const row of game.board()) for(const p of row) if(p) current[p.color][p.type]++;
  for(const color of ['w','b']) for(const type of Object.keys(initial)) for(let n=current[color][type];n<initial[type];n++) captured[color].push(glyph[(color==='w'?'b':'w')+type]);
  document.getElementById('white-captured').textContent=captured.w.join(' ');
  document.getElementById('black-captured').textContent=captured.b.join(' ');
}
document.getElementById('undo').addEventListener('click',()=>{game.undo();lastMove=null;selected=null;legalTargets=[];render();});
document.getElementById('reset').addEventListener('click',()=>{game.reset();lastMove=null;selected=null;legalTargets=[];render();});
document.getElementById('flip').addEventListener('click',()=>{flipped=!flipped;render();});
render();
