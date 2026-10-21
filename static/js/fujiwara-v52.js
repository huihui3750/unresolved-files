/* V52 — deterministic testimony and rebuttal; Gemini remains independent. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const log=$('v52-story-log'),prompts=$('v52-prompts'),claim=$('v52-claim'),proof=$('v52-evidence');
if(!log||!prompts||!claim||!proof||typeof WITNESSES==='undefined')return;
const fixed=$('interview-fixed-panel');if(fixed)fixed.hidden=true;
const hints={mio:['你最後一次見到姊姊是什麼時候？','凜的日記記錄了什麼聲音？','凜寄給律師的信寫了什麼？'],shizue:['事故當晚你聽到什麼聲音？','宗一郎當晚去過維修區嗎？'],naoto:['暖氣管線會發出什麼聲音？','原始建築圖面上有第二入口嗎？'],souichiro:['客房真的只有一個入口嗎？','維修門是什麼時候封閉的？','案發當晚你去過維修區嗎？','你有向凜索取帳冊嗎？']};
const rules={mio:[['mio_intro',/日記|聲音|敲|姊姊|姐姐|凜/],['mio_letter',/律師|寄信|補充信/]],shizue:[['shizue_sound',/聲音|異響|金屬|那晚/],['shizue_presence',/宗一郎|叔父|行蹤|維修區/]],naoto:[['naoto_pipes',/暖氣|管線|聲音|金屬/],['naoto_plan',/圖面|建築|通道|入口/]],souichiro:[['sou_entrance',/入口|客房|通道/],['sou_seal',/封|施工|何時|什麼時候/],['sou_log',/案發|行蹤|維修區|那晚/],['sou_ledger',/律師|帳冊|帳務|爭執|凜/]]};
const STORE='fujiwara_v52_story';let records={};try{const v=JSON.parse(localStorage.getItem(STORE)||'{}');if(v&&typeof v==='object')records=v}catch{}
const person=()=>selectedWitness;let last='';
// Both free questions and verified evidence confrontations share ONE chronological transcript.
// The AI panel retains its own persisted history for context, but does not show a second log.
const aiHistory=$('ai-chat-history');
if(aiHistory){aiHistory.style.display='none';aiHistory.setAttribute('aria-hidden','true');}
const unifiedLog=log;
function addChatEntry(detail){
 if(!detail||!detail.id||!detail.message)return;
 // A unique event ID prevents replayed messages from being appended twice.
 if(detail.eventId && (records[detail.id]||[]).some(x=>x.eventId===detail.eventId))return;
 const id=detail.id,role=detail.role;
 (records[id]??=[]).push({role,text:detail.message,kind:role==='你'?'user':'character',eventId:detail.eventId||null});
 store();if(person()===id)bubble(role,detail.message,role==='你'?'user':'character');
}
document.addEventListener('fujiwara:chat-entry',e=>addChatEntry(e.detail));

function store(){try{localStorage.setItem(STORE,JSON.stringify(records))}catch{}}
function bubble(role,text,kind){const p=document.createElement('p');p.className='v52-msg '+kind;const b=document.createElement('b');b.textContent=role+'：';p.append(b,document.createTextNode(text));log.append(p);log.scrollTop=log.scrollHeight}
function record(id,role,text,kind){(records[id]??=[]).push({role,text,kind});store();if(person()===id)bubble(role,text,kind)}
// One-time migration of legacy AI-only conversations; never re-add on rerender.
try{
 const old=JSON.parse(localStorage.getItem('fujiwara_chat_v35')||'{}');
 for(const [id,items] of Object.entries(old)){
  if(!Array.isArray(items)||items.length===0||(records[id]||[]).length)continue;
  records[id]=items.filter(x=>x&&typeof x.message==='string').map(x=>({role:x.role||'受訪者',text:x.message,kind:x.role==='你'?'user':'character'}));
 }
 store();
}catch{}
function refresh(){const id=person();if(id!==last){last=id;log.replaceChildren();for(const item of records[id]||[])bubble(item.role,item.text,item.kind)}
prompts.replaceChildren();for(const q of hints[id]||[]){const b=document.createElement('button');b.type='button';b.textContent=q;b.onclick=()=>{$('ai-question').value=q;$('ai-question').focus()};prompts.append(b)}
const oldClaim=claim.value,oldProof=proof.value;const feedback=$('v52-feedback');if(feedback)feedback.textContent=id==='naoto'?'相馬直人提供的是技術證詞，目前沒有可反駁的矛盾。你可以繼續詢問暖氣管線與原始建築圖面，並用這些資訊質疑其他人物。':'';const rebutButton=$('v52-rebut');if(rebutButton)rebutButton.disabled=id==='naoto';claim.replaceChildren(new Option('請選擇證詞',''));proof.replaceChildren(new Option('請選擇已取得的證物',''));
for(const t of WITNESSES[id].topics.filter(t=>t.rebuttal)){const op=new Option(t.title+(state.rebuttals.includes(t.id)?'（已反駁）':''),t.id);op.disabled=!topicAvailable(t)||state.rebuttals.includes(t.id);if(!topicAvailable(t)){const missing=(t.requires||[]).filter(e=>!state.evidence.includes(e));op.textContent+='（尚未解鎖：'+(missing.includes('ev_shizue_diary')?'先詢問靜江事故當晚的聲音':'需先取得相關線索')+'）'}claim.add(op)}
for(const e of state.evidence)proof.add(new Option(EV[e]||e,e));
if(id==='shizue'&&!state.evidence.includes('ev_shizue_diary')){if(feedback)feedback.textContent='「叔父的行蹤」尚未解鎖：請先詢問靜江「事故當晚的聲音」，記錄證詞並取得她的私人日記。';const guide=document.createElement('button');guide.type='button';guide.textContent='先詢問：事故當晚的聲音';guide.onclick=()=>{chooseTopic('shizue_sound');refresh()};prompts.prepend(guide)}if(id==='naoto')claim.options[0].textContent='相馬沒有可反駁的證詞';if([...claim.options].some(o=>o.value===oldClaim&&!o.disabled))claim.value=oldClaim;
if(state.evidence.includes(oldProof))proof.value=oldProof;
}
// 自由訊問只由 fujiwara-ai.js 顯示 Gemini/RAG 的回答。
// 不再以問題關鍵字自動插入固定證詞，以免每次提到「姊姊」都重複播放日記台詞。
// 固定證詞與證物反駁仍可透過下方的「選擇證詞／出示證物」操作。
$('v52-rebut').addEventListener('click',async()=>{
 const id=person(),t=WITNESSES[id].topics.find(t=>t.id===claim.value),e=proof.value,f=$('v52-feedback');
 if(!t){f.textContent='請選擇可反駁的證詞。';return}
 if(!e){f.textContent='請選擇已取得的證物。';return}
 if(!topicAvailable(t)){f.textContent='尚未滿足這段證詞的調查條件。';return}
 const button=$('v52-rebut');button.disabled=true;
 try{
  const ok=await submitVerifiedRebuttal(t,e,f);
  if(ok){if(!state.dialogues.includes(t.id))state.dialogues.push(t.id);record(id,'你','出示證物：「'+(EV[e]||e)+'」。'+(t.id==='sou_seal'?' 施工單記載的封門日期在事故之後，你先前卻說門在事故前就封好了。這要怎麼解釋？':''),'user');record(id,WITNESSES[id].name,t.success,'character');render();refresh()}
 }finally{button.disabled=false}
});
$('witness-list')?.addEventListener('click',()=>queueMicrotask(refresh));
new MutationObserver(()=>{if(person()!==last)refresh()}).observe($('witness-name'),{childList:true,subtree:true});
refresh();
})();