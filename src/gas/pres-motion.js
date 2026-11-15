'use strict';

/**
 * Presentasi Bergerak: animasi saat slide mode presentasi tampil (Executive & Weekly).
 *
 * Bekerja langsung pada card yang sudah dikloning ke slide, tanpa pustaka tambahan:
 *  - blok/kartu muncul bergeser bertahap,
 *  - angka besar naik dari 0 ke nilainya (format Indonesia dipertahankan),
 *  - garis grafik SVG (kurva S, tren) tergambar, area grafik memudar masuk,
 *  - batang grafik SVG & bilah progres tumbuh, lingkaran progres berputar mengisi,
 *  - label status "meletup" kecil di akhir.
 * Slide PDF, video, dan sampul (punya animasinya sendiri) tidak disentuh.
 * Bisa dimatikan dari tombol di toolbar presentasi (tersimpan di browser), tombol R memutar ulang,
 * dan otomatis mati bila perangkat memakai pengaturan "kurangi gerakan".
 */

const PRES_MOTION_JS = String.raw`<style>
.pp-ic[data-a=anim].off{opacity:.55}
.pp-ic[data-a=anim].off svg{stroke-dasharray:2 3}
.pm-toast{position:absolute;left:50%;top:70px;transform:translateX(-50%);z-index:6;background:rgba(8,22,40,.85);color:#e6f1fb;border:1px solid rgba(255,255,255,.18);padding:6px 14px;border-radius:99px;font:600 12.5px Inter,system-ui,sans-serif;pointer-events:none;transition:opacity .3s}
</style>
<script>
(function(){
  if(window.pmoMotion)return;
  var KEY='pmoMotion',EASE='cubic-bezier(.2,.8,.2,1)',cur=null,anims=[],timers=[];
  function on(){try{return localStorage.getItem(KEY)!=='0'}catch(e){return true}}
  function reduced(){return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)}
  function skip(card){return !card||!!card.querySelector('.px-pdf,.px-video,.px-hero')}
  function stop(){anims.forEach(function(a){try{a.cancel()}catch(e){}});anims=[];timers.forEach(clearTimeout);timers=[];
    if(cur)cur.querySelectorAll('[data-pm-txt]').forEach(function(el){el.textContent=el.getAttribute('data-pm-txt');el.removeAttribute('data-pm-txt')})}
  function A(el,kf,o){if(!el.animate)return;var a=el.animate(kf,Object.assign({easing:EASE,fill:'backwards'},o));anims.push(a);return a}
  function later(fn,ms){timers.push(setTimeout(fn,ms))}

  /* ---------- blok muncul bertahap ---------- */
  function blocks(card){
    var host=card.firstElementChild&&card.children.length===1?card.firstElementChild:card,list=[].slice.call(host.children),guard=0;
    while(list.length<3&&guard++<3){var big=null;list.forEach(function(x){if(!big||x.offsetHeight*x.offsetWidth>big.offsetHeight*big.offsetWidth)big=x});if(!big||!big.children.length)break;var i=list.indexOf(big);list=list.slice(0,i).concat([].slice.call(big.children),list.slice(i+1))}
    var out=[];list.forEach(function(x){
      /* grid kartu (KPI, ringkasan) → tiap kartunya ikut bertahap */
      var cs=getComputedStyle(x);
      if((cs.display==='grid'||cs.display==='flex')&&x.children.length>=3&&x.children.length<=12&&x.offsetHeight<420)[].slice.call(x.children).forEach(function(c){out.push(c)});else out.push(x)});
    return out.filter(function(x){return x.offsetHeight>4&&!/^(SCRIPT|STYLE)$/.test(x.tagName)}).slice(0,28);
  }

  /* ---------- angka naik ---------- */
  var NUM=/^(\D{0,4}?)([\-−+]?)(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?(\s?\D{0,6})$/;
  function counters(card){
    var out=[];
    card.querySelectorAll('b,strong,span,div,small,em,h1,h2,h3,h4,p,td').forEach(function(el){
      if(el.childElementCount>1||out.length>40)return;
      if(el.childElementCount===1&&!/^(SMALL|SUB|SUP|I)$/.test(el.firstElementChild.tagName))return;
      if(el.closest('svg,table,.pp-gal'))return;
      var own='';el.childNodes.forEach(function(n){if(n.nodeType===3)own+=n.nodeValue});
      var t=own.trim();if(!t||t.length>18)return;
      var m=t.match(NUM);if(!m||/[\/:]/.test(t)||/^W/i.test(m[1]))return;
      var intPart=m[3].replace(/\./g,'');if(!m[4]&&+intPart>=1900&&+intPart<=2100)return;
      if(parseFloat(getComputedStyle(el).fontSize)<17)return;
      var tn=null;el.childNodes.forEach(function(n){if(n.nodeType===3&&n.nodeValue.trim())tn=tn||n});if(!tn)return;
      out.push({el:el,tn:tn,orig:tn.nodeValue,m:m});
    });
    return out;
  }
  function fmt(v,dec,group){var s=Math.abs(v).toFixed(dec).split('.'),i=s[0];if(group)i=i.replace(/\B(?=(\d{3})+(?!\d))/g,'.');return i+(dec?','+s[1]:'')}
  function count(c,delay,dur){
    var m=c.m,dec=m[4]?m[4].length-1:0,group=m[3].indexOf('.')>=0,to=parseFloat(m[3].replace(/\./g,'')+(m[4]?'.'+m[4].slice(1):''));
    if(!isFinite(to)||to===0)return;
    var lead=c.orig.match(/^\s*/)[0],tail=c.orig.match(/\s*$/)[0],sign=m[2];
    c.el.setAttribute('data-pm-txt',c.el.textContent);
    function put(v){c.tn.nodeValue=lead+m[1]+sign+fmt(v,dec,group)+m[5]+tail}
    put(0);var t0=null;
    function f(t){if(!c.el.isConnected)return;if(t0===null)t0=t+delay;var p=Math.min(1,Math.max(0,(t-t0)/dur)),e=1-Math.pow(1-p,3);put(to*e);if(p<1)requestAnimationFrame(f);else{c.tn.nodeValue=c.orig;c.el.removeAttribute('data-pm-txt')}}
    requestAnimationFrame(f);
  }

  /* ---------- grafik SVG ---------- */
  function charts(card,base){
    card.querySelectorAll('svg').forEach(function(svg){
      var bb=svg.getBoundingClientRect();if(bb.width<120||bb.height<60)return; /* ikon */
      var lines=0;
      svg.querySelectorAll('path,polyline,line').forEach(function(p){
        var cs=getComputedStyle(p),fill=cs.fill,stroke=cs.stroke;
        if(!stroke||stroke==='none'||parseFloat(cs.strokeWidth)<1.2)return;
        var len=0;try{len=p.getTotalLength()}catch(e){return}
        if(len<60)return;
        if(fill&&fill!=='none'&&!/rgba\(.*,\s*0\)$/.test(fill))return;
        if(p.tagName==='line'&&(p.getAttribute('stroke-dasharray')||cs.strokeDasharray!=='none'))return; /* garis bantu */
        if(cs.strokeDasharray&&cs.strokeDasharray!=='none'){A(p,[{opacity:0},{opacity:1}],{duration:700,delay:base+250+lines*350});lines++;return}
        A(p,[{strokeDasharray:len+' '+len,strokeDashoffset:len},{strokeDasharray:len+' '+len,strokeDashoffset:0}],{duration:1300,delay:base+200+lines*380,easing:'cubic-bezier(.4,0,.2,1)'});
        lines++;
      });
      svg.querySelectorAll('path,polygon').forEach(function(p){
        var cs=getComputedStyle(p);if(!cs.fill||cs.fill==='none')return;
        var b=p.getBBox?p.getBBox():null;if(!b||b.width<bb.width*0.25||b.height<12)return;
        A(p,[{opacity:0},{opacity:cs.opacity||1}],{duration:900,delay:base+500+lines*200});
      });
      svg.querySelectorAll('circle').forEach(function(c){
        var r=+c.getAttribute('r')||0,cs=getComputedStyle(c);
        if(cs.strokeDasharray&&cs.strokeDasharray!=='none'&&r>12){
          var L=2*Math.PI*r,da=cs.strokeDasharray.split(/[ ,]+/).map(parseFloat),off=parseFloat(cs.strokeDashoffset)||0;
          A(c,[{strokeDashoffset:off+(da[0]||L)},{strokeDashoffset:off}],{duration:1200,delay:base+250,easing:'cubic-bezier(.3,0,.2,1)'});
        }else if(r<=7){A(c,[{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1)'}],{duration:450,delay:base+1300+lines*100,easing:'cubic-bezier(.3,1.5,.5,1)'});c.style.transformBox='fill-box';c.style.transformOrigin='center'}
      });
      var rects=[].slice.call(svg.querySelectorAll('rect')).filter(function(r){
        var cs=getComputedStyle(r);if(!cs.fill||cs.fill==='none')return false;var b=r.getBBox();
        return b.width>=3&&b.height>=3&&b.width<bb.width*0.8*(svg.viewBox&&svg.viewBox.baseVal&&svg.viewBox.baseVal.width?svg.viewBox.baseVal.width/bb.width:1)&&!(b.width<14&&b.height<14);
      });
      rects.slice(0,80).forEach(function(r,i){
        var b=r.getBBox(),hz=b.width>b.height*1.6;
        r.style.transformBox='fill-box';r.style.transformOrigin=hz?'left center':'center bottom';
        A(r,[{transform:hz?'scaleX(0)':'scaleY(0)'},{transform:'none'}],{duration:800,delay:base+250+Math.min(i,30)*35});
      });
    });
  }

  /* ---------- bilah progres HTML ---------- */
  function bars(card,base){
    var n=0;
    card.querySelectorAll('[style*="width"]').forEach(function(el){
      if(n>40||el.closest('svg'))return;
      var w=el.style.width;if(!/%$/.test(w))return;
      var p=el.parentElement;if(!p||p.offsetWidth<40||el.offsetHeight>40||el.offsetHeight<2)return;
      el.style.transformOrigin='left center';
      A(el,[{transform:'scaleX(0)'},{transform:'none'}],{duration:900,delay:base+300+(n++)*40});
    });
  }

  /* ---------- label status ---------- */
  function chips(card,base){
    var n=0;
    card.querySelectorAll('.pp-st,.badge,.chip,.pill,.tag,[class*="status"],[class*="badge"]').forEach(function(el){
      if(n>30||el.offsetHeight>44||el.offsetWidth>260||el.closest('svg'))return;
      A(el,[{transform:'scale(.6)',opacity:0},{transform:'scale(1.08)',opacity:1,offset:.7},{transform:'none',opacity:1}],{duration:500,delay:base+900+(n++)*45});
    });
  }

  function play(card){
    stop();cur=card;if(!card||!on()||reduced()||skip(card))return;
    var bl=blocks(card);
    bl.forEach(function(b,i){A(b,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:550,delay:i*60})});
    var base=Math.min(bl.length,8)*40;
    counters(card).forEach(function(c,i){count(c,base+150+Math.min(i,12)*50,1100)});
    charts(card,base);bars(card,base);chips(card,base);
  }

  function toast(ov,t){var x=ov.querySelector('.pm-toast');if(!x){x=document.createElement('div');x.className='pm-toast';ov.appendChild(x)}x.textContent=t;x.style.opacity=1;clearTimeout(x.__t);x.__t=setTimeout(function(){x.style.opacity=0},1400)}
  function button(ov){
    if(!ov||ov.querySelector('.pp-ic[data-a=anim]'))return;
    var ctl=ov.querySelector('.pp-ctl');if(!ctl)return;
    var b=document.createElement('button');b.type='button';b.className='pp-ic';b.setAttribute('data-a','anim');
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19c4-1 6-5 8-9s5-6 8-6"/><circle cx="20" cy="4" r="1.6"/><path d="M4 15v4h4"/></svg>';
    function paint(){var v=on();b.classList.toggle('off',!v);b.title=(v?'Animasi: aktif':'Animasi: mati')+' (klik untuk ubah · R putar ulang)';b.setAttribute('aria-pressed',v?'true':'false');b.setAttribute('aria-label',v?'Matikan animasi':'Aktifkan animasi')}
    b.addEventListener('click',function(e){e.stopPropagation();try{localStorage.setItem(KEY,on()?'0':'1')}catch(x){}paint();toast(ov,on()?'Animasi aktif':'Animasi mati');if(on())play(cur);else stop()});
    ctl.insertBefore(b,ctl.firstChild);paint();
  }

  window.pmoMotion={
    enter:function(card){var ov=card&&card.closest('.pp');button(ov);
      /* tunggu slide selesai bergeser masuk & ukuran slide disesuaikan */
      stop();cur=card;var tries=0;(function wait(){if(cur!==card)return;if(ov&&!ov.classList.contains('on')&&tries++<60){later(wait,100);return}later(function(){if(cur===card)play(card)},ov&&tries?450:260)})()},
    replay:function(){if(cur)play(cur)},stop:stop,enabled:on
  };
  document.addEventListener('keydown',function(e){
    if((e.key==='r'||e.key==='R')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&window.pmoPresent&&pmoPresent.isOpen()){
      var t=e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;
      e.preventDefault();window.pmoMotion.replay();
    }
  });
})();
</script>
`;

module.exports = { PRES_MOTION_JS };
