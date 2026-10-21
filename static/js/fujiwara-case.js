/* V15 game layer */
 'use strict';
const KEY='fujiwara_manor_v12'; // 保留 V12-V14 既有存檔
const fresh=()=>({location:'room',seen:[],evidence:[],flags:{},notes:[],dialogues:[],rebuttals:[],finaleAnswers:[],endingUnlocked:false});
let state;
try{const loaded=JSON.parse(localStorage.getItem(KEY)||'null');state=loaded&&Array.isArray(loaded.seen)&&Array.isArray(loaded.evidence)&&loaded.flags&&typeof loaded.flags==='object'&&!Array.isArray(loaded.flags)&&Array.isArray(loaded.notes)?loaded:fresh()}catch{state=fresh()}
const $=q=>document.querySelector(q);
if(!Array.isArray(state.finaleAnswers))state.finaleAnswers=[];
if(typeof state.endingUnlocked!=="boolean")state.endingUnlocked=false;
if(!Array.isArray(state.dialogues))state.dialogues=[];
if(!Array.isArray(state.rebuttals))state.rebuttals=[];
// 結案狀態相容性：不信任損壞或手動修改的舊存檔欄位。
if(!Array.isArray(state.finaleAnswers))state.finaleAnswers=[];
state.finaleAnswers=state.finaleAnswers.filter(x=>typeof x==='string');
if(state.endingUnlocked&&state.finaleAnswers.length!==6)state.endingUnlocked=false;
// 既有存檔欄位相容處理。
const ITEMS={
 door:{name:'客房正門',text:'門內側的橫閂仍在。正門上鎖不代表房內從未有其他人。',hint:'注意：正門與維修門是兩個不同的出入口。'},
 desk:{name:'書桌',text:'桌面擺著舊客房照片，背面標註「事故前一日」。',hint:'取得證物：客房舊照片。',evidence:'ev_old_photo'},
 wardrobe:{name:'衣櫃',text:'衣櫃後方留有狹窄凹位，足以讓人短暫躲藏；但無法據此證明當晚有人躲在此處。',hint:'此處是可能的藏身位置。'},
 wall:{name:'東側牆面',text:'牆紙下有一道不自然的接縫，似乎曾被木板覆蓋。',hint:'調查後可再檢查封板。',flag:'wall_inspected'},
 service:{name:'封閉檢修門',text:'封板後面是一道通往維修夾層的舊門。',hint:'需要完成第二入口推理，並取得書房中的檢查授權。',requires:['wall_inspected','entrance_linked','authorized'],evidence:'ev_fabric',success:'經授權移開封板，發現門框內側卡著一小片布料。來源尚待鑑別。'},
 archive:{name:'舊案卷宗',text:'卷宗附有當年事故現場照片及測量紀錄，傷處與現場血跡的相對位置值得重新核對。',hint:'取得證物：事故現場紀錄。',evidence:'ev_accident_report'},
 order:{name:'封板施工單',text:'施工單日期在凜死亡後；文件並不能單獨證明封板目的。',hint:'取得證物：封板施工單。',evidence:'ev_sealing_order'},
 permit:{name:'檢查授權書',text:'山莊整修前的檢查授權，允許調查員在安全條件下查看封閉檢修門。',hint:'取得檢查授權；不代表可以任意破壞建物。',flag:'authorized',evidence:'ev_inspection_permit'},
 blueprint:{name:'建築圖面櫃',text:'原始圖面標出東側客房後方的維修夾層，以及一扇已被封住的舊門。',hint:'取得證物：原始建築圖面。',evidence:'ev_blueprint'},
 corridor:{name:'維修區入口',text:'東側走廊盡頭的門通向設備夾層。是否連接客房，需要和圖面核對。',hint:'可與客房牆面和圖面相互印證。'},
 pipe:{name:'暖氣管線',text:'管線升溫時，固定支架會連續發出兩聲金屬碰撞。',hint:'前兩聲有合理的機械來源；第三聲還需調查。',flag:'pipe_tested'},
 log:{name:'維修紀錄盒',text:'盒內留有七年前的維修出入紀錄複本；記載宗一郎當晚曾進入維修區。',hint:'取得證物：原始出入紀錄副本。',evidence:'ev_entry_log'}
};
const EV={ev_old_photo:'客房舊照片',ev_blueprint:'原始建築圖面',ev_inspection_permit:'檢查授權書',ev_fabric:'門框布料（待鑑別）',ev_accident_report:'事故現場紀錄',ev_sealing_order:'封板施工單',ev_entry_log:'維修出入紀錄副本',ev_shizue_diary:'靜江的私人日記',ev_rin_diary:'凜的日記',ev_lawyer_letter:'律師保存的補充信'};
const LOC={room:{title:'東側客房',spots:[['door',14,68],['desk',37,65],['wardrobe',65,59],['wall',82,43],['service',91,70]]},study:{title:'山莊書房',spots:[['archive',22,50],['order',53,59],['permit',70,50],['blueprint',90,60]]},hall:{title:'東側走廊',spots:[['corridor',75,54],['pipe',21,43],['log',31,72]]}};
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(err){/* 隱私模式或受限環境可能無法寫入；仍可繼續本次遊玩。 */}}
// V14 transitional synchronization: browser clicks are not cryptographic proof.
let v14Queue=Promise.resolve();
function v14Post(path, payload){
  v14Queue=v14Queue.catch(()=>{}).then(async()=>{
    const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!response.ok)throw new Error('HTTP '+response.status);
    return response.json();
  }).catch(error=>{console.warn('CASE001 後端進度同步失敗:',error);});
  return v14Queue;
}
const v14EvidenceSource={
  ev_old_photo:'desk',ev_accident_report:'archive',ev_sealing_order:'order',
  ev_inspection_permit:'permit',ev_blueprint:'blueprint',ev_entry_log:'log',
  ev_fabric:'service',ev_rin_diary:'mio_diary',
  ev_shizue_diary:'shizue_diary',ev_lawyer_letter:'lawyer_letter'
};
// Server confirmation is the only source of truth for collected evidence.
const pendingEvidence=new Set();
function v14Observe(evidence,topic){
 const object=v14EvidenceSource[evidence];
 const endpoint=topic?'/api/fujiwara/progress/interview-evidence':'/api/fujiwara/progress/observe';
 const payload=topic?{topic}:{object};
 if(!object&&!topic)return Promise.resolve(false);
 pendingEvidence.add(evidence);
 v14Queue=v14Queue.catch(()=>{}).then(async()=>{
  const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok)throw new Error(result.error||'HTTP '+response.status);
  if(!state.evidence.includes(evidence))state.evidence.push(evidence);
  notice('已儲存證物：'+(EV[evidence]||evidence));
  render();
  return true;
 }).catch(error=>{
  console.warn('CASE001 證物儲存失敗:',evidence,error);
  notice('證物「'+(EV[evidence]||evidence)+'」未成功存檔：'+error.message+'。請重新調查。');
  return false;
 }).finally(()=>{pendingEvidence.delete(evidence)});
 return v14Queue;
}
function addEvidence(id,topic){
 if(!id||state.evidence.includes(id)||pendingEvidence.has(id))return false;
 v14Observe(id,topic);
 return true;
}
function addNote(id,title,body){if(!state.notes.some(n=>n.id===id))state.notes.push({id,title,body})}
function notice(s){$('#notice').textContent=s}
function render(){const evidence=$('#evidence');evidence.replaceChildren();for(const id of state.evidence){const li=document.createElement('li');li.textContent=EV[id]||id;evidence.append(li)}if(!state.evidence.length){const li=document.createElement('li');li.textContent='尚未取得證物';evidence.append(li)}const notes=$('#notes');notes.replaceChildren();for(const n of state.notes){const li=document.createElement('li');const b=document.createElement('strong');b.textContent=n.title+'：';li.append(b,document.createTextNode(n.body));notes.append(li)}if(!state.notes.length){const li=document.createElement('li');li.textContent='尚未建立推理紀錄';notes.append(li)}document.querySelectorAll('.hotspot[data-id]').forEach(b=>{const checked=state.seen.includes(b.dataset.id);b.classList.toggle('is-inspected',checked);b.setAttribute('aria-label',(checked?'已調查，重新檢查：':'調查：')+ITEMS[b.dataset.id].name)});renderInterview();renderFinale();$('#progress').textContent=`已調查 ${state.seen.length}/${Object.keys(ITEMS).length} 個物件 · 已取得 ${state.evidence.length} 件證物 · 已建立 ${state.notes.length} 條推理`;persist()}
// 調查回饋：只記錄已確認的現場觀察，不自動替玩家完成證據關聯。
const INVESTIGATION_NOTES={
 door:['現場出入口','正門的橫閂仍在，但不能排除其他出入口。'],
 wardrobe:['衣櫃後方凹位','凹位可以藏人，尚無證據證明當晚有人使用。'],
 wall:['東側牆面接縫','牆面有封板痕跡，需要以原始圖面比對。'],
 corridor:['維修區入口','走廊通往設備夾層，是否連接客房仍需證物確認。'],
 pipe:['暖氣管線測試','暖氣支架可造成兩聲金屬碰撞；第三聲仍未釐清。'],
 service:['檢修門實地調查','在取得授權且完成入口關聯後，於門框找到待鑑別布料。']
};
function popup(item,btn){
 const p=$('#popup'),scene=$('.scene');
 $('#popup-title').textContent=item.name;
 $('#popup-text').textContent=item.text;
 $('#popup-hint').textContent=item.hint;
 p.hidden=false;
 // 在場景內限制彈窗座標，避免靠近邊緣的物件讓文字被裁切。
 const sc=scene.getBoundingClientRect(),r=btn.getBoundingClientRect();
 const width=p.offsetWidth||Math.min(330,sc.width*.9);
 const height=p.offsetHeight||200;
 const x=r.left-sc.left+r.width/2;
 const y=r.top-sc.top;
 p.style.left=Math.max(8,Math.min(x,sc.width-width-8))+'px';
 p.style.top=Math.max(8,Math.min(y-height-10,sc.height-height-8))+'px';
}
function inspect(btn){
 const id=btn.dataset.id,item=ITEMS[id];if(!item)return;
 const unmet=(item.requires||[]).filter(f=>!state.flags[f]);
 if(unmet.length){
  const missing={wall_inspected:'先調查東側牆面的接縫',entrance_linked:'先在線索板關聯客房舊照片與原始建築圖面',authorized:'先在書房取得檢查授權書'};
  popup({...item,text:'尚未符合檢查條件。',hint:unmet.map(f=>missing[f]||'需要其他調查條件').join('；')+'。'},btn);
  notice('調查尚未完成：'+unmet.map(f=>missing[f]||f).join('、'));
  return;
 }
 const first=!state.seen.includes(id);
 if(first)state.seen.push(id);
 if(item.flag)state.flags[item.flag]=true;
 const obtained=addEvidence(item.evidence);
 if(id==='service')state.flags.service_opened=true;
 if(first&&INVESTIGATION_NOTES[id]){
  const [title,body]=INVESTIGATION_NOTES[id];addNote('investigation_'+id,title,body);
 }
 popup(item,btn);
 notice(obtained?'正在儲存證物：'+EV[item.evidence]+'……':first?'已記錄調查：'+item.name:'已複查：'+item.name);
 render();
}
function setLocation(loc){if(!LOC[loc])return;state.location=loc;
 // 換場景時清除上一名人物的證詞選擇，避免誤將舊證詞拿到新場景反駁。
 selectedTopic=null; /* 人物訊問獨立成頁，換場景不強制換受訪者。 */$('.scene').dataset.location=loc;$('#current-scene-title').textContent='— '+LOC[loc].title;$('#popup').hidden=true;const host=$('#hotspots');host.replaceChildren();for(const [id,x,y] of LOC[loc].spots){const b=document.createElement('button');b.className='hotspot';b.dataset.id=id;b.textContent=ITEMS[id].name;b.classList.toggle('is-inspected',state.seen.includes(id));b.setAttribute('aria-label',(state.seen.includes(id)?'已調查，重新檢查：':'調查：')+ITEMS[id].name);b.style.left=x+'%';b.style.top=y+'%';b.addEventListener('click',()=>inspect(b));host.append(b)}document.querySelectorAll('[data-loc]').forEach(b=>{b.classList.toggle('active',b.dataset.loc===loc);b.setAttribute('aria-current',b.dataset.loc===loc?'page':'false')});notice('目前位於'+LOC[loc].title);render()}
