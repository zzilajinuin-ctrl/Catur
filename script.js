const game = new Chess();
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const turnEl = document.getElementById('turn');
const historyEl = document.getElementById('history');
const emptyHistory = document.getElementById('empty-history');
const engineState = document.getElementById('engine-state');
const glyph = {wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
let selected=null, flipped=false, legalTargets=[], lastMove=null, engine=null;
let engineReady=false, engineBusy=false, humanColor='w', requestId=0;

function setEngineState(text,ready=false){
  engineState.innerHTML='<span class="pulse '+(ready?'ready':'')+'"></span>'+text;
}
function initEngine(){
  // Stockfish 16 package uses these exact filenames under /src/.
  // A Blob worker lets the page create a worker while the engine assets load from jsDelivr.
  const engineBase='https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/';
  const engineFile='stockfish-nnue-16-single.js';
  const workerCode=`
    var Module = {
      locateFile: function(path) {
        return '${engineBase}' + path;
      }
    };
    importScripts('${engineBase}${engineFile}');
  `;
  try{
    const blob=new Blob([workerCode],{type:'text/javascript'});
    const workerUrl=URL.createObjectURL(blob);
    engine=new Worker(workerUrl);
    engine.onmessage=(event)=>{
      const line=typeof event.data==='string'?event.data:'';
      if(line==='uciok'){
        engine.postMessage('isready');
      } else if(line==='readyok'){
        engineReady=true;
        setEngineState('Engine ready · Stockfish 16 WASM',true);
        maybeComputerMove();
      } else if(line.startsWith('bestmove')){
        engineBusy=false;
        const move=line.split(/\s+/)[1];
        if(move && move!=='(none)' && !game.game_over()){
          const from=move.slice(0,2),to=move.slice(2,4),promotion=move[4];
          const result=game.move({from,to,promotion:promotion||'q'});
          if(result){
            lastMove={from:result.from,to:result.to};
            selected=null;legalTargets=[];render();
          }
        } else {
          render();
        }
      }
    };
    engine.onerror=(event)=>{
      engineReady=false;engineBusy=false;
      const detail=event.message||'Worker/CDN/WASM load error';
      setEngineState('Gagal memuat engine: '+detail+' · Periksa koneksi lalu refresh.');
      statusEl.textContent='Stockfish tidak tersedia';
    };
    engine.onmessageerror=()=>{
      engineReady=false;engineBusy=false;
      setEngineState('Respons engine tidak terbaca. Refresh halaman untuk mencoba lagi.');
    };
    engine.postMessage('uci');
  }catch(err){
    engineReady=false;
    setEngineState('Browser gagal membuat Web Worker: '+err.message);
  }
}
function askEngine(){
  if(!engineReady||engineBusy||game.game_over()||game.turn()===humanColor)return;
  engineBusy=true;requestId++;
  const depth=Number(document.getElementById('level').value);
  statusEl.textContent='Stockfish is thinking…';
  turnEl.textContent='Menganalisis posisi';
  engine.postMessage('position fen '+game.fen());
  engine.postMessage('go depth '+depth);
}
function maybeComputerMove(){if(engineReady && game.turn()!==humanColor)askEngine();}
function render(){
  boardEl.innerHTML='';
  const files=flipped?'hgfedcba':'abcdefgh',ranks=flipped?'12345678':'87654321';
  for(const rank of ranks)for(const file of files){
    const square=file+rank,piece=game.get(square),el=document.createElement('button');
    const isLight=(files.indexOf(file)+ranks.indexOf(rank))%2===1;
    el.className='square '+(isLight?'light':'dark');
    if(selected===square)el.classList.add('selected');
    if(lastMove&&(lastMove.from===square||lastMove.to===square))el.classList.add('last');
    if(legalTargets.includes(square))el.classList.add(piece?'capture':'legal');
    if(piece){const span=document.createElement('span');span.className='piece '+(piece.color==='w'?'white':'black');span.textContent=glyph[piece.color+piece.type];el.appendChild(span);}
    if((!flipped&&file==='a')||(flipped&&file==='h')){const c=document.createElement('span');c.className='coords';c.textContent=rank;el.appendChild(c);}
    if((!flipped&&rank==='1')||(flipped&&rank==='8')){const c=document.createElement('span');c.className='coords';c.style.left='auto';c.style.right='5px';c.style.top='auto';c.style.bottom='3px';c.textContent=file;el.appendChild(c);}
    el.addEventListener('click',()=>onSquareClick(square));boardEl.appendChild(el);
  }
  updatePanel();
}
function onSquareClick(square){
  if(game.game_over()||engineBusy||!engineReady||game.turn()!==humanColor)return;
  const piece=game.get(square);
  if(selected&&legalTargets.includes(square)){
    let promotion='q';
    const moving=game.get(selected);
    if(moving&&moving.type==='p'&&(square[1]==='8'||square[1]==='1')){
      const answer=prompt('Promosi pion: q (Queen), r (Rook), b (Bishop), n (Knight)','q');
      promotion=['q','r','b','n'].includes((answer||'q').toLowerCase())?(answer||'q').toLowerCase():'q';
    }
    const move=game.move({from:selected,to:square,promotion});
    if(move){lastMove={from:move.from,to:move.to};selected=null;legalTargets=[];render();setTimeout(maybeComputerMove,80);return;}
  }
  if(piece&&piece.color===humanColor){selected=square;legalTargets=game.moves({square,verbose:true}).map(m=>m.to);}
  else{selected=null;legalTargets=[];}
  render();
}
function updatePanel(){
  const turn=game.turn()==='w'?'White':'Black';
  let message=turn+' to move';
  if(game.in_checkmate())message='Checkmate — '+(turn==='White'?'Black':'White')+' wins';
  else if(game.in_draw())message='Draw';
  else if(game.in_check())message=turn+' is in check';
  if(engineBusy)message='Stockfish is thinking…';
  statusEl.textContent=message;
  turnEl.textContent=game.game_over()?'Permainan selesai':(turn===humanColor?'Giliran kamu':'Giliran Stockfish');
  document.getElementById('undo').disabled=game.history().length===0||engineBusy;
  const moves=game.history();historyEl.innerHTML='';emptyHistory.style.display=moves.length?'none':'block';
  for(let i=0;i<moves.length;i+=2){const li=document.createElement('li');li.textContent=(Math.floor(i/2)+1)+'. '+moves[i]+(moves[i+1]?'   '+moves[i+1]:'');historyEl.appendChild(li);}
  const initial={p:8,n:2,b:2,r:2,q:1},current={w:{p:0,n:0,b:0,r:0,q:0},b:{p:0,n:0,b:0,r:0,q:0}};
  for(const row of game.board())for(const p of row)if(p)current[p.color][p.type]++;
  const captured={w:[],b:[]};
  for(const color of ['w','b'])for(const type of Object.keys(initial))for(let n=current[color][type];n<initial[type];n++)captured[color].push(glyph[(color==='w'?'b':'w')+type]);
  document.getElementById('white-captured').textContent=captured.w.join(' ');
  document.getElementById('black-captured').textContent=captured.b.join(' ');
}
document.getElementById('undo').addEventListener('click',()=>{
  if(engineBusy)return;
  game.undo();
  if(game.turn()===humanColor && game.history().length)game.undo(); // Remove the matching human move too.
  lastMove=null;selected=null;legalTargets=[];render();
});
document.getElementById('reset').addEventListener('click',()=>{
  if(engineBusy&&engine)engine.postMessage('stop');
  engineBusy=false;game.reset();lastMove=null;selected=null;legalTargets=[];render();maybeComputerMove();
});
document.getElementById('flip').addEventListener('click',()=>{flipped=!flipped;render();});
document.getElementById('side').addEventListener('change',(e)=>{
  humanColor=e.target.value;
  document.getElementById('white-name').textContent=humanColor==='w'?'YOU':'STOCKFISH';
  document.getElementById('black-name').textContent=humanColor==='b'?'YOU':'STOCKFISH';
  game.reset();lastMove=null;selected=null;legalTargets=[];render();maybeComputerMove();
});
document.getElementById('level').addEventListener('change',()=>{});
render();
initEngine();
