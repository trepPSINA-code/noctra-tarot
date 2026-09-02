const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const screen = document.getElementById('screen');
const backBtn = document.getElementById('backBtn');

const spreads = {
  one: {title:'1 КАРТА', sub:'Совет дня', count:1},
  three: {title:'3 КАРТЫ', sub:'Прошлое · Настоящее · Будущее', count:3},
  love: {title:'ОТНОШЕНИЯ', sub:'Анализ отношений', count:3},
  situation: {title:'СИТУАЦИЯ', sub:'Анализ ситуации', count:3},
  yesno: {title:'ДА / НЕТ', sub:'Получить ответ', count:1},
};
const cards = ['СОЛНЦЕ','ЛУНА','ЗВЕЗДА','МАГ','ИМПЕРАТРИЦА','ИМПЕРАТОР','ВЛЮБЛЁННЫЕ','КОЛЕСНИЦА','СИЛА'];

let current = 'home';
let selectedSpread = null;
let selected = [];

function saveHistory(item){
  const h = JSON.parse(localStorage.getItem('taro_history')||'[]');
  h.unshift(item); localStorage.setItem('taro_history', JSON.stringify(h.slice(0,30)));
}

function home(){
  current='home';
  screen.innerHTML = `
    <section class="hero">
      <div class="hero"><h1>TARO</h1><p>персональный расклад</p></div>
      <div class="eye"></div>
      <div class="muted">Что вас интересует?</div>
    </section>
    <div class="grid">
      ${Object.entries(spreads).map(([k,v])=>`
        <button class="card-btn" data-spread="${k}">
          <div class="card-title">${v.title}</div><div class="card-sub">${v.sub}</div>
        </button>`).join('')}
    </div>
  `;
  document.querySelectorAll('[data-spread]').forEach(b=>b.onclick=()=>deck(b.dataset.spread));
}

function deck(type){
  current='deck'; selectedSpread=spreads[type]; selected=[];
  screen.innerHTML=`
    <div class="section-title">${selectedSpread.title}</div>
    <div class="center muted">Сконцентрируйтесь на вопросе<br>и выберите ${selectedSpread.count} ${selectedSpread.count===1?'карту':'карты'}</div>
    <div class="deck">${Array.from({length:7},(_,i)=>`<button class="tarot-card" data-i="${i}" aria-label="Карта"></button>`).join('')}</div>
    <button class="primary" id="random">↻ ВЫБРАТЬ СЛУЧАЙНО</button>
    <button class="secondary" id="reset">ПЕРЕВЕРНУТЬ ВСЕ</button>
  `;
  document.querySelectorAll('.tarot-card').forEach(c=>c.onclick=()=>{
    const i=Number(c.dataset.i);
    if(selected.includes(i)) selected=selected.filter(x=>x!==i);
    else if(selected.length<selectedSpread.count) selected.push(i);
    c.classList.toggle('selected', selected.includes(i));
    if(selected.length===selectedSpread.count) setTimeout(result,250);
  });
  document.getElementById('random').onclick=()=>{ selected=[]; while(selected.length<selectedSpread.count){let i=Math.floor(Math.random()*7); if(!selected.includes(i))selected.push(i)}; result(); };
  document.getElementById('reset').onclick=()=>document.querySelectorAll('.tarot-card').forEach(c=>c.classList.remove('selected'));
}

function result(){
  current='result';
  const chosen=selected.map(i=>cards[i%cards.length]);
  const main=chosen[0]||'СОЛНЦЕ';
  const meaning = {
    'СОЛНЦЕ':'Радость, ясность, успех и жизненная энергия. Период благоприятен для открытых решений и движения вперёд.',
    'ЛУНА':'Интуиция сильна, но не всё является тем, чем кажется. Не торопитесь с выводами и проверьте факты.',
    'ЗВЕЗДА':'Надежда, восстановление и вдохновение. Ваше направление постепенно становится яснее.',
    'МАГ':'Время действовать. У вас уже есть ресурсы, чтобы изменить ситуацию в свою пользу.',
    'ИМПЕРАТРИЦА':'Рост, забота и созидание. Хороший момент вкладываться в отношения и проекты.',
    'ИМПЕРАТОР':'Структура, ответственность и контроль. Чёткий план поможет получить устойчивый результат.',
    'ВЛЮБЛЁННЫЕ':'Выбор и честность перед собой. Важное решение лучше принимать не из страха, а из ценностей.',
    'КОЛЕСНИЦА':'Движение и победа через дисциплину. Не распыляйтесь — выберите одно направление.',
    'СИЛА':'Мягкая уверенность сильнее давления. Терпение и внутреннее спокойствие помогут пройти препятствие.'
  }[main];
  saveHistory({spread:selectedSpread.title, card:main, date:new Date().toLocaleString('ru-RU')});
  screen.innerHTML=`
    <div class="section-title">ВАШ РАСКЛАД</div>
    <div class="result-card">${main}</div>
    <div class="center"><span class="badge">ПРЯМОЕ ПОЛОЖЕНИЕ</span></div>
    <div class="result-text"><b>Основное значение</b><br>${meaning}</div>
    ${chosen.length>1?`<div class="result-text"><b>Карты расклада</b><br>${chosen.join(' · ')}</div>`:''}
    <button class="primary" id="share">ПОДЕЛИТЬСЯ</button>
    <button class="secondary" id="again">НОВЫЙ РАСКЛАД</button>
  `;
  document.getElementById('again').onclick=home;
  document.getElementById('share').onclick=()=>tg?.showAlert?.(`Ваш расклад: ${main}`);
}

function history(){
  current='history';
  const h=JSON.parse(localStorage.getItem('taro_history')||'[]');
  screen.innerHTML=`<div class="section-title">ИСТОРИЯ РАСКЛАДОВ</div>`+
    (h.length?h.map(x=>`<div class="history-row"><div class="thumb">${x.card}</div><div><b>${x.spread}</b><div class="muted">${x.card} · ${x.date}</div></div></div>`).join(''):
    '<div class="center muted">Здесь появятся ваши расклады.</div>');
}

function profile(){
  current='profile';
  const user=tg?.initDataUnsafe?.user;
  const name=user?.first_name || 'Тайный Искатель';
  screen.innerHTML=`
    <div class="profile"><div class="avatar">◈</div><h2>${name}</h2><div class="muted">@taro_user</div></div>
    <div class="stats"><div><b>0</b><span>РАСКЛАДОВ</span></div><div><b>0</b><span>ДНЕЙ С НАМИ</span></div><div><b>0</b><span>КОЛЛЕКЦИЙ</span></div></div>
    <div class="grid">
      <button class="card-btn">☆ Избранные карты</button>
      <button class="card-btn">⚙ Настройки</button>
      <button class="card-btn">? Поддержка</button>
      <button class="card-btn">ⓘ О приложении</button>
    </div>`;
}

function setTab(tab){
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
  if(tab==='readings')home(); if(tab==='history')history(); if(tab==='profile')profile();
}
document.querySelectorAll('.nav-item').forEach(x=>x.onclick=()=>setTab(x.dataset.tab));
backBtn.onclick=()=> current==='home'?tg?.close?.():home();
document.getElementById('themeBtn').onclick=()=>document.body.classList.toggle('light');

home();