$('#connect').addEventListener('click',()=>{if(state.flags.entrance_linked){notice('第二入口的證據關聯已記錄在手札。')}else if(state.evidence.includes('ev_old_photo')&&state.evidence.includes('ev_blueprint')){state.flags.entrance_linked=true;addNote('note_hidden_entrance','被封閉的第二入口','舊照片與建築圖面顯示東側客房曾有另一條通往維修區的路線。');notice('線索關聯成功，手札已同步更新。')}else notice('尚未取得客房舊照片及原始建築圖面。');render()});
$('#close').onclick=()=>$('#popup').hidden=true;
$('#reset').onclick=()=>{if(confirm('確定清除藤原山莊的調查進度？此操作無法復原。')){(async()=>{try{const r=await fetch('/api/fujiwara/progress/reset',{method:'POST',credentials:'same-origin'});if(!r.ok)throw Error('重置失敗');// A new investigation starts with an empty conversation history as well.
        // Clear both transcript stores so the V52 legacy migration cannot restore old lines.
        for(const key of ['fujiwara_chat_v35','fujiwara_v52_story']){
          try{localStorage.removeItem(key)}catch(err){console.warn('無法清除聊天紀錄',key,err)}
        }
        state=fresh();persist();location.reload()}catch(e){notice('伺服器重置失敗，原存檔已保留，請稍後重試。')}})()}};
