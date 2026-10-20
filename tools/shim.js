/* Percy native shim: gives the page the same "claude.use(...)" capabilities it had as an artifact,
   backed by the phone: files in Documents/Percy/<trip>/, reading via the Anthropic API with the user's own key. */
(function(){
  var C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform())return;
  window.PERCY_NATIVE=true;
  var FS=C.registerPlugin('Filesystem'),Opener=C.registerPlugin('FileOpener');
  var KEY='percy.files',idx={};
  try{idx=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){idx={};}
  function saveIdx(){try{localStorage.setItem(KEY,JSON.stringify(idx));}catch(e){}}
  function san(s){return String(s||'').replace(/[\\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,60);}
  function rid(){var a=new Uint8Array(16);crypto.getRandomValues(a);return Array.prototype.map.call(a,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');}
  function b64(blob){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(String(r.result).split(',')[1]||'');};r.onerror=function(){rej(r.error);};r.readAsDataURL(blob);});}
  function fromB64(d,type){var bin=atob(d),n=bin.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:type||'application/octet-stream'});}
  var permAsked=false;
  async function ensurePerm(){if(permAsked)return;permAsked=true;try{await FS.requestPermissions();}catch(e){}}
  async function writeTo(rel,data,enc){
    await ensurePerm();
    var dirs=['DOCUMENTS','DATA'],last=null;
    for(var i=0;i<dirs.length;i++){
      try{var o={path:rel,data:data,directory:dirs[i],recursive:true};if(enc)o.encoding=enc;await FS.writeFile(o);return dirs[i];}catch(e){last=e;}
    }
    throw last||new Error('write');
  }
  var assets={
    upload:async function(file,o){
      o=o||{};
      var folder=san(o.folder)||'Other',name=san(file.name)||'file';
      var dot=name.lastIndexOf('.'),base=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';
      var used={};Object.keys(idx).forEach(function(k){used[idx[k].path]=1;});
      var rel='Percy/'+folder+'/'+name,n=2;
      while(used[rel]){rel='Percy/'+folder+'/'+base+' ('+n+')'+ext;n++;}
      var data=await b64(file);
      var dir;
      try{dir=await writeTo(rel,data);}catch(e){throw {code:'quota_or_state',message:String(e&&e.message||e)};}
      var id=rid(),type=o.type||file.type||'application/octet-stream';
      idx[id]={dir:dir,path:rel,type:type};saveIdx();
      return {id:id,contentType:type,sizeBytes:file.size};
    },
    delete:async function(id){
      var m=idx[id];if(!m)return;
      try{await FS.deleteFile({path:m.path,directory:m.dir});}catch(e){}
      delete idx[id];saveIdx();
    }
  };
  var urlCache={};
  async function blobUrl(id){
    if(urlCache[id])return urlCache[id];
    var m=idx[id];if(!m)throw new Error('missing');
    var r=await FS.readFile({path:m.path,directory:m.dir});
    return (urlCache[id]=URL.createObjectURL(fromB64(r.data,m.type)));
  }
  window.PercyNative={
    open:async function(id,type){
      var m=idx[id];
      if(!m){alert('This file is not on this phone any more. It may have been added on another device.');return;}
      try{
        var u=await FS.getUri({path:m.path,directory:m.dir});
        await Opener.open({filePath:u.uri,contentType:m.type||type||'application/pdf'});
      }catch(e){
        try{window.open(await blobUrl(id),'_blank');}catch(e2){alert('Could not open this file. Look for it in your Files app under Documents, Percy.');}
      }
    }
  };
  /* thumbnails: <img data-blob="id"> */
  function hydrate(root){
    var imgs=(root||document).querySelectorAll('img[data-blob]:not([src])');
    Array.prototype.forEach.call(imgs,function(im){
      var id=im.getAttribute('data-blob');
      blobUrl(id).then(function(u){im.src=u;}).catch(function(){});
    });
  }
  document.addEventListener('DOMContentLoaded',function(){
    hydrate();
    new MutationObserver(function(){hydrate();}).observe(document.body,{childList:true,subtree:true});
  });
  var downloads={
    save:async function(req){
      var data=req.data,isStr=typeof data==='string';
      var payload=isStr?data:await b64(data instanceof Blob?data:new Blob([data]));
      var rel='Percy/Backups/'+(san(req.filename)||'percy-file');
      var dir=await writeTo(rel,payload,isStr?'utf8':undefined);
      return {status:'saved',where:(dir==='DOCUMENTS'?'Documents':'the Percy app')+' › Percy › Backups'};
    }
  };
  /* reading confirmations: the user's own Anthropic API key */
  var MODEL='claude-sonnet-5-5';
  function parseJSONLoose(t){
    try{return JSON.parse(t);}catch(e){}
    var m=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(m){try{return JSON.parse(m[1]);}catch(e){}}
    var a=t.search(/[\[{]/),z=Math.max(t.lastIndexOf(']'),t.lastIndexOf('}'));
    if(a>=0&&z>a){try{return JSON.parse(t.slice(a,z+1));}catch(e){}}
    throw {code:'invalid_json',message:'no JSON',text:t};
  }
  var sample=function(){return Promise.reject({code:'not_declared',message:'use sample.json'});};
  sample.nativePdf=true;
  sample.limits=async function(){return {maxPromptBytes:262144,images:{maxCount:5,maxInputBytes:20971520,mediaTypes:['image/jpeg','image/png','image/webp','image/gif']}};};
  sample.json=async function(prompt,opts){
    opts=opts||{};
    var key=''; try{key=(localStorage.getItem('percy.apikey')||'').trim();}catch(e){}
    if(!key)throw {code:'no_key',message:'no api key'};
    var blobs=opts.images?(Array.isArray(opts.images)?opts.images:[opts.images]):[];
    var content=[];
    for(var i=0;i<blobs.length;i++){
      var b=blobs[i],t=b.type||'';
      if(t==='application/pdf')content.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:await b64(b)}});
      else content.push({type:'image',source:{type:'base64',media_type:/^image\/(jpeg|png|webp|gif)$/.test(t)?t:'image/jpeg',data:await b64(b)}});
    }
    content.push({type:'text',text:prompt+'\n\nReply with only the JSON value, no other text.'});
    var resp;
    try{
      resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:opts.signal,
        headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:MODEL,max_tokens:4096,messages:[{role:'user',content:content}]})});
    }catch(e){
      if(e&&e.name==='AbortError')throw {code:'cancelled',message:'cancelled'};
      throw {code:'offline',message:String(e&&e.message||e)};
    }
    if(resp.status===401||resp.status===403)throw {code:'bad_key',message:'status '+resp.status};
    if(resp.status===429)throw {code:'rate_limited',message:'status 429'};
    var j=null;try{j=await resp.json();}catch(e){}
    if(!resp.ok)throw {code:'upstream_error',message:'status '+resp.status+(j&&j.error&&j.error.message?': '+j.error.message:'')};
    var text=((j&&j.content)||[]).filter(function(c){return c.type==='text';}).map(function(c){return c.text;}).join('\n');
    if(!text.trim())throw {code:'empty_completion',message:'empty'};
    return parseJSONLoose(text);
  };
  var table={assets:assets,downloads:downloads,sample:sample};
  window.claude={use:function(n){return Promise.resolve(table[n]||null);}};
})();
