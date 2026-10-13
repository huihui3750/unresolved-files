(()=>{'use strict';
const journal=document.querySelector('.journal');if(!journal)return;
const launcher=document.createElement('button');launcher.id='notebook-launch';launcher.type='button';launcher.setAttribute('aria-label','開啟調查手札（拖曳可移動）');launcher.setAttribute('title','點擊開啟手札；按住拖曳可移動');launcher.setAttribute('aria-controls','notebook-window');launcher.setAttribute('aria-expanded','false');launcher.innerHTML='<svg viewBox="0 0 64 64" width="43" height="43" aria-hidden="true"><path d="M8 12c10-4 18-3 24 2 6-5 14-6 24-2v37c-9-3-17-2-24 3-7-5-15-6-24-3z" fill="#e6cf9c" stroke="#3e281c" stroke-width="3" stroke-linejoin="round"/><path d="M32 14v38M14 20c6-1 11 0 14 2M14 28c6-1 11 0 14 2M36 22c4-2 9-3 14-2M36 30c4-2 9-3 14-2" fill="none" stroke="#866040" stroke-width="2" stroke-linecap="round"/><path d="M8 12v37l-4 3V15z" fill="#7a3c31"/></svg><span>手札</span>';
const panel=document.createElement('section');panel.id='notebook-window';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','可移動的復古調查手札');panel.setAttribute('aria-modal','false');
const header=document.createElement('div');header.id='notebook-handle';header.innerHTML='<span class="book-label">CASE 001 · DETECTIVE NOTES</span><strong>偵探調查手札</strong><span class="drag-hint">按住封面上緣移動</span>';
const close=document.createElement('button');close.id='notebook-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','收起手札');header.append(close);
const tabs=document.createElement('nav');tabs.id='notebook-tabs';tabs.setAttribute('aria-label','手札頁面');tabs.innerHTML='<button type="button" data-sheet="notes" aria-pressed="true">調查紀錄</button><button type="button" data-sheet="evidence" aria-pressed="false">證物清單</button>';
const content=document.createElement('div');content.id='notebook-scroll';content.append(journal);panel.append(header,tabs,content);document.body.append(launcher,panel);
// V38: evidence entries in the book open their own detail sheet without leaving the notebook.
const evidencePage=journal.querySelector('#evidence');
const detailSheet=document.createElement('section');detailSheet.id='notebook-evidence-detail';detailSheet.hidden=true;
detailSheet.setAttribute('aria-label','手札證物詳細資料');
detailSheet.innerHTML='<div class="nb-detail-heading"><small>EVIDENCE RECORD / 證物檔案</small><button type="button" class="nb-detail-back">← 返回證物清單</button></div><h3 class="nb-detail-title"></h3><dl><dt>取得來源</dt><dd data-field="source"></dd><dt>證物描述</dt><dd data-field="description"></dd><dt>調查價值</dt><dd data-field="use"></dd><dt>目前限制</dt><dd data-field="caution"></dd></dl>';
const evidenceSide=evidencePage?.parentElement;
if(evidenceSide){evidenceSide.append(detailSheet);
 const listObserver=new MutationObserver(()=>{[...evidencePage.children].forEach((li,i)=>{const ids=(()=>{try{return JSON.parse(localStorage.getItem('fujiwara_manor_v12')||'{}').evidence||[]}catch{return []}})();const id=ids[i];if(!id||li.querySelector('button'))return;const btn=document.createElement('button');btn.type='button';btn.className='nb-evidence-entry';btn.dataset.evidenceId=id;btn.textContent=li.textContent+'　›';li.replaceChildren(btn)})});
 listObserver.observe(evidencePage,{childList:true});
 evidencePage.addEventListener('click',e=>{const btn=e.target.closest('[data-evidence-id]');if(!btn)return;const data=window.fujiwaraEvidenceInfo?.(btn.dataset.evidenceId);if(!data)return;
 detailSheet.querySelector('.nb-detail-title').textContent=data.name;
 for(const field of ['source','description','use','caution'])detailSheet.querySelector('[data-field="'+field+'"]').textContent=data[field];
 evidencePage.hidden=true;detailSheet.hidden=false;
 });
 detailSheet.querySelector('.nb-detail-back').addEventListener('click',()=>{detailSheet.hidden=true;evidencePage.hidden=false});
}
const PANEL_KEY='fujiwara_notebook_position_v2',BUTTON_KEY='fujiwara_notebook_button_position_v1';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function save(key,x,y){try{localStorage.setItem(key,JSON.stringify({x,y}))}catch{}}
function clamp(el,x,y){const maxX=Math.max(0,innerWidth-el.offsetWidth),maxY=Math.max(0,innerHeight-el.offsetHeight);return {x:Math.max(0,Math.min(x,maxX)),y:Math.max(0,Math.min(y,maxY))}}
function place(el,x,y){const p=clamp(el,x,y);el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.right='auto';el.style.bottom='auto';return p}
function restore(el,key){const p=read(key);if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))place(el,p.x,p.y)}
function sheet(which){tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sheet===which)));journal.dataset.sheet=which}
tabs.addEventListener('click',e=>{const b=e.target.closest('button[data-sheet]');if(b)sheet(b.dataset.sheet)});sheet('notes');
function open(){panel.hidden=false;launcher.setAttribute('aria-expanded','true');restore(panel,PANEL_KEY);const r=panel.getBoundingClientRect();place(panel,r.left,r.top)}
function hide(){panel.hidden=true;launcher.setAttribute('aria-expanded','false')}
launcher.addEventListener('click',()=>{if(launcher.dataset.dragged==='1'){delete launcher.dataset.dragged;return}panel.hidden?open():hide()});close.addEventListener('click',hide);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)hide()});
function makeDraggable(handle,el,key,options={}){let drag=null;
 handle.style.touchAction='none';
 handle.addEventListener('pointerdown',e=>{if(e.target.closest('button')&&e.target!==handle || e.pointerType==='mouse'&&e.button!==0)return;
 const r=el.getBoundingClientRect();drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:r.left,y:r.top,moved:false};
 try{handle.setPointerCapture(e.pointerId)}catch{}e.preventDefault();});
 handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;if(!drag.moved&&Math.hypot(dx,dy)<5)return;drag.moved=true;handle.classList.add('is-dragging');place(el,drag.x+dx,drag.y+dy);e.preventDefault()});
 function end(e){if(!drag||drag.id!==e.pointerId)return;const wasMoved=drag.moved;drag=null;handle.classList.remove('is-dragging');try{if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId)}catch{}if(wasMoved){const r=el.getBoundingClientRect();save(key,r.left,r.top);if(options.suppressClick){el.dataset.dragged='1';setTimeout(()=>{delete el.dataset.dragged},300)}}else if(options.tap){el.dataset.dragged='1';options.tap();setTimeout(()=>{delete el.dataset.dragged},300)}}
 handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);handle.addEventListener('lostpointercapture',e=>{if(drag)end(e)});
}
// Launcher is a draggable button; a short press still opens/closes the book.
makeDraggable(launcher,launcher,BUTTON_KEY,{suppressClick:true,tap:()=>{panel.hidden?open():hide()}});
makeDraggable(header,panel,PANEL_KEY);
restore(launcher,BUTTON_KEY);
window.addEventListener('resize',()=>{let r=launcher.getBoundingClientRect();place(launcher,r.left,r.top);if(!panel.hidden){r=panel.getBoundingClientRect();place(panel,r.left,r.top)}});
})();