// V13 人物詢問：證物僅能從對話／場景取得；不依賴單純測試按鈕。
const WITNESSES={
 mio:{name:'藤原澪',location:'room',intro:'委託人。七年前失去姊姊凜，近日再次注意到牆後異響。',topics:[
  {id:'mio_intro',title:'姊姊留下的日記',line:'「姊姊寫過兩次金屬敲擊，接著還有一聲輕響。她不覺得那只是暖氣。」',give:'ev_rin_diary',note:['note_mio_sound','澪的委託','凜的日記提及兩聲金屬碰撞及另一聲輕響；來源仍須調查。']},
  {id:'mio_letter',title:'寄給律師的信',line:'「我聯絡過當年收信的律師。他願意提供姊姊寄去的補充信副本。」',requires:['ev_rin_diary','ev_entry_log'],give:'ev_lawyer_letter',note:['note_rin_letter','凜的補充信','信件提到叔父曾由維修區接近客房，並要求交出帳務文件；這是凜生前的陳述，尚待其他證據佐證。']}
 ]},
 shizue:{name:'松本靜江',location:'hall',intro:'山莊管家。當年在山莊工作，對事故仍有顧慮。',topics:[
  {id:'shizue_sound',title:'事故當晚的聲音',line:'「那晚我聽到金屬響聲，後來就沒再靠近東側走廊。」',give:'ev_shizue_diary',note:['note_shizue_sound','靜江的記錄','靜江私下記下當晚的異響；她沒有親眼目睹衝突。']},
  {id:'shizue_presence',title:'叔父的行蹤',line:'「我很確定宗一郎先生那晚從來沒去過東側維修區。」',requires:['ev_shizue_diary'],rebuttal:'ev_entry_log',success:'靜江承認自己只在稍晚的書房見過宗一郎，無法替他證明整晚行蹤。',note:['note_shizue_corrected','靜江修正證詞','靜江無法證明宗一郎案發當晚始終未進入維修區。']}
 ]},
 naoto:{name:'相馬直人',location:'hall',intro:'整修技師。七年前尚未在山莊工作，不是當年事件目擊者。',topics:[
  {id:'naoto_pipes',title:'暖氣管線',line:'「暖氣升溫會連續碰兩下。最近我檢查通道時，也碰響過一塊鬆動的金屬片。」',requires:['pipe_tested'],note:['note_naoto_noise','現代的第三聲','相馬近期檢修造成的金屬輕響，與七年前的聲音不能直接視為同一機械事件。']},
  {id:'naoto_plan',title:'原始建築圖面',line:'「圖面上客房後面有維修夾層。這是建築事實，不能直接推論誰走過。」',requires:['ev_blueprint'],note:['note_naoto_plan','相馬確認圖面','相馬確認維修通道的存在，但未親眼見過七年前的任何人使用。']}
 ]},
 souichiro:{name:'藤原宗一郎',location:'study',intro:'山莊管理者。否認當年事故與自己有關。',topics:[
  {id:'sou_entrance',title:'房間是否只有一個入口',line:'「東側客房只有正門，根本沒有第二條路。」',rebuttal:'ev_blueprint',success:'宗一郎改口承認曾有維修門，但聲稱早已封閉。',note:['note_sou_entrance','第一項矛盾','宗一郎否認第二入口，與原始建築圖面不符。']},
  {id:'sou_seal',title:'維修門何時封閉',line:'「那扇門在凜出事之前就已經封死了。」',requiresRebuttal:'sou_entrance',rebuttal:'ev_sealing_order',success:'宗一郎無法解釋施工單為何記載事故後才封閉維修門。',note:['note_sou_seal','第二項矛盾','施工單日期在事故後；宗一郎對封門時間的說法不實。']},
  {id:'sou_log',title:'案發當晚的行蹤',line:'「事故那天，我沒有去過東側維修區。」',requiresRebuttal:'sou_seal',rebuttal:'ev_entry_log',success:'宗一郎承認曾進入維修區，但辯稱只是例行檢查。',note:['note_sou_log','第三項矛盾','出入紀錄記載宗一郎案發當晚曾進入維修區。']},
  {id:'sou_ledger',title:'凜為何找律師',line:'「我從來沒有找凜要過什麼帳冊。」',requiresRebuttal:'sou_log',rebuttal:'ev_lawyer_letter',success:'宗一郎承認曾與凜爭執帳務資料，但仍否認傷害她。',note:['note_sou_ledger','第四項矛盾','凜生前在寄給律師的信中記載叔父索取帳冊；宗一郎否認爭執的說法受質疑。']}
 ]}
};
// 統一提供手札使用的正式證詞資料；內部代號不直接顯示給玩家。
window.fujiwaraTestimonyInfo=function(id){
 for(const [characterId,w] of Object.entries(WITNESSES)){
  const t=w.topics.find(x=>x.id===id);
  if(t)return {id,characterId,character:w.name,title:t.title,original:t.line,
   corrected:t.success||'',rebuttable:Boolean(t.rebuttal)};
 }
 return null;
};
let selectedWitness='mio',selectedTopic=null;
function topicAvailable(t){return (!t.requires||t.requires.every(id=>state.evidence.includes(id)||Boolean(state.flags[id])))&&(!t.requiresRebuttal||state.rebuttals.includes(t.requiresRebuttal))}
function renderInterview(){
 const list=$('#witness-list');if(!list)return;
 list.replaceChildren();
 for(const [id,w] of Object.entries(WITNESSES)){
  const b=document.createElement('button');b.type='button';b.textContent=w.name+' · '+(w.location==='room'?'客房':w.location==='study'?'書房':'走廊');b.className=id===selectedWitness?'active':'';
  b.title='可直接詢問；切換人物不會改變目前調查地點';
  b.onclick=()=>{selectedWitness=id;selectedTopic=null;$('#interrogation-feedback').textContent='';render()};list.append(b)
 }
 const w=WITNESSES[selectedWitness];$('#witness-name').textContent=w.name;$('#witness-description').textContent=w.intro;
 const topics=$('#topic-list');topics.replaceChildren();
 for(const t of w.topics){const b=document.createElement('button');b.type='button';b.textContent=(state.rebuttals.includes(t.id)?'✓ ':state.dialogues.includes(t.id)?'• ':'')+t.title;b.disabled=!topicAvailable(t);b.title=b.disabled?'尚未取得解鎖此話題的線索':'';b.onclick=()=>chooseTopic(t.id);topics.append(b)}
 const t=w.topics.find(t=>t.id===selectedTopic);
 $('#statement').textContent=t?t.line:'請選擇一個話題開始詢問。';
 const rebut=$('#rebuttal');rebut.hidden=!t?.rebuttal;
 if(t?.rebuttal){const select=$('#rebuttal-evidence');const prev=select.value;select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='請選擇已取得的證物';select.append(empty);for(const id of state.evidence){const op=document.createElement('option');op.value=id;op.textContent=EV[id]||id;select.append(op)}if(state.evidence.includes(prev))select.value=prev}
 $('#interrogation-status').textContent=`已詢問 ${state.dialogues.length} 個話題 · 成功反駁 ${state.rebuttals.length} 次`;
}
// 自由訊問命中既定證詞後，沿用原有的證物授予及手札更新流程。
// 不從任意 AI 回答中推測新事實；只允許白名單證詞。
window.fujiwaraRecordInterviewTopic=function(witness, topicId){
 if(selectedWitness!==witness)return false;
 const topic=WITNESSES[witness]?.topics.find(t=>t.id===topicId);
 if(!topic||!topicAvailable(topic))return false;
 chooseTopic(topicId);
 return true;
};
function chooseTopic(id){const t=WITNESSES[selectedWitness].topics.find(x=>x.id===id);if(!t||!topicAvailable(t))return;
 selectedTopic=id;if(!state.dialogues.includes(id))state.dialogues.push(id);
 if(t.give){const acquired=addEvidence(t.give,t.id);notice(acquired?'詢問取得證物：'+EV[t.give]:'已重新閱讀這段證言。')}
 if(t.note&&!t.rebuttal)addNote(...t.note);
 $('#interrogation-feedback').textContent=t.rebuttal?'這段證詞可能有矛盾。請選擇證物反駁。':'已記錄證言。';render()
}
async function submitVerifiedRebuttal(t, selected, feedback){
 if(!t?.rebuttal){feedback.textContent='請先選擇要反駁的證詞。';return false}
 if(!selected){feedback.textContent='請先選擇證物。';return false}
 if(state.rebuttals.includes(t.id)){feedback.textContent='這段證詞已經反駁成功。';return false}
 feedback.textContent='正在核對證詞與證物……';
 try{
  await v14Queue;
  const response=await fetch('/api/fujiwara/progress/rebut',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({rebuttal:t.id,evidence:selected})});
  const result=await response.json();
  if(!response.ok||!result.ok){feedback.textContent=result.error||'反駁未成立，請檢查調查進度。';return false}
  if(!state.rebuttals.includes(t.id))state.rebuttals.push(t.id);
  if(t.note)addNote(...t.note);
  feedback.textContent=t.success||'證詞反駁成立。';notice('反駁成立，調查手札已更新。');render();
  return true;
 }catch(error){feedback.textContent='無法連線確認反駁，進度未變更。請稍後重試。';return false}
}
$('#submit-rebuttal').onclick=async()=>{
 const t=WITNESSES[selectedWitness].topics.find(x=>x.id===selectedTopic);
 const button=$('#submit-rebuttal');button.disabled=true;
 try{await submitVerifiedRebuttal(t,$('#rebuttal-evidence').value,$('#interrogation-feedback'))}finally{button.disabled=false}
};
document.querySelectorAll('[data-loc]').forEach(b=>b.onclick=()=>setLocation(b.dataset.loc));


