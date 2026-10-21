(()=>{'use strict';
const journal=document.querySelector('.journal');if(!journal)return;
const store=document.createElement('div');store.id='notebook-data-source';store.hidden=true;journal.parentNode.insertBefore(store,journal);store.append(journal);
const panel=document.createElement('section');panel.id='notebook-window';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','偵探調查手札');
panel.innerHTML=`<header id="notebook-handle"><span class="book-label">CASE 001 · DETECTIVE NOTES</span><strong>偵探調查手札</strong><span class="drag-hint">拖曳上緣移動</span><button id="notebook-close" type="button" aria-label="關閉手札">×</button></header><nav id="notebook-tabs" aria-label="手札分類"><button data-nb-tab="notes" aria-pressed="true">調查紀錄</button><button data-nb-tab="evidence" aria-pressed="false">證物檔案</button><button data-nb-tab="testimony" aria-pressed="false">人物證詞</button><button data-nb-tab="deduction" aria-pressed="false">推理線索</button><button data-nb-tab="main" aria-pressed="false">主線線索</button></nav><div class="nb-book"><section class="nb-page nb-index"><small>DETECTIVE'S INDEX</small><h2 id="nb-index-heading">調查紀錄</h2><p id="nb-count" class="nb-muted"></p><div id="nb-index-list" class="nb-index-list" role="list"></div></section><section class="nb-page nb-detail"><small>CASE FILE / DETAIL</small><h2 id="nb-detail-heading">選擇紀錄</h2><div id="nb-detail-body" class="nb-detail-body" aria-live="polite">請點選左頁項目查看完整內容。</div></section></div>`;
const launcher=document.createElement('button');launcher.id='notebook-launch';launcher.type='button';launcher.setAttribute('aria-label','開啟偵探手札');launcher.setAttribute('aria-expanded','false');launcher.innerHTML='<svg viewBox="0 0 64 64" width="43" height="43" aria-hidden="true"><path d="M8 12c10-4 18-3 24 2 6-5 14-6 24-2v37c-9-3-17-2-24 3-7-5-15-6-24-3z" fill="#e6cf9c" stroke="#3e281c" stroke-width="3"/><path d="M32 14v38M14 22h14M36 22h14M14 30h14M36 30h14" fill="none" stroke="#866040" stroke-width="2"/></svg><span>手札</span>';
document.body.append(launcher,panel);
const names={notes:'調查紀錄',evidence:'證物檔案',testimony:'人物證詞',deduction:'推理線索',main:'主線線索'};
let active='notes',selected=0;
function state(){try{return JSON.parse(localStorage.getItem('fujiwara_manor_v12')||'{}')}catch{return {}}}
function items(){const s=state();if(active==='notes')return [...(s.notes||[])].map((n,i)=>({title:n.title||`調查紀錄 ${i+1}`,body:n.body||'',tag:'現場觀察'}));
if(active==='evidence'){const ids=s.evidence||[];return ids.map((id,i)=>{const data=window.fujiwaraEvidenceInfo?.(id);return {title:data?.name||document.querySelectorAll('#evidence li')[i]?.textContent?.trim()||id,body:data?`取得來源：${data.source||'未記錄'}\n\n證物描述：${data.description||'無'}\n\n調查價值：${data.use||'無'}\n\n目前限制：${data.caution||'無'}`:'已取得證物；可至線索板查看完整資料。',tag:'證物'}})}
if(active==='testimony')return (s.dialogues||[]).map((d,i)=>{
 const id=typeof d==='string'?d:(d?.id||d?.topicId||d?.topic);
 const info=window.fujiwaraTestimonyInfo?.(id);
 if(info){const rebutted=(s.rebuttals||[]).includes(id);
  const body=`證詞人物：${info.character}\n證詞主題：${info.title}\n狀態：${rebutted?'已成功反駁':info.rebuttable?'尚待查證':'已記錄'}\n\n【原始證詞】\n${info.original}`+
   (rebutted&&info.corrected?`\n\n【反駁後的修正證詞】\n${info.corrected}`:'')+
   (info.rebuttable&&!rebutted?'\n\n【調查提示】\n這段說法仍需與已取得的證物交叉比對。':'');
  return {title:`${info.character}｜${info.title}`,body,tag:rebutted?'已反駁':info.rebuttable?'待查證':'人物證詞'};
 }
 // 舊存檔與自由訊問紀錄保留，不將原始物件直接序列化給玩家。
 if(typeof d==='object'&&d!==null){const speaker=d.character||d.speaker||d.name||'未知人物';const content=d.text||d.content||d.answer||d.line||'此筆舊紀錄缺少證詞內容';return {title:`${speaker}｜訊問紀錄 ${i+1}`,body:String(content),tag:'訊問紀錄'};}
 return {title:`訊問紀錄 ${i+1}`,body:'此筆舊紀錄只有內部識別資料，請重新訊問人物以取得完整證詞。',tag:'待補充'};
 });
if(active==='deduction')return [...(s.rebuttals||[]).map((x,i)=>{const info=window.fujiwaraTestimonyInfo?.(x);return {title:info?`${info.character}｜${info.title}`:`證詞反駁 ${i+1}`,body:info?`【原始證詞】\n${info.original}\n\n【反駁後】\n${info.corrected||'證詞已被推翻'}`:'此筆反駁紀錄需要重新確認。',tag:'已反駁'};}),...(s.finaleAnswers||[]).map((x,i)=>({title:`推理重建 ${i+1}`,body:String(x),tag:'推理'}))];
return (s.mainClues||[]).map((x,i)=>({title:x.title||`主線線索 ${i+1}`,body:x.body||String(x),tag:'主線'}));}
function render(){const arr=items();selected=Math.min(selected,Math.max(0,arr.length-1));panel.querySelector('#nb-index-heading').textContent=names[active];panel.querySelector('#nb-count').textContent=`已記錄 ${arr.length} 項`;
const list=panel.querySelector('#nb-index-list');list.replaceChildren();arr.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.className='nb-record';b.dataset.index=i;b.setAttribute('aria-current',String(i===selected));const small=document.createElement('small');small.textContent=item.tag;const strong=document.createElement('strong');strong.textContent=item.title;const summary=document.createElement('span');summary.textContent=item.body.slice(0,52)+(item.body.length>52?'…':'');b.append(small,strong,summary);list.append(b)});
const current=arr[selected];panel.querySelector('#nb-detail-heading').textContent=current?.title||'尚無紀錄';panel.querySelector('#nb-detail-body').textContent=current?.body||(active==='main'?'CASE 001 為獨立教學案件，主線線索將在後續案件取得。':'完成調查後，紀錄會自動出現在這裡。');}
panel.querySelector('#notebook-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-nb-tab]');if(!b)return;active=b.dataset.nbTab;selected=0;panel.querySelectorAll('[data-nb-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render()});
panel.querySelector('#nb-index-list').addEventListener('click',e=>{const b=e.target.closest('[data-index]');if(!b)return;selected=Number(b.dataset.index);render()});
function open(){panel.hidden=false;launcher.setAttribute('aria-expanded','true');render();restore(panel,'fujiwara_notebook_position_v2')}
function close(){panel.hidden=true;launcher.setAttribute('aria-expanded','false')}
launcher.addEventListener('click',()=>panel.hidden?open():close());panel.querySelector('#notebook-close').addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close()});
function place(el,x,y){const w=el.offsetWidth,h=el.offsetHeight;el.style.left=Math.max(0,Math.min(x,Math.max(0,innerWidth-w)))+'px';el.style.top=Math.max(0,Math.min(y,Math.max(0,innerHeight-h)))+'px';el.style.right='auto';el.style.bottom='auto'}
function restore(el,key){try{const p=JSON.parse(localStorage.getItem(key)||'null');if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))place(el,p.x,p.y)}catch{}}
function draggable(handle,el,key,buttonMode=false){
 let drag=null,blockClick=false;
 handle.style.touchAction='none';
 handle.addEventListener('pointerdown',e=>{
  if(e.button!==0||(!buttonMode&&e.target.closest('button')))return;
  const r=el.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};
  try{handle.setPointerCapture(e.pointerId)}catch{}
 });
 handle.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>5)drag.moved=true;
  if(drag.moved){e.preventDefault();place(el,drag.left+dx,drag.top+dy)}
 });
 function finish(e){if(!drag||e.pointerId!==drag.id)return;
  if(drag.moved){blockClick=true;const r=el.getBoundingClientRect();try{localStorage.setItem(key,JSON.stringify({x:r.left,y:r.top}))}catch{}}
  drag=null;
 }
 handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
 if(buttonMode)handle.addEventListener('click',e=>{if(blockClick){e.preventDefault();e.stopImmediatePropagation();blockClick=false}},true);
}
draggable(panel.querySelector('#notebook-handle'),panel,'fujiwara_notebook_position_v2');
restore(launcher,'fujiwara_notebook_button_position_v1');
draggable(launcher,launcher,'fujiwara_notebook_button_position_v1',true);
window.addEventListener('resize',()=>{if(!panel.hidden){const r=panel.getBoundingClientRect();place(panel,r.left,r.top)}});
})();
