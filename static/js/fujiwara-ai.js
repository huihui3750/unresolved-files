/* Gemini 自由詢問：各人物獨立對話，請求超時可重試，不影響本地通關。 */
(()=>{'use strict';
const form=document.getElementById('ai-question-form');if(!form)return;
const history=document.getElementById('ai-chat-history'),status=document.getElementById('ai-status');
const question=document.getElementById('ai-question'),send=document.getElementById('ai-send');
// 前端本地備援：即使 Flask 無法回應，仍可進行角色對話；不更動正式證物與推理狀態。
// 本地備援知識由 CASE 001 RAG 白名單產生；前後端共用相同的解鎖條件。
const offlineKnowledge={"mio":[{"keywords":["日記","敲擊","聲音","第三聲","凜"],"reply":"姊姊的日記確實記著奇怪的敲擊聲。我不知道聲音從哪裡來，希望你能幫我查明。"},{"keywords":["律師","信件","帳冊"],"reply":"姊姊生前似乎和律師聯繫過，但信件內容我也不完全清楚。","requires_evidence":["ev_lawyer_letter"]},{"keywords":["結案","真相","調查結果","案件"],"reply":"謝謝你完成調查。關於姊姊的事，我還需要一點時間接受。","requires_ending":true}],"shizue":[{"keywords":["聲音","敲擊","事故","那晚","第三聲"],"reply":"那晚我確實聽見異響，但我沒有親眼看見凜小姐出事的經過。"},{"keywords":["宗一郎","行蹤","書房","維修"],"reply":"我後來在書房見過宗一郎先生，更早的時候他在哪裡，我不能確定。","requires_evidence":["ev_entry_log"]},{"keywords":["結案","真相","調查結果","案件"],"reply":"現在調查結束了，我終於不用再迴避當年的事。","requires_ending":true}],"naoto":[{"keywords":["暖氣","管線","敲擊","聲音","第三聲"],"reply":"暖氣管線有可能發出連續的金屬聲響，但我七年前不在山莊，不能斷言當晚的情況。"},{"keywords":["圖面","夾層","入口","通道","維修門"],"reply":"圖面確實記有維修夾層，但當年誰使用過它，不能只憑我的推測。","requires_evidence":["ev_blueprint"]},{"keywords":["結案","真相","調查結果","案件"],"reply":"我能做的只是說清楚設備和圖面的事。能查明當年的經過，是你們的努力。","requires_ending":true}],"souichiro":[{"keywords":["入口","維修門","通道","房門","圖面"],"reply":"我記得東側客房只有正門。你若懷疑，就拿圖面來核對。","requires_evidence":["ev_blueprint"]},{"keywords":["行蹤","出入","維修區","那晚"],"reply":"那晚我沒有去維修區。沒有證據就不要隨意指控。","requires_evidence":["ev_entry_log"]},{"keywords":["帳冊","律師","帳務","信件"],"reply":"帳冊的事與這場事故沒有關係。我不想再談。","requires_evidence":["ev_lawyer_letter"]},{"keywords":["入口","圖面","第二入口","通道"],"reply":"你找到的圖面確實與我的記憶不一致。但這不代表我知道誰走過那裡。","requires_rebuttals":["sou_entrance"]},{"keywords":["出入","行蹤","維修區","紀錄"],"reply":"紀錄上有我的名字，我看到了。但光靠那張紀錄，你還不能替我決定當晚發生了什麼。","requires_rebuttals":["sou_log"]},{"keywords":["帳冊","律師","信件","補充信"],"reply":"那封信的內容我無法再否認，但你不能因此把所有事情都算到我頭上。","requires_rebuttals":["sou_ledger"]},{"keywords":["結案","真相","調查結果","案件"],"reply":"既然調查已經結束，我不再否認自己有隱瞞。完整經過，請以正式結案紀錄為準。","requires_ending":true}]};
const OFF_TOPIC_REPLY='這件事與案件無關，我拒絕回答。';
const caseTerms=['案件','案發','事故','死亡','死者','兇手','凶手','殺人','謀殺','調查','證據','證物','證詞','證言','線索','推理','真相','嫌疑','目擊','不在場','當晚','那晚','七年前','山莊','藤原','凜','澪','靜江','直人','宗一郎','松本','相馬','東側','客房','書房','維修','管線','暖氣','入口','通道','夾層','門框','封門','封板','圖面','施工','建築','敲擊','第三聲','聲音','異響','日記','帳冊','帳務','律師','信件','補充信','出入','行蹤','紀錄','照片','布料','現場','房門','房間','姊姊','姐姐','妹妹','管家','技師','管理者','目睹','發現','遺留'];
const unrelatedRequests=[/(?:寫|產生|生成|教我|幫我|推薦|介紹|解釋).{0,15}(?:程式|代碼|python|javascript|食譜|作業|數學|英文|翻譯|笑話|歌曲|電影|遊戲攻略)/i,/(?:天氣|股價|股票|星座|運勢|政治|選舉|新聞|美食|午餐|晚餐|早餐|約會|唱歌|跳舞|自我介紹|幾歲|生日|喜歡吃|興趣|愛好)/];
function isCaseRelated(text){const normalized=text.replace(/\s+/g,'').toLowerCase();return !unrelatedRequests.some(re=>re.test(normalized))&&caseTerms.some(term=>normalized.includes(term.toLowerCase()));}
function preciseLocalReply(id,text){const q=text.replace(/\s+/g,'');return id==='mio'&&['最後一次','最後見','最後看','上次見','上次看'].some(t=>q.includes(t))&&['姊姊','姐姐','藤原凜','凜'].some(t=>q.includes(t))&&['什麼時候','何時','時間','幾點','哪天','見到','看到','看見'].some(t=>q.includes(t))?'關於最後一次見到姊姊的確切時間，我現在無法確認。我不想把記不清楚的事說成事實。':null;}
function letterReply(id,text){
 if(id!=='mio'||!/(律師|補充信|信件|寄信|寄給|那封信|封信|信寫)/.test(text))return null;
 return currentEvidence().includes('ev_lawyer_letter')
  ? '我知道姊姊曾與律師聯繫，但目前我無法確認信件的完整內容，不能憑印象轉述。'
  : '我知道姊姊可能曾與律師聯繫，但我沒有確認過那封信的內容，不能替她回答。';
}
function localReply(id,text){
 const letter=letterReply(id,text);if(letter)return letter;
 const precise=preciseLocalReply(id,text);if(precise)return precise;
 if(!isCaseRelated(text))return OFF_TOPIC_REPLY;
 const owned=new Set(currentEvidence()),progress=currentProgress(),refuted=new Set(progress.rebuttals);
 const normalized=text.replace(/\s+/g,'').toLowerCase();
 const ranked=(offlineKnowledge[id]||[]).map(entry=>{
   const hits=entry.keywords.filter(term=>normalized.includes(term.toLowerCase()));
   return {entry,hits,score:hits.length,max:Math.max(0,...hits.map(term=>term.length)),stage:entry.requires_ending?3:entry.requires_rebuttals?2:entry.requires_evidence?1:0};
 }).filter(item=>item.score).sort((a,b)=>b.score-a.score||b.stage-a.stage||b.max-a.max);
 // 如果問題對應到尚未解鎖的知識，不以其他通用台詞代替而透露細節。
 const accessible=ranked.filter(({entry})=>(entry.requires_evidence||[]).every(x=>owned.has(x))&&
   (entry.requires_rebuttals||[]).every(x=>refuted.has(x))&&(!entry.requires_ending||progress.ending_unlocked));
 if(accessible.length)return accessible[0].entry.reply;
 if(ranked.length)return '關於這件事，我目前無法確認。請先完成相關調查。';
 return '這部分我沒有足夠的資訊，請從現場證物或其他證詞繼續調查。';
}
const followupPattern=/^(?:那|然後|後來|所以|可是|但是|接著|之後|當時|為什麼|怎麼|如何|真的|確定|你說的|你剛說的|剛才|還有|詳細|再說|繼續|他|她|那個|這個|那件事|這件事|那裡|那時).{0,24}[？?。！!]?$/;
function recentContext(id){const recent=(logs[id]||[]).filter(x=>x.role==='你').slice(-2,-1);return recent.length&&isCaseRelated(recent[0].message)?recent[0].message:null;}
function resolvedQuestion(id,text){if(isCaseRelated(text))return text;const prior=recentContext(id);return prior&&text.length<=28&&followupPattern.test(text)?prior+'；追問：'+text:text;}
function currentEvidence(){try{const saved=JSON.parse(localStorage.getItem('fujiwara_manor_v12')||'{}');return Array.isArray(saved.evidence)?saved.evidence.filter(x=>typeof x==='string').slice(0,30):[]}catch{return []}}
function currentProgress(){try{const saved=JSON.parse(localStorage.getItem('fujiwara_manor_v12')||'{}');return {rebuttals:Array.isArray(saved.rebuttals)?saved.rebuttals.filter(x=>typeof x==='string').slice(0,20):[],ending_unlocked:saved.endingUnlocked===true}}catch{return {rebuttals:[],ending_unlocked:false}}}
function payloadHistory(id){return (logs[id]||[]).slice(-9,-1).filter(x=>x.role==='你').slice(-4).map(x=>({role:'user',text:x.message}));}
const STORE='fujiwara_chat_v35';let logs={};try{const saved=JSON.parse(localStorage.getItem(STORE)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))logs=saved}catch{}let busy=false,lastCharacter='';
function character(){return typeof selectedWitness==='string'?selectedWitness:'mio'}
function label(id){return typeof WITNESSES==='object'&&WITNESSES[id]?WITNESSES[id].name:'受訪者'}
let chatEventCounter=0;
function append(id,role,message){const eventId='chat-'+Date.now()+'-'+(++chatEventCounter);(logs[id]??=[]).push({role,message,eventId});try{localStorage.setItem(STORE,JSON.stringify(logs))}catch{}if(character()===id)render();document.dispatchEvent(new CustomEvent('fujiwara:chat-entry',{detail:{id,role,message,eventId}}))}
function render(){const id=character();if(lastCharacter!==id){lastCharacter=id;status.textContent='目前正在詢問：'+label(id)}history.replaceChildren();for(const entry of logs[id]||[]){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=entry.role+'：';p.className='ai-bubble '+(entry.role==='你'?'ai-user':'ai-character');p.append(strong,document.createTextNode(entry.message));history.append(p)}history.scrollTop=history.scrollHeight}
const witnessList=document.getElementById('witness-list');witnessList?.addEventListener('click',()=>queueMicrotask(render));
// 自由問答與正式證詞進度連動：只辨識既定劇本的明確話題。
const interviewTopicRules={
 mio:[['mio_letter',/(律師|寄信|補充信|那封信)/],['mio_intro',/(日記|敲擊|第三聲|聲音)/]],
 shizue:[['shizue_presence',/(宗一郎|叔父).*(行蹤|維修區|出入)/],['shizue_sound',/(事故|當晚|那晚|第三聲).*(聲音|異響|敲擊|金屬)|(?:聲音|異響|敲擊|金屬).*(事故|當晚|那晚)/]],
 naoto:[['naoto_plan',/(圖面|建築|通道|入口)/],['naoto_pipes',/(暖氣|管線|金屬聲)/]],
 souichiro:[['sou_ledger',/(律師|帳冊|帳務)/],['sou_log',/(行蹤|維修區|出入)/],['sou_seal',/(封門|封板|施工|封閉)/],['sou_entrance',/(入口|客房|通道)/]]
};
function recordKnownInterviewTopic(id,text){
 const normalized=text.replace(/\s+/g,'');
 const match=(interviewTopicRules[id]||[]).find(([,pattern])=>pattern.test(normalized));
 if(!match||typeof window.fujiwaraRecordInterviewTopic!=='function')return false;
 return window.fujiwaraRecordInterviewTopic(id,match[0]);
}
form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;
 const id=character(),name=label(id),text=question.value.trim();if(!text||text.length>400)return;
 busy=true;send.disabled=true;status.textContent='正在等待 '+name+' 回答……';append(id,'你',text);question.value='';
 const effective=resolvedQuestion(id,text);if(!isCaseRelated(effective)){append(id,name,OFF_TOPIC_REPLY);status.textContent='已拒絕與案件無關的問題；不影響調查進度。';busy=false;send.disabled=false;question.focus();return;}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),13000);
 try{const response=await fetch('/api/fujiwara/interview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({character:id,question:text,history:payloadHistory(id),evidence:currentEvidence(),...currentProgress()}),signal:controller.signal});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'詢問失敗');
 append(id,name,data.answer||'（沒有收到回答）');
 const topicRecorded=recordKnownInterviewTopic(id,effective);
 let added=0;for(const note of data.key_testimonies||[]){
  if(typeof state!=='undefined'&&Array.isArray(state.notes)&&note.id&&note.title&&note.body&&!state.notes.some(n=>n.id===note.id)){
   state.notes.push({id:note.id,title:note.title,body:note.body});added++;
  }
 }
 if(added&&typeof window.refreshFujiwaraCase==='function')window.refreshFujiwaraCase();
 status.textContent=(data.fallback?'目前使用離線備援對話（'+(data.fallback_reason||'Gemini 暫不可用')+'）。':'Gemini 對話已記錄。')+(topicRecorded?' 已記錄對應證詞；如有相關證物，正在同步存檔。':added?' 關鍵證言已記入手札（待查證）。':' 正式證物與推理仍需調查。');
 }catch(error){
 // 僅在網路/伺服器/解析失敗時啟用本地備援。使用者輸入錯誤仍照原本規則處理。
 const message=error.name==='AbortError'?'連線逾時':(error.message||'服務無法連線');
 append(id,name,localReply(id,effective));
 status.textContent='已切換本地備援（'+message+'）。仍可自由詢問；證物與正式推理照常由遊戲規則判定。';
}
 finally{clearTimeout(timeout);busy=false;send.disabled=false;question.focus()}
});render();
})();
