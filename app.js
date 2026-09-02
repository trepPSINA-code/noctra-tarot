const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const screen = document.getElementById('screen');
const backBtn = document.getElementById('backBtn');
const cards = window.TARO_CARDS || [];

const spreads = {
  one: {title:'1 КАРТА', sub:'Совет дня', count:1, positions:['Главный ответ']},
  three: {title:'3 КАРТЫ', sub:'Прошлое · Настоящее · Будущее', count:3, positions:['Прошлое','Настоящее','Будущее']},
  love: {title:'ОТНОШЕНИЯ', sub:'Анализ отношений', count:3, positions:['Вы','Партнёр','Связь между вами']},
  situation: {title:'СИТУАЦИЯ', sub:'Анализ ситуации', count:3, positions:['Что происходит','Что влияет','Совет']},
  yesno: {title:'ДА / НЕТ', sub:'Получить ответ', count:1, positions:['Ответ']},
};

let current='home';
let selectedSpread=null;
let board=[];
let picked=[];
let drawn=[];

function saveHistory(item){
  const h=JSON.parse(localStorage.getItem('taro_history')||'[]');
  h.unshift(item);
  localStorage.setItem('taro_history', JSON.stringify(h.slice(0,30)));
}

function shuffle(arr){
  const copy=[...arr];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}

function home(){
  current='home';
  screen.innerHTML=`
    <section class="hero">
      <div class="hero"><h1>TARO</h1><p>персональный расклад</p></div>
      <div class="eye"></div>
      <div class="muted">Что вас интересует?</div>
    </section>
    <div class="grid">${Object.entries(spreads).map(([k,v])=>`
      <button class="card-btn" data-spread="${k}">
        <div class="card-title">${v.title}</div><div class="card-sub">${v.sub}</div>
      </button>`).join('')}</div>`;
  document.querySelectorAll('[data-spread]').forEach(b=>b.onclick=()=>deck(b.dataset.spread));
}

function makeBoard(){
  const count=Math.min(7,cards.length);
  const pool=shuffle(cards).slice(0,count);
  return pool.map(card=>({card,reversed:Math.random()<0.28}));
}

function deck(type){
  current='deck';
  selectedSpread=spreads[type];
  picked=[];
  board=makeBoard();
  renderDeck(type);
}

function renderDeck(type){
  screen.innerHTML=`
    <div class="section-title">${selectedSpread.title}</div>
    <div class="center muted">Сконцентрируйтесь на вопросе<br>и выберите ${selectedSpread.count===1?'карту':'карты'}</div>
    <div class="deck">${board.map((_,i)=>`<button class="tarot-card" data-i="${i}" aria-label="Выбрать карту ${i+1}"><span class="card-back-mark">✦</span></button>`).join('')}</div>
    <div class="center deck-hint">${picked.length}/${selectedSpread.count} выбрано</div>
    <button class="primary" id="random">↻ ВЫБРАТЬ СЛУЧАЙНО</button>
    <button class="secondary" id="reset">ПЕРЕТАСОВАТЬ КОЛОДУ</button>`;

  document.querySelectorAll('.tarot-card').forEach(c=>c.onclick=()=>{
    const i=Number(c.dataset.i);
    if(picked.includes(i)) picked=picked.filter(x=>x!==i);
    else if(picked.length<selectedSpread.count) picked.push(i);
    c.classList.toggle('selected',picked.includes(i));
    document.querySelector('.deck-hint').textContent=`${picked.length}/${selectedSpread.count} выбрано`;
    if(picked.length===selectedSpread.count) setTimeout(()=>showDraw(picked),420);
  });

  document.getElementById('random').onclick=()=>{
    picked=shuffle([...Array(board.length).keys()]).slice(0,selectedSpread.count);
    document.querySelectorAll('.tarot-card').forEach((c,i)=>c.classList.toggle('selected',picked.includes(i)));
    setTimeout(()=>showDraw(picked),320);
  };
  document.getElementById('reset').onclick=()=>deck(type);
}

function showDraw(indices){
  drawn=indices.map(i=>board[i]);
  result();
}

function cardImage(card, extra=''){
  return `<img class="tarot-art ${extra}" src="${card.image}" alt="${card.name}" loading="eager" onerror="this.onerror=null;this.src='https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_19_Sun.jpg'">`;
}