// V14 最終案件重建。答案只陳述證據可支持的結論，不將推測當成司法定論。
const FINALE_STEPS=[
 {id:'finale_entrance',title:'第一問｜密室的入口',question:'東側客房當年是否必然只有正門可以通行？',choices:['是，因為正門從內側上鎖','否，建築圖面及封板紀錄顯示事故當時可能存在第二入口','無法判斷，所有圖面都已失效'],answer:1,need:['ev_blueprint','ev_sealing_order'],note:'事故後才封閉的維修門，讓原本的密室推論無法成立。'},
 {id:'finale_sound',title:'第二問｜牆後的三聲',question:'三聲異響最合理的解釋是什麼？',choices:['三聲都來自同一扇門','前兩聲可以由暖氣管線解釋，第三聲仍須結合維修區調查，不能單憑聲音認定兇手','三聲都證明有人在客房內'],answer:1,need:['ev_rin_diary'],flag:'pipe_tested',note:'兩聲管線碰撞已能重現；第三聲不能單獨證明誰在何時開門。'},
 {id:'finale_presence',title:'第三問｜案發當晚的行蹤',question:'宗一郎的出入紀錄能證明什麼？',choices:['他一定進入凜的房間並造成死亡','他當晚曾進入維修區，與原本否認行蹤的說法矛盾','他從未接近東側客房'],answer:1,need:['ev_entry_log'],rebut:'sou_log',note:'出入紀錄能推翻宗一郎對行蹤的否認，但不能單獨證明他進入客房。'},
 {id:'finale_scene',title:'第四問｜事故現場',question:'照片、測量紀錄與門框布料支持哪一種結論？',choices:['事故現場有未解釋的疑點，應重新重建凜受傷與移動的經過','宗一郎必然將遺體移到書桌旁','凜一定是在書桌旁自行跌倒'],answer:0,need:['ev_accident_report','ev_fabric'],note:'現場紀錄與門框布料不能直接證明謀殺，但足以質疑原本過度簡化的意外說法。'},
 {id:'finale_motive',title:'第五問｜被奪取的帳冊',question:'凜寄給律師的補充信能證明什麼？',choices:['宗一郎在信寄出前就已殺害凜','凜生前記載叔父索取帳冊，顯示雙方可能存在財產文件衝突','信件本身證明帳冊每一筆金額都屬於偽造'],answer:1,need:['ev_lawyer_letter'],rebut:'sou_ledger',note:'補充信與宗一郎改口的證言共同支持帳冊爭執的存在，但財產犯罪仍需獨立查證。'},
 {id:'finale_conclusion',title:'第六問｜最終指認',question:'現階段最負責任的結案判斷是什麼？',choices:['宗一郎的每個犯罪細節都已由物證完全證實','宗一郎有重大嫌疑，應當面質問其隱瞞的事實，並將資料交由有權調查者確認','因為沒有直接目擊者，所有線索都沒有價值'],answer:1,need:['ev_entry_log','ev_lawyer_letter','ev_accident_report'],rebut:'sou_seal',note:'證據支持強烈的案件重建，但完整致命過程仍需對質與後續調查。'}
];
const REQUIRED_REBUTTALS=['sou_entrance','sou_seal','sou_log','sou_ledger'];
function finaleReadiness(){
 const missing=[];
 for(const r of REQUIRED_REBUTTALS)if(!state.rebuttals.includes(r))missing.push('尚未完成宗一郎的證詞反駁：'+(WITNESSES.souichiro.topics.find(t=>t.id===r)?.title||r));
 for(const id of ['ev_fabric','ev_accident_report','ev_lawyer_letter','ev_rin_diary','ev_entry_log'])if(!state.evidence.includes(id))missing.push('尚未取得：'+(EV[id]||id));
 if(!state.flags.pipe_tested)missing.push('尚未檢查暖氣管線');
 if(!state.flags.entrance_linked)missing.push('尚未完成舊照片與建築圖面的線索關聯');
 if(!state.flags.service_opened)missing.push('尚未實際開啟封閉檢修門');
 return missing;
}
// V36: 顯示真實的解鎖條件與每題答題所需資料，避免玩家盲目試錯。
function finaleConditionRows(){
 const rows=[];
 for(const id of ['ev_fabric','ev_accident_report','ev_lawyer_letter','ev_rin_diary','ev_entry_log'])
  rows.push({label:'取得證物：'+(EV[id]||id),done:state.evidence.includes(id)});
 rows.push({label:'完成暖氣管線檢查',done:!!state.flags.pipe_tested});
 rows.push({label:'關聯舊照片與建築圖面',done:!!state.flags.entrance_linked});
 rows.push({label:'開啟封閉檢修門',done:!!state.flags.service_opened});
 for(const id of REQUIRED_REBUTTALS){
  const title=WITNESSES.souichiro.topics.find(t=>t.id===id)?.title||id;
  rows.push({label:'完成宗一郎證詞反駁：'+title,done:state.rebuttals.includes(id)});
 }
 return rows;
}
function appendConditionList(parent,rows,heading){
 const section=document.createElement('section');section.className='v36-condition-panel';
 const h=document.createElement('h3');h.textContent=heading;section.append(h);
 const count=document.createElement('p');count.className='v36-condition-count';
 count.textContent=`已完成 ${rows.filter(x=>x.done).length} / ${rows.length} 項`;section.append(count);
 const ul=document.createElement('ul');ul.className='v36-condition-list';
 for(const row of rows){const li=document.createElement('li');li.className=row.done?'is-done':'is-pending';
  const marker=document.createElement('span');marker.className='v36-condition-marker';marker.textContent=row.done?'✓':'○';marker.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.textContent=row.label;li.append(marker,label);ul.append(li)}
 section.append(ul);parent.append(section);
}
function finaleStepConditions(step){
 const rows=step.need.map(id=>({label:'取得證物：'+(EV[id]||id),done:state.evidence.includes(id)}));
 if(step.flag)rows.push({label:'完成暖氣管線檢查',done:!!state.flags[step.flag]});
 if(step.rebut){const title=WITNESSES.souichiro.topics.find(t=>t.id===step.rebut)?.title||step.rebut;
  rows.push({label:'完成宗一郎證詞反駁：'+title,done:state.rebuttals.includes(step.rebut)})}
 return rows;
}
function renderFinale(){
 const host=$('#finale-content'),ending=$('#ending');if(!host)return;
 host.replaceChildren();
 const conditions=finaleConditionRows();
 appendConditionList(host,conditions,'推理分析解鎖條件');
 const missing=finaleReadiness();
 $('#finale-status').textContent=state.endingUnlocked?'真相揭露完成':`已完成 ${state.finaleAnswers.length}/${FINALE_STEPS.length} 項推理`;
 if(state.endingUnlocked){ending.hidden=false;ending.replaceChildren();
  const title=document.createElement('h3');title.textContent='結局｜牆後的真相';
  const paragraphs=[
   '你將建築圖面、封板紀錄、出入紀錄及凜生前的補充信依序擺在宗一郎面前。',
   '宗一郎終於承認：他曾由維修通道秘密進入凜的房間，與她爭奪帳冊。爭執中凜撞上家具受傷，他因恐懼而離開，並在事後隱瞞入口與紀錄。',
   '澪問：「你為什麼沒有救她？」宗一郎沉默許久，只回答：「我以為她會醒來。」',
   '調查員沒有把這份證言當成法院判決，而是將原始紀錄、證物及宗一郎的供述整理移交，要求重新調查。',
   '案件手札最後寫下：第三聲不是亡者的訊息，而是當年被刻意隱藏的另一條路。'
  ];ending.append(title);for(const p of paragraphs){const el=document.createElement('p');el.textContent=p;ending.append(el)}
  const btn=document.createElement('button');btn.textContent='複查案件手札';btn.onclick=()=>document.getElementById('notebook-launch')?.click();ending.append(btn);const archiveLink=document.createElement('a');archiveLink.href='/cases/fujiwara/archive';archiveLink.className='v40-archive-link';archiveLink.textContent='閱讀通關劇本與人物小傳 →';ending.append(archiveLink);return;
 }
 ending.hidden=true;
 if(missing.length){const p=document.createElement('p');p.className='finale-warning';p.textContent='尚未符合最終推理的解鎖條件：';host.append(p);const ul=document.createElement('ul');for(const x of missing){const li=document.createElement('li');li.textContent=x;ul.append(li)}host.append(ul);return}
 const idx=state.finaleAnswers.length;
 if(idx>=FINALE_STEPS.length){const p=document.createElement('p');p.textContent=state.location==='study'?'六項推理已完成。你可以在書房提出最後的質問。':'六項推理已完成。點擊下方按鈕即可前往書房。';host.append(p);const b=document.createElement('button');b.className='finale-submit';b.textContent=state.location==='study'?'質問宗一郎，揭露真相':'前往書房，準備最終對質';b.onclick=async()=>{if(finaleReadiness().length||state.finaleAnswers.length!==FINALE_STEPS.length)return;
 if(state.location!=='study'){setLocation('study');notice('已前往山莊書房。請再次按下「質問宗一郎，揭露真相」開始對質。');return;}const btn=b;btn.disabled=true;try{const r=await fetch('/api/fujiwara/progress/ending',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:state.finaleAnswers})});const data=await r.json();if(!r.ok||!data.ok){notice(data.error||'結案驗證失敗');return}state.endingUnlocked=true;}catch(e){notice('結案存檔失敗，請檢查連線再試');return}finally{btn.disabled=false}addNote('note_case_resolution','案件重建完成','宗一郎在對質後承認當年的爭執與隱瞞。完整責任仍須由後續調查確認。');notice('CASE 001｜真相揭露');render();$('#ending').scrollIntoView({behavior:'smooth',block:'start'})};host.append(b);return}
 const step=FINALE_STEPS[idx];appendConditionList(host,finaleStepConditions(step),'本題需要的證據與證詞');const h=document.createElement('h3');h.textContent=step.title;host.append(h);const q=document.createElement('p');q.textContent=step.question;host.append(q);
 const choices=document.createElement('div');choices.className='finale-options';host.append(choices);
 const feedback=document.createElement('p');feedback.className='finale-feedback';feedback.setAttribute('role','status');host.append(feedback);
 step.choices.forEach((label,i)=>{const b=document.createElement('button');b.textContent=String.fromCharCode(65+i)+'．'+label;b.onclick=()=>{if(i!==step.answer){feedback.textContent='這項推論超出了現有證據，請重新比對手札。';return}if(!step.need.every(id=>state.evidence.includes(id))||(step.flag&&!state.flags[step.flag])||(step.rebut&&!state.rebuttals.includes(step.rebut))){feedback.textContent='缺少支撐這項推論的證物或證詞。';return}state.finaleAnswers.push(step.id);addNote('note_'+step.id,step.title,step.note);notice('推理成立，手札已更新。');render()};choices.append(b)});
}

