const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const screen = document.getElementById('screen');
const backBtn = document.getElementById('backBtn');
const cards = window.TARO_CARDS || [];

// После размещения backend замени URL ниже на адрес своего сервера.
const API_BASE = 'https://noctra-tarot.onrender.com';

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
let chatMessages=[];

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

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function home(){
  current='home';
  screen.innerHTML=`
    <section class="hero">
      <div class="hero"><h1>NOCTRA</h1><p>персональный расклад</p></div>
      <div class="eye"></div>
      <div class="muted">Что вас интересует?</div>
    </section>
    <div class="grid">${Object.entries(spreads).map(([k,v])=>`
      <button class="card-btn" data-spread="${k}">
        <div class="card-title">${v.title}</div><div class="card-sub">${v.sub}</div>
      </button>`).join('')}</div>
    <button class="ai-entry" id="openChat"><span>☾</span><div><b>Спросить NOCTRA</b><small>Задайте вопрос и получите развёрнутый разбор</small></div><strong>›</strong></button>`;
  document.querySelectorAll('[data-spread]').forEach(b=>b.onclick=()=>deck(b.dataset.spread));
  document.getElementById('openChat').onclick=()=>chat();
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
  return `<img class="tarot-art ${extra}" src="${card.image}" alt="${escapeHtml(card.name)}" loading="eager" onerror="this.onerror=null;this.src='https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_19_Sun.jpg'">`;
}

function yesNo(card, reversed){
  const yes=['Солнце','Мир','Звезда','Колесница','Маг','Сила','Императрица','Влюблённые','Туз Кубков','Туз Пентаклей','Туз Жезлов'];
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
        <div class="result-name">${escapeHtml(x.card.name)}</div>
        <div class="mini-badge">${x.reversed?'ПЕРЕВЁРНУТАЯ':'ПРЯМАЯ'}</div>
      </div>`).join('')}</div>
    <div class="center"><span class="badge">${main.reversed?'ПЕРЕВЁРНУТОЕ ПОЛОЖЕНИЕ':'ПРЯМОЕ ПОЛОЖЕНИЕ'}</span></div>
    ${answer?`<div class="result-text answer"><b>${answer}</b><br><span class="muted">Ответ по основной карте</span></div>`:''}
    <div class="result-text"><b>${selectedSpread.positions[0]}</b><br>${meaning}</div>
    ${drawn.length>1?`<div class="result-text"><b>Карты расклада</b>${drawn.map((x,i)=>`<div class="draw-row"><span>${selectedSpread.positions[i]}</span><strong>${escapeHtml(x.card.name)}${x.reversed?' · ↕':''}</strong></div>`).join('')}</div>`:''}
    <button class="ai-entry" id="askAboutSpread"><span>☾</span><div><b>Разобрать этот расклад с NOCTRA</b><small>Получить персональный разбор и задать уточняющий вопрос</small></div><strong>›</strong></button>
    <button class="primary" id="share">ПОДЕЛИТЬСЯ</button>
    <button class="secondary" id="again">НОВЫЙ РАСКЛАД</button>`;

  requestAnimationFrame(()=>document.querySelectorAll('.result-card-wrap').forEach((el,i)=>setTimeout(()=>el.classList.add('revealed'),220+i*180)));
  document.getElementById('again').onclick=home;
  document.getElementById('share').onclick=()=>tg?.showAlert?.(`Ваш расклад: ${main.card.name}`);
  document.getElementById('askAboutSpread').onclick=()=>chat(true);
}

function buildSpreadContext(){
  if(!drawn.length) return '';
  return `Текущий расклад: ${selectedSpread?.title || 'расклад'}\n` + drawn.map((x,i)=>{
    const meaning=x.reversed?x.card.reversed:x.card.meaning;
    return `${selectedSpread?.positions?.[i] || `Карта ${i+1}`}: ${x.card.name} — ${x.reversed?'перевёрнутая':'прямая'}. Значение: ${meaning}`;
  }).join('\n');
}

function chat(withSpread=false){
  current='chat';
  const context=withSpread?buildSpreadContext():'';
  if(withSpread && context && !chatMessages.length){
    chatMessages=[{role:'assistant',content:'Я вижу твой расклад. Задай вопрос — я разберу карты именно в контексте твоей ситуации.'}];
  }
  renderChat(context);
}