function yesNo(card, reversed){
  const yes=['Солнце','Мир','Звезда','Колесница','Маг','Сила','Императрица','Влюблённые','Туз Кубков','Туз Пентакли','Туз Жезлов'];
  const no=['Башня','Дьявол','Смерть','Пятёрка Кубков','Десятка Мечей','Пятёрка Пентаклей'];
  if(reversed) return no.includes(card.name)?'СКОРЕЕ ДА':'СКОРЕЕ НЕТ';
  if(yes.includes(card.name)) return 'ДА';
  if(no.includes(card.name)) return 'НЕТ';
  return 'СКОРЕЕ ДА / НЕТ';
}

function result(){
  current='result';
  const main=drawn[0];
  const meaning=main.reversed?main.card.reversed:main.card.meaning;
  const answer=selectedSpread.title==='ДА / НЕТ'?yesNo(main.card,main.reversed):null;
  saveHistory({spread:selectedSpread.title,cards:drawn.map(x=>({name:x.card.name,reversed:x.reversed})),date:new Date().toLocaleString('ru-RU')});

  screen.innerHTML=`
    <div class="section-title">ВАШ РАСКЛАД</div>
    <div class="result-spread">${drawn.map((x,i)=>`
      <div class="result-item">
        <div class="position-label">${selectedSpread.positions[i]}</div>
        <div class="result-card-wrap ${x.reversed?'is-reversed':''}">
          <div class="result-card-inner">
            <div class="result-card-face result-card-back"><span>✦</span></div>
            <div class="result-card-face result-card-front">${cardImage(x.card)}</div>
          </div>
        </div>
        <div class="result-name">${x.card.name}</div>
        <div class="mini-badge">${x.reversed?'ПЕРЕВЁРНУТАЯ':'ПРЯМАЯ'}</div>
      </div>`).join('')}</div>
    <div class="center"><span class="badge">${main.reversed?'ПЕРЕВЁРНУТОЕ ПОЛОЖЕНИЕ':'ПРЯМОЕ ПОЛОЖЕНИЕ'}</span></div>
    ${answer?`<div class="result-text answer"><b>${answer}</b><br><span class="muted">Ответ по основной карте</span></div>`:''}
    <div class="result-text"><b>${selectedSpread.positions[0]}</b><br>${meaning}</div>
    ${drawn.length>1?`<div class="result-text"><b>Карты расклада</b>${drawn.map((x,i)=>`<div class="draw-row"><span>${selectedSpread.positions[i]}</span><strong>${x.card.name}${x.reversed?' · ↕':''}</strong></div>`).join('')}</div>`:''}
    <button class="primary" id="share">ПОДЕЛИТЬСЯ</button>
    <button class="secondary" id="again">НОВЫЙ РАСКЛАД</button>`;

  requestAnimationFrame(()=>document.querySelectorAll('.result-card-wrap').forEach((el,i)=>setTimeout(()=>el.classList.add('revealed'),220+i*180)));
  document.getElementById('again').onclick=home;
  document.getElementById('share').onclick=()=>tg?.showAlert?.(`Ваш расклад: ${main.card.name}`);
}

function history(){
  current='history';
  const h=JSON.parse(localStorage.getItem('taro_history')||'[]');
  screen.innerHTML=`<div class="section-title">ИСТОРИЯ РАСКЛАДОВ</div>`+
    (h.length?h.map(x=>`<div class="history-row"><div class="thumb">✦</div><div><b>${x.spread}</b><div class="muted">${x.cards?.map(c=>c.name).join(' · ')||x.card} · ${x.date}</div></div></div>`).join(''):'<div class="center muted">Здесь появятся ваши расклады.</div>');
}

function profile(){
  current='profile';
  const user=tg?.initDataUnsafe?.user;
  const name=user?.first_name || 'Тайный Искатель';
  const h=JSON.parse(localStorage.getItem('taro_history')||'[]');
  screen.innerHTML=`<div class="profile"><div class="avatar">◈</div><h2>${name}</h2><div class="muted">@${user?.username||'taro_user'}</div></div>
    <div class="stats"><div><b>${h.length}</b><span>РАСКЛАДОВ</span></div><div><b>0</b><span>ДНЕЙ С НАМИ</span></div><div><b>0</b><span>КОЛЛЕКЦИЙ</span></div></div>
    <div class="grid"><button class="card-btn">☆ Избранные карты</button><button class="card-btn">⚙ Настройки</button><button class="card-btn">? Поддержка</button><button class="card-btn">ⓘ О приложении</button></div>`;
}

function setTab(tab){
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
  if(tab==='readings')home(); if(tab==='history')history(); if(tab==='profile')profile();
}

document.querySelectorAll('.nav-item').forEach(x=>x.onclick=()=>setTab(x.dataset.tab));
backBtn.onclick=()=> current==='home'?tg?.close?.():home();
document.getElementById('themeBtn').onclick=()=>document.body.classList.toggle('light');
home();