setLocation(LOC[state.location]?state.location:'room');


/* V16 game layer */
/* V16 獨立視覺層：不修改 V15 證物、反駁、結局的判定。 */
(()=>{
 'use strict';
 const $v=id=>document.getElementById(id);
 const names={mio:'藤原澪',shizue:'松本靜江',naoto:'相馬直人',souichiro:'藤原宗一郎'};
 const roles={mio:'委託人 · 妹妹',shizue:'山莊管家 · 證人',naoto:'整修技師 · 證人',souichiro:'山莊管理者 · 關鍵人物'};
 const selection=[];
 // 證物描述只呈現調查時已能確認的內容，不提前洩漏結案真相。
 const evidenceDetails={
  ev_old_photo:['東側客房書桌','拍攝於事故前一日的舊照片，保留客房原先的配置。','可與原始建築圖面比對，確認房間是否存在另一處出入口。','照片只能反映拍攝當時的狀態，不能證明案發當晚誰曾進出。'],
  ev_blueprint:['山莊書房・建築圖面櫃','山莊原始圖面標出客房後方的維修夾層及已封閉的舊門。','與舊照片互相比對，可重建客房的第二條可能動線。','圖面不能單獨證明舊門在案發當晚可通行。'],
  ev_inspection_permit:['山莊書房・檢查授權書','整修前的檢查授權文件，允許在安全條件下查看封閉檢修門。','可用於合法查驗封板後方的空間。','授權文件本身不是犯罪證據。'],
  ev_fabric:['東側客房・封閉檢修門','在取得授權並移開封板後，於門框內側發現的一小片布料。','可能與舊門的使用痕跡有關，需進一步鑑別來源。','尚未確認所有人、年代與是否和案件直接相關。'],
  ev_accident_report:['山莊書房・舊案卷宗','當年的事故現場照片與測量紀錄，包含傷處與血跡位置。','可與當事人的證詞及客房動線交叉核對。','現場紀錄中的疑點不等於已證實他殺。'],
  ev_sealing_order:['山莊書房・封板施工單','記錄舊門封板工程的施工文件，日期晚於藤原凜死亡。','可協助確認舊門何時遭到封閉。','不能單憑施工時間推定封板者的動機。'],
  ev_entry_log:['東側走廊・維修紀錄盒','七年前維修出入紀錄的複本，記載藤原宗一郎當晚進入維修區。','可與維修通道及宗一郎的說法交叉核對。','這是複本，仍需查核原始紀錄及登記的可信度。'],
  ev_shizue_diary:['人物訊問・松本靜江','靜江私人記下的當年見聞與疑慮。','可與她目前的證言比較，辨識記憶或說法的差異。','私人日記仍屬個人記述，不能取代客觀物證。'],
  ev_rin_diary:['人物訊問・藤原澪','藤原凜留下的私人日記，反映她生前的處境。','有助於理解家族關係與當事人的行動動機。','日記內容不代表其中的猜測已被證實。'],
  ev_lawyer_letter:['人物訊問・相關證言','律師保存的補充信件，涉及藤原凜生前對帳冊爭議的說明。','可與出入紀錄及當事人證詞交叉核對。','信件本身無法直接證明致命衝突的經過。']
 };
 window.fujiwaraEvidenceInfo=function(id){
  if(!state.evidence.includes(id)||!evidenceDetails[id])return null;
  return {name:EV[id]||id,source:evidenceDetails[id][0],description:evidenceDetails[id][1],use:evidenceDetails[id][2],caution:evidenceDetails[id][3]};
 };
 let activeEvidence=null;
 function showEvidenceDetail(id){
  const panel=$v('v31-evidence-detail');if(!panel)return;
  const detail=evidenceDetails[id];if(!detail||!state.evidence.includes(id))return;
  activeEvidence=id;panel.hidden=false;
  $v('v31-evidence-name').textContent=EV[id]||id;
  $v('v31-evidence-source').textContent=detail[0];
  $v('v31-evidence-description').textContent=detail[1];
  $v('v31-evidence-use').textContent=detail[2];
  $v('v31-evidence-caution').textContent=detail[3];
 }
 function updatePortrait(){
  const id=typeof selectedWitness==='string'?selectedWitness:'mio';
  const portrait=$v('v16-portrait');if(!portrait)return;
  portrait.dataset.person=id;$v('v16-monogram').textContent=(names[id]||'?').slice(-1);$v('v16-role').textContent=roles[id]||'人物檔案';
 }
 function renderBoard(){
  const host=$v('v16-board-cards');if(!host)return;
  const ids=Array.isArray(state.evidence)?state.evidence:[];
  selection.splice(0,selection.length,...selection.filter(x=>ids.includes(x)));
  host.replaceChildren();
  ids.forEach((id,i)=>{
   const b=document.createElement('button');b.type='button';b.className='v16-evidence-card';b.style.setProperty('--angle',`${[-2,2,-1,1][i%4]}deg`);
   b.setAttribute('aria-pressed',String(selection.includes(id)));b.setAttribute('aria-label',`選取線索：${EV[id]||id}`);
   const strong=document.createElement('strong');strong.textContent=EV[id]||id;
   const small=document.createElement('small');small.textContent='證物編號 '+String(i+1).padStart(2,'0');b.append(strong,small);
   b.setAttribute('aria-label',`查看證物：${EV[id]||id}`);
   b.onclick=()=>showEvidenceDetail(id);
   const pick=document.createElement('button');pick.type='button';pick.className='v32-pick';
   pick.textContent=selection.includes(id)?'✓ 已選取（點擊取消）':'選取此證物進行關聯';
   pick.setAttribute('aria-pressed',String(selection.includes(id)));
   pick.onclick=()=>{const idx=selection.indexOf(id);if(idx>=0)selection.splice(idx,1);else{if(selection.length===2)selection.shift();selection.push(id)}renderBoard()};
   const wrapper=document.createElement('div');wrapper.className='v32-evidence-item';wrapper.append(b,pick);host.append(wrapper);
  });
  if(!ids.length){const p=document.createElement('p');p.textContent='線索板目前空白，請先調查場景。';host.append(p)}
  $v('v16-board-count').textContent=`已收集 ${ids.length} 件證物`;
  $v('v16-board-selection').textContent=selection.length?selection.map(id=>EV[id]||id).join(' ＋ '):'尚未選取線索';
  $v('v16-board-link').disabled=selection.length!==2;
  if(activeEvidence&&!ids.includes(activeEvidence)){$v('v31-evidence-detail').hidden=true;activeEvidence=null;}
 }
 function updateConfrontation(){
  const n=Math.min(6,Array.isArray(state.finaleAnswers)?state.finaleAnswers.length:0);
  const el=$v('v16-confrontation-line');if(!el)return;
  const missing=typeof finaleReadiness==='function'?finaleReadiness():[];
  el.textContent=state.endingUnlocked?'宗一郎已承認隱瞞當年的衝突，案件資料將移交重新調查。':missing.length?`尚有 ${missing.length} 項必要調查未完成。請回到場景與證詞尋找缺失的線索。`:n===6?'六項推理完成。請回到山莊書房，與宗一郎當面對質。':`案件重建進度 ${n}／6。每項結論都必須以已取得的證據支持。`;
  $v('v16-confrontation-progress').style.width=`${n/6*100}%`;
 }
 function updateV16(){updatePortrait();renderBoard();updateConfrontation();updateBoardChain()}
 // 第三批：新增可驗證的證據鏈；不改動既有結案門檻與真相。
 const BOARD_LINKS=[
  {id:'entrance',pair:['ev_old_photo','ev_blueprint'],title:'被封閉的第二入口',description:'舊照片與建築圖面顯示東側客房曾有通往維修區的第二條路線。',primary:true},
  {id:'seal',pair:['ev_blueprint','ev_sealing_order'],title:'封門時間的疑點',hint:'一道門究竟何時被封閉？',description:'建築圖面證實維修門存在；施工單顯示封門工程發生在事故之後，但不能單憑施工單推定封門動機。'},
  {id:'trace',pair:['ev_fabric','ev_accident_report'],title:'現場痕跡尚待鑑別',hint:'現場留下的痕跡代表什麼？',description:'門框布料與事故現場紀錄都值得進一步比對，但現階段不能證明布料所有者或死亡原因。'},
  {id:'timeline',pair:['ev_entry_log','ev_lawyer_letter'],title:'維修區行蹤與帳冊爭執',hint:'誰曾出現在維修區？又為何與帳冊有關？',description:'出入紀錄記載宗一郎案發當晚曾到維修區；凜的信記載帳冊爭執。兩項資料相互提供調查方向，但仍不能直接證明致命行為。'}
 ];
 function matchBoardLink(ids){return BOARD_LINKS.find(link=>link.pair.every(id=>ids.includes(id)))||null}
 function boardLinkCount(){return BOARD_LINKS.filter(link=>link.primary?!!state.flags.entrance_linked:!!state.flags['board_'+link.id]).length}
 function updateBoardChain(){
  const el=$v('v43-board-chain');if(!el)return;
  el.replaceChildren();
  const heading=document.createElement('strong');heading.textContent=`證據鏈 ${boardLinkCount()}／${BOARD_LINKS.length}`;el.append(heading);
  const list=document.createElement('ul');
  BOARD_LINKS.forEach(link=>{
   const complete=link.primary?!!state.flags.entrance_linked:!!state.flags['board_'+link.id];
   const li=document.createElement('li');li.className=complete?'is-complete':'is-pending';
   li.textContent=(complete?'✓ ':'○ ')+(complete?link.title:(link.hint||'尚未建立的關聯'));
   if(complete)li.title=link.description;
   list.append(li);
  });
  el.append(list);
 }
 $v('v16-board-link').addEventListener('click',()=>{
  if(selection.length!==2)return;
  const feedback=$v('v16-board-feedback');
  const link=matchBoardLink(selection);
  if(!link){feedback.textContent='這兩項證物尚無足夠資料建立可靠關聯。請重新比對證物描述。';return}
  const done=link.primary?!!state.flags.entrance_linked:!!state.flags['board_'+link.id];
  if(done){feedback.textContent='這條證據鏈已經建立，請查看手札。';selection.length=0;updateV16();return}
  if(link.primary){
   // 唯一會影響既有劇情解鎖的關聯，沿用原本判定。
   $v('connect').click();
   if(!state.flags.entrance_linked){feedback.textContent='條件尚未符合。';return}
  }else{
   state.flags['board_'+link.id]=true;
   addNote('board_'+link.id,link.title,link.description);
   render();
  }
  feedback.textContent='關聯成立：'+link.title+'。已同步至偵探手札。';
  selection.length=0;updateV16();
 });
 $v('v16-board-clear').addEventListener('click',()=>{selection.length=0;$v('v16-board-feedback').textContent='已清除選取。';updateV16()});
 // V15 的 render() 在每次調查、對話、反駁及最終推理後呼叫；將視覺層接在它後面。
 const originalRender=render;
 render=function(){originalRender();updateV16()};
 updateV16();
})();


