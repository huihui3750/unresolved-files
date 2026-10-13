(()=>{'use strict';const root=document.getElementById('archive-unlocked');if(!root)return;
const script=[
['序幕｜重新開啟的舊案','七年前，藤原凜死於藤原山莊東側客房。當年事件被視為意外，妹妹藤原澪卻始終無法接受這個結論。她委託調查員重新檢視當年的現場、文件和證言。','調查的起點不是斷定誰有罪，而是確認舊案的哪些事實仍然無法解釋。'],
['第一幕｜封閉的東側客房','調查員進入東側客房，查看事故報告、房間痕跡與舊照片。事故現場看似只有正門可供進出，但房間的舊有配置與現況並不完全吻合。','凜的日記記下三聲異響；它是線索，還不是對任何人的指控。'],
['第二幕｜牆後的維修夾層','原始建築圖面與照片相互比對，顯示東側客房附近曾設有維修夾層，之後被封閉。整修技師相馬直人協助解釋暖氣管線的結構。','管線可能造成兩次金屬敲擊，但第三聲仍須結合現場痕跡與其他資料判讀。直人並非七年前的目擊者。'],
['第三幕｜各自保留的說法','管家松本靜江承認事故當晚聽過異響，但未親眼見到凜死亡。宗一郎對維修區出入、帳冊爭執與房間入口的說法存在疑點。','證詞必須與出入紀錄、律師補充信及現場證物交叉驗證；說謊並不等於已證明殺人。'],
['第四幕｜重建六項關鍵事實','調查員依序處理密室入口、三聲異響、宗一郎的行蹤、事故現場、帳冊衝突，以及事件責任。每一步都要求有對應證物或證言支持。','推理成立代表現有證據足以支持特定重建，不代表可以略過司法調查。'],
['終幕｜書房裡的對質','完成案件重建後，調查員在書房與藤原宗一郎對質。宗一郎承認當年曾經由維修通道進入凜的房間，與她爭奪帳冊；衝突中凜受傷，他因恐懼離去，並在事後隱瞞通道與行蹤。','調查員整理現場紀錄與供述，要求重新調查；遊戲沒有將對質等同於正式司法定罪。'],
['尾聲｜留下的問題','藤原澪終於取得足以重新檢視姊姊死因的材料。隱藏多年的通道與矛盾的證詞逐步被揭開，但法律責任仍須由後續調查確認。','「說謊者，不一定就是兇手。」這句話提醒玩家：不能以單一謊言取代完整證據鏈。']
];
const people=[
['藤原澪','委託人 · 藤原凜的妹妹','/static/art/portraits/mio-clean.webp','七年前失去姊姊後，始終質疑事故結論，因此委託調查員重查山莊。','她提供案件起點，但並不知道事件全貌；她的悲傷不是任何人有罪的證據。'],
['松本靜江','山莊管家','/static/art/portraits/shizue-clean.webp','多年來在藤原山莊工作，對當晚的聲響與宗一郎的行蹤有所顧慮。','她沒有親眼看見凜死亡；她的證詞應與其他物證互相印證。'],
['相馬直人','山莊整修技師','/static/art/portraits/naoto-clean.webp','熟悉暖氣管線和建築圖面，協助調查員理解維修夾層與牆後聲響。','七年前尚未在山莊工作，不能把他的技術推論當成目擊證詞。'],
['藤原宗一郎','山莊管理者','/static/art/portraits/souichiro-clean.webp','對維修通道、出入紀錄及帳冊衝突多次隱瞞，最終在書房對質時承認曾與凜發生爭執。','供述能協助重建事件，但具體法律責任仍待進一步調查。'],
['藤原凜','死者 · 藤原家長女',null,'七年前死於東側客房。她留下的日記與寄給律師的補充信，成為重新檢視事件的關鍵。','她的文字留下了線索，也需要與現場紀錄及其他證據交叉比對。']
];
let category='script',page=0;const $=id=>document.getElementById(id),index=$('v41-index'),detail=$('v41-detail');
function render(){const items=category==='script'?script:people;page=Math.max(0,Math.min(page,items.length-1));$('v41-section-title').textContent=category==='script'?'案件劇本':'人物小傳';$('v41-section-caption').textContent=category==='script'?'依事件順序整理的七幕重建，不是逐字遊戲對白。':'五位與案件相關的人物背景、立場及證詞限制。';$('v41-category').textContent=category==='script'?'劇情封存':'人物檔案';$('v41-page-count').textContent=String(page+1).padStart(2,'0')+' / '+String(items.length).padStart(2,'0');$('v41-pagination').textContent=`第 ${page+1} / ${items.length} 頁`;
index.replaceChildren();items.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.className='v41-index-item';b.textContent=`${String(i+1).padStart(2,'0')}　${item[0]}`;b.setAttribute('aria-current',String(i===page));b.addEventListener('click',()=>{page=i;render()});index.append(b)});detail.replaceChildren();const item=items[page];const h=document.createElement('h3');h.textContent=item[0];detail.append(h);
if(category==='script'){for(let i=1;i<item.length;i++){const p=document.createElement('p');p.textContent=item[i];detail.append(p)}}else{const subtitle=document.createElement('div');subtitle.className='v41-role';subtitle.textContent=item[1];detail.append(subtitle);if(item[2]){const img=document.createElement('img');img.className='v41-portrait';img.src=item[2];img.alt=item[0]+'肖像';detail.append(img)}else{const mark=document.createElement('div');mark.className='v41-portrait v41-no-portrait';mark.textContent='凜';detail.append(mark)}const p=document.createElement('p');p.textContent=item[3];detail.append(p);const small=document.createElement('p');small.className='v41-limit';small.textContent='調查備註｜'+item[4];detail.append(small)}$('v41-prev').disabled=page===0;$('v41-next').disabled=page===items.length-1;for(const b of document.querySelectorAll('[data-collection]'))b.setAttribute('aria-selected',String(b.dataset.collection===category));}
for(const b of document.querySelectorAll('[data-collection]'))b.addEventListener('click',()=>{category=b.dataset.collection;page=0;render()});$('v41-prev').addEventListener('click',()=>{page--;render()});$('v41-next').addEventListener('click',()=>{page++;render()});document.addEventListener('keydown',e=>{if(root.hidden||e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;if(e.key==='ArrowLeft'&&page>0){page--;render()}if(e.key==='ArrowRight'&&page<(category==='script'?script:people).length-1){page++;render()}});render();})();