function renderChat(context=''){
  screen.innerHTML=`
    <div class="chat-head"><div><div class="section-title">ЧАТ С NOCTRA</div><div class="muted">Персональный разбор карт и вопросов</div></div><span class="ai-dot">✦</span></div>
    ${context?`<div class="chat-context"><b>Активный расклад</b><div>${escapeHtml(selectedSpread?.title||'')}</div><small>${drawn.map(x=>escapeHtml(x.card.name)).join(' · ')}</small></div>`:''}
    <div class="chat-list" id="chatList">${chatMessages.length?chatMessages.map(m=>`<div class="bubble ${m.role==='user'?'user':'assistant'}">${escapeHtml(m.content).replace(/\n/g,'<br>')}</div>`).join(''):`<div class="chat-empty"><div class="chat-moon">☾</div><b>Спроси у NOCTRA</b><p>Например: «Что он сейчас чувствует?» или «Что мне важно понять в этой ситуации?»</p></div>`}</div>
    <div class="chat-compose"><textarea id="chatInput" rows="1" placeholder="Напишите свой вопрос..."></textarea><button id="sendChat" aria-label="Отправить">➤</button></div>`;
  const list=document.getElementById('chatList');
  list.scrollTop=list.scrollHeight;
  const input=document.getElementById('chatInput');
  const send=document.getElementById('sendChat');
  send.onclick=()=>sendChatMessage(input.value,context);
  input.addEventListener('keydown',e=>{ if(e.key==='Enter' && !e.shiftKey){e.preventDefault();send.click();} });
}

async function sendChatMessage(text, context=''){
  const clean=text.trim();
  if(!clean) return;
  chatMessages.push({role:'user',content:clean});
  renderChat(context);
  const send=document.getElementById('sendChat');
  const input=document.getElementById('chatInput');
  send.disabled=true; input.disabled=true;
  const list=document.getElementById('chatList');
  const loading=document.createElement('div');
  loading.className='bubble assistant typing';
  loading.textContent='NOCTRA думает…';
  list.appendChild(loading); list.scrollTop=list.scrollHeight;
  try{
    if(API_BASE.includes('YOUR-BACKEND-URL')) throw new Error('BACKEND_NOT_CONFIGURED');
    const response=await fetch(`${API_BASE.replace(/\/$/,'')}/api/chat`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages:chatMessages.slice(-12),context})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||'Не удалось получить ответ');
    chatMessages.push({role:'assistant',content:data.reply||'Не удалось получить ответ.'});
  }catch(err){
    const msg=err.message==='BACKEND_NOT_CONFIGURED'
      ? 'Чат уже готов, но сервер ИИ ещё не подключён. Следующим шагом мы разместим его и добавим безопасный ключ API.'
      : 'Не удалось связаться с NOCTRA. Проверь подключение к интернету и сервер.';
    chatMessages.push({role:'assistant',content:msg});
  }
  renderChat(context);
}

function history(){
  current='history';
  const h=JSON.parse(localStorage.getItem('taro_history')||'[]');
  screen.innerHTML=`<div class="section-title">ИСТОРИЯ РАСКЛАДОВ</div>`+
    (h.length?h.map(x=>`<div class="history-row"><div class="thumb">✦</div><div><b>${escapeHtml(x.spread)}</b><div class="muted">${x.cards?.map(c=>escapeHtml(c.name)).join(' · ')||escapeHtml(x.card)} · ${escapeHtml(x.date)}</div></div></div>`).join(''):'<div class="center muted">Здесь появятся ваши расклады.</div>');
}

function profile(){
  current='profile';
  const user=tg?.initDataUnsafe?.user;
  const name=user?.first_name || 'Тайный Искатель';
  const h=JSON.parse(localStorage.getItem('taro_history')||'[]');
  screen.innerHTML=`<div class="profile"><div class="avatar">◈</div><h2>${escapeHtml(name)}</h2><div class="muted">@${escapeHtml(user?.username||'taro_user')}</div></div>
    <div class="stats"><div><b>${h.length}</b><span>РАСКЛАДОВ</span></div><div><b>0</b><span>ДНЕЙ С НАМИ</span></div><div><b>0</b><span>КОЛЛЕКЦИЙ</span></div></div>
    <div class="grid"><button class="card-btn">☆ Избранные карты</button><button class="card-btn">⚙ Настройки</button><button class="card-btn">? Поддержка</button><button class="card-btn">ⓘ О приложении</button></div>`;
}

function setTab(tab){
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
  if(tab==='readings')home();
  if(tab==='chat')chat();
  if(tab==='history')history();
  if(tab==='profile')profile();
}

document.querySelectorAll('.nav-item').forEach(x=>x.onclick=()=>setTab(x.dataset.tab));
backBtn.onclick=()=> current==='home'?tg?.close?.():home();
document.getElementById('themeBtn').onclick=()=>document.body.classList.toggle('light');
home();