/* V17 game layer */
/* V17 對質演出層：沿用 V15/V16 既有推理判定，不修改犯人或解鎖規則。 */
(()=>{
  'use strict';
  const get=id=>document.getElementById(id);
  const scenes=[
    {speaker:'調查員',mark:'探',emotion:'質問',line:'宗一郎先生，東側客房並非密室。維修通道在凜過世之後，才被封閉。'},
    {speaker:'藤原宗一郎',mark:'宗',emotion:'強作鎮定',line:'那是為了安全。舊山莊有許多不適合再使用的通道。'},
    {speaker:'調查員',mark:'探',emotion:'出示紀錄',line:'可是七年前的出入紀錄，記下了您在事故當晚進入維修區的時間。您先前卻否認去過那裡。'},
    {speaker:'藤原宗一郎',mark:'宗',emotion:'動搖',line:'……我去檢查過設備。那並不代表我見過凜。'},
    {speaker:'藤原澪',mark:'澪',emotion:'克制',line:'姊姊寫給律師的信裡，提到您一直向她索取帳冊。她那時已經很害怕了。'},
    {speaker:'調查員',mark:'探',emotion:'重建現場',line:'事故照片、門框布料與封板紀錄，都顯示當年的調查漏掉了重要情況。我們不能只用一場意外解釋所有矛盾。'},
    {speaker:'藤原宗一郎',mark:'宗',emotion:'失去鎮定',line:'我只是要她交出帳冊！我沒有打算讓她死！'},
    {speaker:'藤原澪',mark:'澪',emotion:'悲傷',line:'那麼，姊姊受傷的時候，您為什麼沒有叫人救她？'},
    {speaker:'藤原宗一郎',mark:'宗',emotion:'悔恨',line:'我們拉扯時，她撞上了家具。我怕一切都曝光……我帶走帳冊，從維修門離開。我以為她還會醒過來。'},
    {speaker:'調查員',mark:'探',emotion:'結案',line:'這是您的供述，不等於已完成司法認定。我們會把現場紀錄、書面證據與這段證言一併交給有權調查的人。'},
    {speaker:'旁白',mark:'檔',emotion:'尾聲',line:'澪望向那面曾被封住的牆。第三聲不再只是令人不安的傳聞，而是一段終於有人願意追問的往事。'}
  ];
  const overlay=get('v17-cutscene');
  let index=0,returnFocus=null,timer=null,deadline=0,remaining=0,playing=true;
  const next=get('v17-next');
  const pause=get('v48-pause');
  const progress=get('v48-progress');
  const duration=()=>Math.min(10500,Math.max(4400,scenes[index].line.length*115+2200));
  const stopTimer=()=>{if(timer!==null){clearTimeout(timer);timer=null}};
  const resetProgress=(ms)=>{
    progress.style.transition='none';
    progress.style.width='0%';
    void progress.offsetWidth;
    if(playing){
      progress.style.transition=`width ${ms}ms linear`;
      progress.style.width='100%';
    }
  };
  function schedule(ms){
    stopTimer();
    remaining=ms;
    deadline=Date.now()+ms;
    resetProgress(ms);
    if(playing)timer=setTimeout(advance,ms);
  }
  function advance(){
    stopTimer();
    if(index<scenes.length-1){index++;draw();schedule(duration())}
    else close();
  }
  const open=()=>{
    if(!state.endingUnlocked)return;
    returnFocus=document.activeElement;
    index=0;playing=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    overlay.hidden=false;
    document.body.classList.add('v17-dialogue-open');
    pause.textContent=playing?'暫停自動播放':'開始播放';
    draw();schedule(duration());
    pause.focus();
  };
  const close=()=>{
    stopTimer();
    overlay.hidden=true;
    document.body.classList.remove('v17-dialogue-open');
    state.flags.v17_scene_viewed=true;
    persist();
    addReplay();
    if(returnFocus&&returnFocus.isConnected)returnFocus.focus();
  };
  function draw(){
    const s=scenes[index];
    get('v17-scene-count').textContent=`證言紀錄 ${String(index+1).padStart(2,'0')} / ${scenes.length}`;
    get('v17-speaker').textContent=s.speaker;
    get('v17-line').textContent=s.line;
    get('v17-stage-mark').textContent=s.mark;
    get('v17-stage-portrait').dataset.speaker=s.speaker;
    get('v17-scene-title').textContent=s.emotion;
    overlay.dataset.scene=index>=8?'confession':index>=5?'confrontation':'investigation';
    next.textContent=index===scenes.length-1?'結束演出':'下一句 ›';
  }
  function addReplay(){
    const ending=get('ending');
    if(!state.endingUnlocked||!ending||ending.hidden||get('v17-replay'))return;
    const button=document.createElement('button');
    button.type='button';button.id='v17-replay';button.textContent='重看最終對質演出';
    button.addEventListener('click',open);ending.append(button);
  }
  next.addEventListener('click',advance);
  pause.addEventListener('click',()=>{
    if(playing){
      remaining=Math.max(200,deadline-Date.now());
      stopTimer();playing=false;
      const pct=Math.max(0,Math.min(100,(1-remaining/duration())*100));
      progress.style.transition='none';progress.style.width=pct+'%';
      pause.textContent='繼續自動播放';
    }else{
      playing=true;pause.textContent='暫停自動播放';
      const ms=remaining||duration();
      deadline=Date.now()+ms;
      progress.style.transition=`width ${ms}ms linear`;
      progress.style.width='100%';
      timer=setTimeout(advance,ms);
    }
  });
  get('v17-skip').addEventListener('click',close);
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close()}
    if(event.key===' '&&event.target===overlay){event.preventDefault();pause.click()}
    if(event.key==='Tab'){
      const controls=[get('v17-skip'),pause,next];
      const target=controls.indexOf(document.activeElement);
      if(event.shiftKey&&target===0){event.preventDefault();controls[2].focus()}
      else if(!event.shiftKey&&target===2){event.preventDefault();controls[0].focus()}
    }
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&!overlay.hidden&&playing)pause.click();
  });
  // 原始 render() 是唯一進度刷新來源；演出只在首次解鎖結局時啟動。
  const baseRender=render;
  render=function(){
    baseRender();
    if(state.endingUnlocked&&!state.flags.v17_scene_viewed&&!overlay.hidden)return;
    if(state.endingUnlocked&&!state.flags.v17_scene_viewed){open();return}
    addReplay();
    const emotion=get('v17-emotion');
    if(emotion){
      const t=WITNESSES[selectedWitness]?.topics.find(x=>x.id===selectedTopic);
      emotion.textContent=t?(state.rebuttals.includes(t.id)?'證詞已修正':t.rebuttal?'待驗證的證詞':'已記錄的證言'):'請選擇人物與話題';
    }
  };
  render();
})();


