/* V53 portrait source synchronization; never layer background portraits. */
(()=>{
 const portrait=document.getElementById('v16-portrait');
 const img=document.getElementById('v53-portrait-img');
 if(!portrait||!img)return;
 const paths={mio:'mio-clean.webp',shizue:'shizue-clean.webp',naoto:'naoto-clean.webp',souichiro:'souichiro-clean.webp'};
 const root='/static/art/portraits/';
 const update=()=>{
   const id=portrait.dataset.person||'mio';
   const filename=paths[id]||paths.mio;
   if(!img.src.endsWith('/'+filename))img.src=root+filename;
 };
 new MutationObserver(update).observe(portrait,{attributes:true,attributeFilter:['data-person']});
 update();
})();
