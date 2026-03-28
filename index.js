// iCost · 我的账本  v7.0  — tags · month filter · budget · resilient
(function () {
  'use strict';

  // ── 防御性包装：任何内部错误都不影响酒馆正常运行 ────────────
  function safe(fn) {
    return function () {
      try { return fn.apply(this, arguments); }
      catch (e) { console.warn('[iCost] non-fatal:', e); }
    };
  }

  const REC_KEY    = 'icost_records_v1';
  const POS_KEY    = 'icost_pos_v1';
  const COL_KEY    = 'icost_collapsed_v1';
  const TAG_KEY    = 'icost_tags_v1';
  const BUDGET_KEY = 'icost_budget_v1';

  const DEFAULT_TAGS = ['Food'];

  let curType    = 'expense';
  let winVisible = false;
  let editingId  = null;
  let shareStep  = 0;
  let curTag     = '';
  let curMonth   = monthKey(new Date());

  /* ── month helpers ───────────────────────────────── */
  function monthKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  function monthLabel(mk) { return mk.replace('-','/'); }
  function prevMonth(mk) {
    const [y,m]=mk.split('-').map(Number);
    return monthKey(new Date(y,m-2,1));
  }
  function nextMonth(mk) {
    const [y,m]=mk.split('-').map(Number);
    return monthKey(new Date(y,m,1));
  }

  /* ── storage ─────────────────────────────────────── */
  function load()       { try{return JSON.parse(localStorage.getItem(REC_KEY)||'[]');}catch(e){return[];} }
  function save(r)      { try{localStorage.setItem(REC_KEY,JSON.stringify(r));}catch(e){} }
  function uid()        { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
  function fmt(iso)     { const d=new Date(iso); return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`; }
  function getCol()     { try{return JSON.parse(localStorage.getItem(COL_KEY)||'{}');}catch(e){return{};} }
  function loadTags()   { try{return JSON.parse(localStorage.getItem(TAG_KEY)||'null')||[...DEFAULT_TAGS];}catch(e){return[...DEFAULT_TAGS];} }
  function saveTags(t)  { try{localStorage.setItem(TAG_KEY,JSON.stringify(t));}catch(e){} }
  function loadBudget() { try{return parseFloat(localStorage.getItem(BUDGET_KEY)||'0')||0;}catch(e){return 0;} }
  function saveBudget(v){ try{localStorage.setItem(BUDGET_KEY,String(v));}catch(e){} }

  /* ── build window ────────────────────────────────── */
  function buildWin(){
    const w=document.createElement('div');
    w.id='ic-win';
    w.innerHTML=`
      <div id="ic-bar">
        <div class="ic-titles">
          <span class="ic-cn">iCost</span>
          <span class="ic-en" id="ic-en-sub">我的账本</span>
        </div>
        <div class="ic-bar-right">
          <button class="ic-collapse-btn" id="ic-hint">−</button>
          <button id="ic-x">✕</button>
        </div>
      </div>
      <div id="ic-body">
        <div class="ic-summary">
          <div class="ic-sum-bal">
            <span class="ic-sum-bal-label">结余 Balance</span>
            <span class="ic-bal-big ic-green" id="ic-bal">¥0.00</span>
          </div>
          <div class="ic-sum-sub">
            <div class="ic-sum-sub-item">
              <span class="ic-sum-sub-label">收入 Income</span>
              <span class="ic-sum-sub-val ic-green" id="ic-inc">¥0.00</span>
            </div>
            <div class="ic-sum-sub-divider"></div>
            <div class="ic-sum-sub-item">
              <span class="ic-sum-sub-label">支出 Expense</span>
              <span class="ic-sum-sub-val ic-red" id="ic-exp">¥0.00</span>
            </div>
          </div>
          <div class="ic-budget-bar-wrap" id="ic-budget-wrap">
            <div class="ic-budget-left">
              <div class="ic-budget-bar-track">
                <div class="ic-budget-bar-fill" id="ic-budget-fill"></div>
              </div>
              <span class="ic-budget-label" id="ic-budget-label"></span>
            </div>
            <button class="ic-budget-set-btn" id="ic-budget-set-btn">调整</button>
          </div>
          <div class="ic-budget-unset" id="ic-budget-unset">
            <button class="ic-budget-entry-btn" id="ic-budget-set-btn2">＋ 设置月度预算</button>
          </div>
        </div>

        <div class="ic-form ic-form-expense" id="ic-form">
          <div class="ic-form-header">
            <span class="ic-form-header-label">记一笔 · Record</span>
            <button class="ic-form-toggle" id="ic-form-toggle">−</button>
          </div>
          <div class="ic-form-inner" id="ic-form-inner">
            <div class="ic-trow">
              <button class="ic-tb ic-tb-exp active" id="ic-tb-exp">支出 Expense</button>
              <button class="ic-tb ic-tb-inc"        id="ic-tb-inc">收入 Income</button>
            </div>
            <div class="ic-field">
              <label class="ic-lbl">金额 Amount</label>
              <div class="ic-arow">
                <span class="ic-yen">¥</span>
                <input id="ic-amt" class="ic-inp" type="number" min="0" step="0.01" placeholder="0.00">
              </div>
            </div>
            <div class="ic-field">
              <label class="ic-lbl">备注 Note</label>
              <input id="ic-note" class="ic-ninp" type="text" placeholder="买了什么 / 赚了什么…" maxlength="60">
            </div>
            <div class="ic-tags-wrap" id="ic-tags-wrap"></div>
            <button class="ic-addbtn" id="ic-addbtn">记录 · Add</button>
          </div>
        </div>

        <div class="ic-rechd" id="ic-rechd">
          <div class="ic-month-nav">
            <button class="ic-month-btn" id="ic-month-prev">‹</button>
            <span class="ic-month-label" id="ic-month-label">${monthLabel(curMonth)}</span>
            <button class="ic-month-btn" id="ic-month-next">›</button>
          </div>
          <div class="ic-rechd-right">
            <span class="ic-cnt" id="ic-cnt">0 条</span>
            <span class="ic-rec-arrow" id="ic-rec-arrow">▾</span>
          </div>
        </div>
        <div id="ic-list-wrap"><div id="ic-list"></div></div>

        <div class="ic-foot">
          <input id="ic-share-note" class="ic-share-note" type="text" placeholder="加一句话（可选）…" maxlength="100" style="display:none">
          <div class="ic-share-btns">
            <button class="ic-share-cancel" id="ic-share-cancel" style="display:none">取消</button>
            <button class="ic-share" id="ic-share">📤 发给他看</button>
          </div>
        </div>
      </div>`;
    return w;
  }

  /* ── tags ────────────────────────────────────────── */
  function renderTags(){
    const wrap=document.getElementById('ic-tags-wrap'); if(!wrap) return;
    const tags=loadTags();
    wrap.innerHTML='';

    tags.forEach(tag=>{
      const chip=document.createElement('button');
      chip.className='ic-chip'+(curTag===tag?' ic-chip-active ic-chip-active-'+curType:'');
      chip.textContent=tag;

      chip.addEventListener('click',e=>{
        e.stopPropagation();
        if(curTag===tag){ curTag=''; }
        else {
          curTag=tag;
          const ne=document.getElementById('ic-note');
          if(ne&&!ne.value) ne.value=tag;
        }
        renderTags();
      });

      let lpt;
      const startLong=()=>{ lpt=setTimeout(()=>deleteTag(tag),650); };
      const clearLong=()=>clearTimeout(lpt);
      chip.addEventListener('touchstart',startLong,{passive:true});
      chip.addEventListener('touchend',clearLong,{passive:true});
      chip.addEventListener('touchmove',clearLong,{passive:true});
      chip.addEventListener('mousedown',startLong);
      chip.addEventListener('mouseup',clearLong);
      chip.addEventListener('mouseleave',clearLong);

      wrap.appendChild(chip);
    });

    const addBtn=document.createElement('button');
    addBtn.className='ic-chip ic-chip-add';
    addBtn.textContent='＋';
    addBtn.addEventListener('click',e=>{ e.stopPropagation(); showAddTag(wrap,addBtn); });
    wrap.appendChild(addBtn);
  }

  function showAddTag(wrap,addBtn){
    if(document.getElementById('ic-tag-inp')) return;
    const inp=document.createElement('input');
    inp.id='ic-tag-inp'; inp.className='ic-tag-inp';
    inp.placeholder='标签名…'; inp.maxLength=5;
    wrap.insertBefore(inp,addBtn); inp.focus();
    function commit(){
      const val=inp.value.trim();
      if(val){ const t=loadTags(); if(!t.includes(val)){t.push(val);saveTags(t);} }
      renderTags();
    }
    inp.addEventListener('blur',commit);
    inp.addEventListener('keydown',e=>{ if(e.key==='Enter') inp.blur(); });
  }

  function deleteTag(tag){
    if(!confirm(`长按确认：删除标签「${tag}」？`)) return;
    saveTags(loadTags().filter(t=>t!==tag));
    if(curTag===tag) curTag='';
    renderTags();
  }

  /* ── budget ──────────────────────────────────────── */
  function renderBudget(exp){
    const budget=loadBudget();
    const bwrap =document.getElementById('ic-budget-wrap');
    const bunset=document.getElementById('ic-budget-unset');
    const fill  =document.getElementById('ic-budget-fill');
    const label =document.getElementById('ic-budget-label');
    if(!bwrap||!bunset) return;

    if(!budget){
      bwrap.style.display='none';
      bunset.style.display='flex';
      return;
    }
    bwrap.style.display='flex';
    bunset.style.display='none';
    const pct=Math.min(exp/budget*100,100);
    if(fill){
      fill.style.width=pct+'%';
      fill.className='ic-budget-bar-fill '+(pct>=90?'ic-bud-red':pct>=70?'ic-bud-yellow':'ic-bud-green');
    }
    if(label) label.textContent=`支出 ¥${exp.toFixed(0)} / 预算 ¥${budget.toFixed(0)}`;
  }

  function openBudgetInput(){
    const cur=loadBudget();
    const val=prompt(`设置本月支出预算\n当前：${cur?'¥'+cur:'未设置'}\n清空或填0可取消预算`,cur||'');
    if(val===null) return;
    const num=parseFloat(val);
    saveBudget(!isNaN(num)&&num>0?num:0);
    render();
  }

  /* ── set type ────────────────────────────────────── */
  function setType(t){
    curType=t;
    const form=document.getElementById('ic-form'); if(!form) return;
    form.className='ic-form ic-form-'+t;
    document.getElementById('ic-tb-exp').className='ic-tb ic-tb-exp'+(t==='expense'?' active':'');
    document.getElementById('ic-tb-inc').className='ic-tb ic-tb-inc'+(t==='income'?' active':'');
    const btn=document.getElementById('ic-addbtn');
    if(editingId&&btn) btn.textContent='保存修改 · Save';
    renderTags();
  }

  /* ── render ──────────────────────────────────────── */
  function render(){
    const allRecs=load();
    const list=document.getElementById('ic-list'); if(!list) return;

    const recs=allRecs.filter(r=>r.date&&r.date.startsWith(curMonth));
    const inc=recs.filter(r=>r.type==='income').reduce((s,r)=>s+r.amount,0);
    const exp=recs.filter(r=>r.type==='expense').reduce((s,r)=>s+r.amount,0);
    const bal=inc-exp;

    document.getElementById('ic-inc').textContent=`¥${inc.toFixed(2)}`;
    document.getElementById('ic-exp').textContent=`¥${exp.toFixed(2)}`;
    const bel=document.getElementById('ic-bal');
    bel.textContent=(bal<0?'-¥':'¥')+Math.abs(bal).toFixed(2);
    bel.className='ic-bal-big '+(bal>=0?'ic-brown-bal':'ic-red');

    document.getElementById('ic-cnt').textContent=`${recs.length} 条`;
    const ml=document.getElementById('ic-month-label');
    if(ml) ml.textContent=monthLabel(curMonth);

    const nb=document.getElementById('ic-month-next');
    if(nb) nb.disabled=curMonth>=monthKey(new Date());

    renderBudget(exp);

    if(!recs.length){ list.innerHTML=`<p class="ic-empty">本月暂无记录</p>`; return; }

    list.innerHTML=[...recs].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`
      <div class="ic-row ic-row-${r.type}" data-id="${r.id}">
        <div class="ic-row-actions">
          <button class="ic-edit-action" data-id="${r.id}">编辑</button>
        </div>
        <div class="ic-row-content">
          <div class="ic-rl">
            <div class="ic-type-dot ic-dot-${r.type}">${r.type==='income'?'收':'支'}</div>
            <div class="ic-row-text">
              ${r.tag?`<span class="ic-row-tag ic-rtag-${r.type}">${r.tag}</span>`:''}
              <span class="ic-rmk">${r.note||'—'}</span>
            </div>
          </div>
          <div class="ic-rr">
            <span class="ic-ra ic-${r.type}">${r.type==='income'?'+':'-'}¥${Number(r.amount).toFixed(2)}</span>
            <span class="ic-rd">${fmt(r.date)}</span>
            <button class="ic-del" data-id="${r.id}">×</button>
          </div>
        </div>
      </div>`).join('');

    list.querySelectorAll('.ic-row').forEach(row=>attachSwipe(row));
    list.querySelectorAll('.ic-del').forEach(b=>{
      b.addEventListener('click',e=>{
        e.stopPropagation();
        if(editingId===b.dataset.id) cancelEdit();
        save(load().filter(r=>r.id!==b.dataset.id));
        render();
      });
    });
    list.querySelectorAll('.ic-edit-action').forEach(b=>{
      b.addEventListener('click',e=>{ e.stopPropagation(); startEdit(b.dataset.id); });
    });
  }

  /* ── swipe ───────────────────────────────────────── */
  function attachSwipe(row){
    const content=row.querySelector('.ic-row-content'); if(!content) return;
    let startX=0,startY=0,active=false,revealed=false;
    content.addEventListener('touchstart',e=>{
      const t=e.touches[0]; startX=t.clientX; startY=t.clientY; active=true;
    },{passive:true});
    content.addEventListener('touchmove',e=>{
      if(!active) return;
      const t=e.touches[0],dx=t.clientX-startX,dy=Math.abs(t.clientY-startY);
      if(dy>12){active=false;return;}
      if(Math.abs(dx)<4) return;
      const shift=revealed?Math.min(0,-68+dx):Math.max(-68,dx<0?dx:0);
      content.style.transform=`translateX(${shift}px)`;
      if(Math.abs(dx)>dy) e.preventDefault();
    },{passive:false});
    content.addEventListener('touchend',()=>{
      if(!active) return; active=false;
      const cur=parseFloat(content.style.transform.replace('translateX(','').replace(')',''))||0;
      if(cur<-34){
        content.style.transform='translateX(-68px)'; revealed=true;
        document.querySelectorAll('#ic-list .ic-row-content').forEach(c=>{
          if(c!==content) c.style.transform='translateX(0)';
        });
      } else { content.style.transform='translateX(0)'; revealed=false; }
    },{passive:true});
  }

  /* ── edit ────────────────────────────────────────── */
  function startEdit(id){
    const rec=load().find(r=>r.id===id); if(!rec) return;
    editingId=id; setType(rec.type);
    document.getElementById('ic-amt').value=rec.amount;
    document.getElementById('ic-note').value=rec.note||'';
    curTag=rec.tag||''; renderTags();
    const btn=document.getElementById('ic-addbtn');
    btn.textContent='保存修改 · Save'; btn.classList.add('ic-addbtn-edit');
    document.getElementById('ic-amt').focus();
  }
  function cancelEdit(){
    editingId=null;
    document.getElementById('ic-amt').value='';
    document.getElementById('ic-note').value='';
    curTag='';
    const btn=document.getElementById('ic-addbtn');
    btn.textContent='记录 · Add'; btn.classList.remove('ic-addbtn-edit');
    renderTags();
  }

  /* ── add / save ──────────────────────────────────── */
  function addRecord(){
    const ae=document.getElementById('ic-amt');
    const ne=document.getElementById('ic-note');
    const amt=parseFloat(ae.value);
    if(!amt||amt<=0){ ae.classList.add('ic-shake'); setTimeout(()=>ae.classList.remove('ic-shake'),500); return; }
    let recs=load();
    if(editingId){
      recs=recs.map(r=>r.id===editingId?{...r,type:curType,amount:amt,note:ne.value.trim(),tag:curTag}:r);
      editingId=null;
    } else {
      recs.push({id:uid(),type:curType,amount:amt,note:ne.value.trim(),tag:curTag,date:new Date().toISOString()});
    }
    save(recs); ae.value=''; ne.value=''; curTag='';
    const btn=document.getElementById('ic-addbtn');
    btn.textContent='已保存 ✓'; btn.classList.remove('ic-addbtn-edit'); btn.classList.add('ic-addbtn-ok');
    setTimeout(()=>{ btn.textContent='记录 · Add'; btn.classList.remove('ic-addbtn-ok'); },1500);
    renderTags(); render();
  }

  /* ── capsule ─────────────────────────────────────── */
  function applyCapsule(){
    const c=getCol(),body=document.getElementById('ic-body'),
          hint=document.getElementById('ic-hint'),sub=document.getElementById('ic-en-sub'),
          win=document.getElementById('ic-win'); if(!body) return;
    if(c.window){
      body.style.display='none'; win.classList.add('ic-capsule');
      if(hint) hint.textContent='−'; if(sub) sub.style.display='none';
    } else {
      body.style.display=''; win.classList.remove('ic-capsule');
      if(hint) hint.textContent='−'; if(sub) sub.style.display='';
    }
  }
  function applyRecCollapse(){
    const c=getCol(),wrap=document.getElementById('ic-list-wrap'),arr=document.getElementById('ic-rec-arrow');
    if(!wrap) return;
    wrap.style.display=c.records?'none':'';
    if(arr) arr.textContent=c.records?'▸':'▾';
  }
  function applyFormCollapse(){
    const c=getCol(),inner=document.getElementById('ic-form-inner'),btn=document.getElementById('ic-form-toggle');
    if(!inner) return;
    if(c.form){ inner.classList.add('ic-form-collapsed'); if(btn) btn.textContent='+'; }
    else       { inner.classList.remove('ic-form-collapsed'); if(btn) btn.textContent='−'; }
  }

  /* ── drag ────────────────────────────────────────── */
  function enableDrag(win){
    const bar=document.getElementById('ic-bar');
    let dragging=false,ox=0,oy=0,sx=0,sy=0,moved=false;
    function onStart(e){
      if(e.target.closest('#ic-x')) return;
      if(e.target.closest('#ic-hint')) return;
      dragging=true; moved=false;
      const t=e.touches?e.touches[0]:e;
      sx=t.clientX; sy=t.clientY; ox=win.offsetLeft; oy=win.offsetTop;
    }
    function onMove(e){
      if(!dragging) return; moved=true;
      const t=e.touches?e.touches[0]:e;
      win.style.left=Math.max(0,Math.min(ox+t.clientX-sx,window.innerWidth-win.offsetWidth))+'px';
      win.style.top=Math.max(0,Math.min(oy+t.clientY-sy,window.innerHeight-win.offsetHeight))+'px';
      win.style.right='auto'; win.style.bottom='auto';
    }
    function onEnd(){
      if(!dragging) return; dragging=false;
      try{localStorage.setItem(POS_KEY,JSON.stringify({l:win.style.left,t:win.style.top}));}catch(ex){}
      if(!moved){
        const c=getCol(); c.window=!c.window;
        localStorage.setItem(COL_KEY,JSON.stringify(c)); applyCapsule();
      }
    }
    bar.addEventListener('mousedown',onStart,{passive:true});
    bar.addEventListener('touchstart',onStart,{passive:true});
    document.addEventListener('mousemove',onMove,{passive:true});
    document.addEventListener('touchmove',onMove,{passive:true});
    document.addEventListener('mouseup',onEnd,{passive:true});
    document.addEventListener('touchend',onEnd,{passive:true});
  }

  function restorePos(win){
    try{
      const p=JSON.parse(localStorage.getItem(POS_KEY)||'null');
      if(p&&p.l&&p.t){win.style.left=p.l;win.style.top=p.t;win.style.right='auto';win.style.bottom='auto';}
    }catch(e){}
  }

  /* ── open / close ────────────────────────────────── */
  function openWin(){
    const w=document.getElementById('ic-win'); if(!w) return;
    winVisible=true; w.style.display='flex';
    requestAnimationFrame(()=>w.classList.add('ic-visible'));
    render(); renderTags(); applyCapsule(); applyRecCollapse(); applyFormCollapse();
    const lb=document.getElementById('ic-panel-toggle');
    if(lb){lb.textContent='关闭 · Close';lb.classList.add('ic-ext-btn-open');}
  }
  function closeWin(){
    const w=document.getElementById('ic-win'); if(!w) return;
    winVisible=false; w.classList.remove('ic-visible');
    w.addEventListener('transitionend',()=>{ if(!winVisible) w.style.display='none'; },{once:true});
    const lb=document.getElementById('ic-panel-toggle');
    if(lb){lb.textContent='打开 · Open';lb.classList.remove('ic-ext-btn-open');}
  }
  function toggleWin(){ winVisible?closeWin():openWin(); }

  /* ── share ───────────────────────────────────────── */
  function cancelShare(){
    shareStep=0;
    const ne=document.getElementById('ic-share-note'),btn=document.getElementById('ic-share'),cb=document.getElementById('ic-share-cancel');
    if(ne){ne.style.display='none';ne.value='';}
    if(btn){btn.textContent='📤 发给他看';btn.classList.remove('ic-share-confirm');}
    if(cb) cb.style.display='none';
  }
  function share(){
    const ne=document.getElementById('ic-share-note'),btn=document.getElementById('ic-share'),cb=document.getElementById('ic-share-cancel');
    if(shareStep===0){
      if(ne){ne.style.display='block';ne.focus();}
      if(btn){btn.textContent='✓ 确认发送给他';btn.classList.add('ic-share-confirm');}
      if(cb) cb.style.display='block';
      shareStep=1; return;
    }
    shareStep=0;
    if(ne) ne.style.display='none';
    if(btn) btn.classList.remove('ic-share-confirm');
    if(cb) cb.style.display='none';

    const allRecs=load();
    const recs=allRecs.filter(r=>r.date&&r.date.startsWith(curMonth));
    const inc=recs.filter(r=>r.type==='income').reduce((s,r)=>s+r.amount,0);
    const exp=recs.filter(r=>r.type==='expense').reduce((s,r)=>s+r.amount,0);
    const lines=recs.length
      ?[...recs].sort((a,b)=>b.date.localeCompare(a.date))
          .map(r=>`${fmt(r.date)} ${r.type==='income'?'＋':'－'}¥${Number(r.amount).toFixed(2)}${r.note?' · '+r.note:''}${r.tag?' ['+r.tag+']':''}`).join('\n')
      :'（本月暂无记录）';
    const extra=(ne&&ne.value)||'';
    const msg=`【iCost 账单 ${monthLabel(curMonth)}】\n收入 ¥${inc.toFixed(2)} · 支出 ¥${exp.toFixed(2)} · 结余 ¥${(inc-exp).toFixed(2)}\n\n本月全部记录（${recs.length}条）：\n${lines}${extra?'\n\n'+extra:''}`;
    const ta=document.querySelector('#send_textarea');
    if(ta){ta.value=msg;ta.dispatchEvent(new Event('input',{bubbles:true}));}
    if(ne) ne.value='';
    setTimeout(()=>{ const s=document.querySelector('#send_but'); if(s) s.click(); },120);
    if(btn){btn.textContent='已发送 ✓';btn.classList.add('ic-share-ok');}
    setTimeout(()=>{ if(btn){btn.textContent='📤 发给他看';btn.classList.remove('ic-share-ok');} },1800);
  }

  /* ── extension panel ─────────────────────────────── */
  function injectPanel(){
    if(document.getElementById('ic-ext-section')) return;
    const target=document.getElementById('extensions_settings'); if(!target) return;
    const sec=document.createElement('div');
    sec.id='ic-ext-section'; sec.className='ic-ext-section';
    sec.innerHTML=`<div class="ic-ext-row">
      <div class="ic-ext-info">
        <span class="ic-ext-name">iCost</span>
        <span class="ic-ext-sub">我的账本 · 收支记录</span>
      </div>
      <button class="ic-ext-btn" id="ic-panel-toggle">打开 · Open</button>
    </div>`;
    target.prepend(sec);
    document.getElementById('ic-panel-toggle').addEventListener('click',toggleWin);
  }

  /* ── mount ───────────────────────────────────────── */
  function mount(){
    if(document.getElementById('ic-win')) return;
    const w=buildWin(); document.body.appendChild(w);
    restorePos(w); enableDrag(w);

    document.getElementById('ic-x').addEventListener('click',closeWin);

    document.getElementById('ic-hint').addEventListener('click',e=>{
      e.stopPropagation();
      const c=getCol(); c.window=!c.window;
      localStorage.setItem(COL_KEY,JSON.stringify(c)); applyCapsule();
    });

    document.getElementById('ic-form-toggle').addEventListener('click',e=>{
      e.stopPropagation();
      const c=getCol(); c.form=!c.form;
      localStorage.setItem(COL_KEY,JSON.stringify(c)); applyFormCollapse();
    });

    document.getElementById('ic-rechd').addEventListener('click',e=>{
      if(e.target.closest('.ic-month-btn')||e.target.closest('.ic-month-label')) return;
      const c=getCol(); c.records=!c.records;
      localStorage.setItem(COL_KEY,JSON.stringify(c)); applyRecCollapse();
    });
    document.getElementById('ic-month-prev').addEventListener('click',e=>{
      e.stopPropagation(); curMonth=prevMonth(curMonth); render();
    });
    document.getElementById('ic-month-next').addEventListener('click',e=>{
      e.stopPropagation(); curMonth=nextMonth(curMonth); render();
    });

    document.getElementById('ic-tb-exp').addEventListener('click',()=>setType('expense'));
    document.getElementById('ic-tb-inc').addEventListener('click',()=>setType('income'));
    document.getElementById('ic-addbtn').addEventListener('click',addRecord);
    document.getElementById('ic-share').addEventListener('click',share);
    document.getElementById('ic-share-cancel').addEventListener('click',cancelShare);
    document.getElementById('ic-budget-set-btn').addEventListener('click',e=>{ e.stopPropagation(); openBudgetInput(); });
    document.getElementById('ic-budget-set-btn2').addEventListener('click',e=>{ e.stopPropagation(); openBudgetInput(); });

    renderTags();
  }

  /* ── init — 延迟挂载，绝不阻塞页面加载 ─────────────── */
  function init(){
    try{ mount(); }      catch(e){ console.warn('[iCost] mount:',e); }
    try{ injectPanel(); }catch(e){ console.warn('[iCost] panel:',e); }
  }

  // 三重延迟，确保酒馆加载完毕后才插入，任何一次成功即可
  const D=[1200,3500,7000];
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>D.forEach(d=>setTimeout(safe(init),d)));
  } else {
    D.forEach(d=>setTimeout(safe(init),d));
  }
})();