/* V18 game layer */
/* V18: presentation only; no changes to evidence, answers, or ending conditions. */
(()=>{
 'use strict';
 const el=id=>document.getElementById(id);
 const overlay=el('v18-rebuttal-flash');
 const portraits={mio:{name:'澪',mood:'沉靜',tone:'rose'},shizue:{name:'靜',mood:'謹慎',tone:'sage'},naoto:{name:'直',mood:'冷靜',tone:'blue'},souichiro:{name:'宗',mood:'警戒',tone:'wine'}};
 const draw=()=>{
  const person=portraits[selectedWitness]||portraits.mio;
  const portrait=el('v16-portrait');
  if(portrait){portrait.dataset.person=selectedWitness;portrait.dataset.tone=person.tone;portrait.setAttribute('aria-label',`${WITNESSES[selectedWitness]?.name||''}的插畫式人物示意`);}
  const monogram=el('v16-monogram');if(monogram)monogram.textContent=person.name;
  const witness=el('witness-name');if(witness)witness.dataset.mood=person.mood;
  const statement=el('statement');if(statement)statement.classList.toggle('v18-contradicted',Boolean(selectedTopic&&state.rebuttals.includes(selectedTopic)));
  const scene=el('v17-stage-portrait');
  if(scene){scene.dataset.emotion=el('v17-scene-title')?.textContent||'';}
 };
 const baseRender=render;
 render=function(){baseRender();draw()};
 // V15 uses onclick for rebuttal; bubbling listener observes the updated state afterwards.
 const submit=el('submit-rebuttal');
 let before=[];
 submit.addEventListener('click',()=>{before=Array.isArray(state.rebuttals)?[...state.rebuttals]:[]},{capture:true});
 submit.addEventListener('click',()=>{
  const added=state.rebuttals.filter(id=>!before.includes(id));
  if(!added.length)return;
  const topic=Object.values(WITNESSES).flatMap(w=>w.topics).find(t=>t.id===added[0]);
  el('v18-flash-title').textContent='證詞矛盾成立';
  el('v18-flash-message').textContent=topic?.success||'新的矛盾已記入偵探手札。';
  overlay.hidden=false;el('v18-flash-close').focus();
 });
 const close=()=>{overlay.hidden=true;submit.focus()};
 el('v18-flash-close').addEventListener('click',close);
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){e.preventDefault();el('v18-flash-close').focus()}});
 // Avoid a visual cutscene showing a mismatched emotion when V17 changes lines.
 const next=el('v17-next');next.addEventListener('click',()=>requestAnimationFrame(draw));
 draw();
})();

window.refreshFujiwaraCase=render;

// Restore server-owned facts after reload; localStorage holds only presentation and exploration details.
(async()=>{try{
 await v14Queue;const response=await fetch('/api/fujiwara/progress',{credentials:'same-origin'});
 if(!response.ok)throw Error('progress unavailable');
 const saved=await response.json();
 await v14Queue;
 state.evidence=Array.isArray(saved.evidence)?saved.evidence:[];
 state.rebuttals=Array.isArray(saved.rebuttals)?saved.rebuttals:[];
 state.endingUnlocked=Boolean(saved.endingUnlocked);
 if(!state.endingUnlocked&&state.finaleAnswers.length===6)state.finaleAnswers=[];
 render();
}catch(e){console.warn('無法取得伺服器進度，暫停正式結案判定',e);state.endingUnlocked=false;render()}})();
